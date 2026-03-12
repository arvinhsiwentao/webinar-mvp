# Mux Video Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace R2 direct MP4 serving with Mux HLS adaptive streaming for lag-free video playback, while keeping R2 as the upload/backup storage.

**Architecture:** Admin uploads video to R2 (existing flow), then the server creates a Mux asset from the R2 public URL. Mux transcodes to adaptive HLS. The webinar's `videoUrl` is set to `https://stream.mux.com/{PLAYBACK_ID}.m3u8`. The existing VideoPlayer (Video.js + HLS.js) plays this URL with zero changes to its code.

**Tech Stack:** `@mux/mux-node` (server SDK), existing Video.js + HLS.js (unchanged), Supabase (stores Mux IDs), R2 (upload + backup)

---

## Task 1: Install Mux SDK + Create Client Module

**Files:**
- Modify: `package.json`
- Create: `src/lib/mux.ts`

**Step 1: Install the Mux Node SDK**

Run:
```bash
npm install @mux/mux-node
```

**Step 2: Create the Mux client module**

Create `src/lib/mux.ts`:

```typescript
import Mux from '@mux/mux-node';

let _mux: Mux | null = null;

export function getMuxClient(): Mux {
  if (!_mux) {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;
    if (!tokenId || !tokenSecret) {
      throw new Error('Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET env vars');
    }
    _mux = new Mux({ tokenId, tokenSecret });
  }
  return _mux;
}

/**
 * Create a Mux asset from a publicly accessible video URL (e.g., R2 public URL).
 * Returns the asset ID and playback ID.
 */
export async function createMuxAssetFromUrl(videoUrl: string): Promise<{
  assetId: string;
  playbackId: string;
}> {
  const mux = getMuxClient();
  const asset = await mux.video.assets.create({
    input: [{ url: videoUrl }],
    playback_policy: ['public'],
    video_quality: 'basic',
  });

  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) {
    throw new Error('Mux asset created but no playback ID returned');
  }

  return {
    assetId: asset.id,
    playbackId,
  };
}

/**
 * Get the HLS playback URL for a Mux playback ID.
 */
export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Check Mux asset status. Returns 'preparing', 'ready', or 'errored'.
 */
export async function getMuxAssetStatus(assetId: string): Promise<{
  status: string;
  playbackId?: string;
  duration?: number;
}> {
  const mux = getMuxClient();
  const asset = await mux.video.assets.retrieve(assetId);
  return {
    status: asset.status ?? 'preparing',
    playbackId: asset.playback_ids?.[0]?.id,
    duration: asset.duration,
  };
}

/**
 * Delete a Mux asset.
 */
export async function deleteMuxAsset(assetId: string): Promise<void> {
  const mux = getMuxClient();
  await mux.video.assets.delete(assetId);
}
```

**Step 3: Add env vars to `.env.local`**

The user needs to create a Mux API access token at https://dashboard.mux.com/settings/access-tokens. Add to `.env.local`:

```
MUX_TOKEN_ID=your_token_id_here
MUX_TOKEN_SECRET=your_token_secret_here
```

**Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors related to mux.ts.

**Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/mux.ts
git commit -m "feat: add Mux client module and SDK dependency"
```

---

## Task 2: Extend VideoFile Data Model

**Files:**
- Modify: `src/lib/types.ts:134-143` (VideoFile interface)

**Step 1: Add Mux fields to VideoFile interface**

In `src/lib/types.ts`, update the `VideoFile` interface:

```typescript
export interface VideoFile {
  id: string;
  filename: string;        // original upload filename
  storagePath: string;     // path in R2 bucket
  publicUrl: string;       // R2 CDN URL (backup/source)
  fileSize: number;        // bytes
  durationSec?: number;    // seconds (optional, set client-side or from Mux)
  status: 'uploading' | 'processing' | 'ready' | 'error';  // added 'processing'
  uploadedAt: string;      // ISO date
  muxAssetId?: string;     // Mux asset ID (for management/deletion)
  muxPlaybackId?: string;  // Mux playback ID (used to construct HLS URL)
  muxPlaybackUrl?: string; // full HLS URL: https://stream.mux.com/{id}.m3u8
}
```

Changes:
- Added `'processing'` to status union (for Mux transcoding state)
- Added optional `muxAssetId`, `muxPlaybackId`, `muxPlaybackUrl`

**Step 2: Add Supabase migration for new columns**

Run this SQL against Supabase to add the new columns:

```sql
ALTER TABLE video_files
  ADD COLUMN IF NOT EXISTS mux_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS mux_playback_id TEXT,
  ADD COLUMN IF NOT EXISTS mux_playback_url TEXT;

-- Update status check constraint to allow 'processing'
ALTER TABLE video_files DROP CONSTRAINT IF EXISTS video_files_status_check;
ALTER TABLE video_files ADD CONSTRAINT video_files_status_check
  CHECK (status IN ('uploading', 'processing', 'ready', 'error'));
```

Note: If there is no existing check constraint on `status`, skip the DROP/ADD constraint lines. The column is likely a TEXT type with no constraint, in which case just adding the columns is sufficient.

**Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors. The `db.ts` CRUD functions are generic (snake_case ↔ camelCase auto-mapping), so they handle new fields automatically.

**Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: extend VideoFile with Mux fields and processing status"
```

---

## Task 3: Update Upload API to Create Mux Asset

**Files:**
- Modify: `src/app/api/admin/videos/route.ts`
- Modify: `src/app/api/admin/videos/[id]/route.ts`

**Step 1: Update POST handler to trigger Mux after R2 upload metadata is created**

The flow changes from:
1. Create metadata → return presigned URL → client uploads to R2 → client PATCHes status to 'ready'

To:
1. Create metadata → return presigned URL → client uploads to R2 → client PATCHes status → server creates Mux asset → status becomes 'processing' → webhook/poll sets 'ready'

Replace `src/app/api/admin/videos/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFiles, createVideoFile } from '@/lib/db';
import { getR2Client, getR2BucketName, getR2PublicUrl } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// GET /api/admin/videos — list all videos
export async function GET() {
  const files = await getVideoFiles();
  return NextResponse.json(files);
}

// POST /api/admin/videos — create metadata + return R2 presigned upload URL
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { filename, fileSize } = body;

  if (!filename || !fileSize) {
    return NextResponse.json({ error: 'filename and fileSize required' }, { status: 400 });
  }

  // Generate unique storage path
  const ext = filename.split('.').pop() || 'mp4';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Get public URL from R2
  const publicUrl = getR2PublicUrl(storagePath);

  // Create metadata record with status 'uploading'
  const videoFile = await createVideoFile({
    filename,
    storagePath,
    publicUrl,
    fileSize,
    status: 'uploading',
  });

  // Generate presigned PUT URL for direct browser upload to R2
  const r2 = getR2Client();
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: storagePath,
    ContentType: `video/${ext === 'mp4' ? 'mp4' : ext}`,
  });
  const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

  return NextResponse.json({
    videoFile,
    presignedUrl,
  });
}
```

Note: This file is UNCHANGED from current. The Mux asset creation happens in the PATCH handler (next step).

**Step 2: Update PATCH handler to create Mux asset when upload completes**

Replace `src/app/api/admin/videos/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile, deleteVideoFile, getAllWebinars } from '@/lib/db';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName } from '@/lib/r2';
import { createMuxAssetFromUrl, getMuxPlaybackUrl, deleteMuxAsset } from '@/lib/mux';

// PATCH /api/admin/videos/[id] — update status; when marking upload done, create Mux asset
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // When client signals upload complete (status → 'ready'), intercept to create Mux asset
  if (body.status === 'ready') {
    const videoFile = await getVideoFileById(id);
    if (!videoFile) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Check if Mux is configured
    if (process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET) {
      // Set status to 'processing' while Mux transcodes
      await updateVideoFile(id, { status: 'processing' as 'uploading' });

      try {
        const { assetId, playbackId } = await createMuxAssetFromUrl(videoFile.publicUrl);
        const muxPlaybackUrl = getMuxPlaybackUrl(playbackId);

        const updated = await updateVideoFile(id, {
          status: 'processing' as 'uploading',  // still processing until Mux is ready
          muxAssetId: assetId,
          muxPlaybackId: playbackId,
          muxPlaybackUrl: muxPlaybackUrl,
        } as Record<string, unknown>);

        return NextResponse.json(updated);
      } catch (muxError) {
        console.error('Mux asset creation failed:', muxError);
        // Fall back to R2-only (no Mux) — still mark as ready
        const updated = await updateVideoFile(id, { status: 'ready' });
        return NextResponse.json(updated);
      }
    }

    // No Mux configured — just mark ready (R2-only mode)
    const updated = await updateVideoFile(id, body);
    return NextResponse.json(updated);
  }

  // Default: pass through other updates
  const updated = await updateVideoFile(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/admin/videos/[id] — delete from Mux + R2 + metadata
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const videoFile = await getVideoFileById(id);
  if (!videoFile) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Check if video is in use by any webinar
  const webinars = await getAllWebinars();
  const playbackUrl = videoFile.muxPlaybackUrl || videoFile.publicUrl;
  const inUseBy = webinars.find(w => w.videoUrl === playbackUrl || w.videoUrl === videoFile.publicUrl);

  if (inUseBy) {
    const forceHeader = request.headers.get('x-force-delete');
    if (forceHeader !== 'true') {
      return NextResponse.json({
        error: 'in_use',
        webinarTitle: inUseBy.title,
        webinarId: inUseBy.id,
      }, { status: 409 });
    }
  }

  // Delete from Mux (if asset exists)
  if (videoFile.muxAssetId) {
    try {
      await deleteMuxAsset(videoFile.muxAssetId);
    } catch (muxError) {
      console.error('Mux delete error:', muxError);
    }
  }

  // Delete from R2 Storage
  try {
    const r2 = getR2Client();
    await r2.send(new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: videoFile.storagePath,
    }));
  } catch (storageError) {
    console.error('Storage delete error:', storageError);
  }

  // Delete metadata
  await deleteVideoFile(id);

  return NextResponse.json({ success: true });
}
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors. You may need to cast the `status: 'processing'` through the existing type — check if it passes. If the `updateVideoFile` function is generic enough, the new fields will flow through the snake_case mapper automatically.

**Step 4: Commit**

```bash
git add src/app/api/admin/videos/route.ts src/app/api/admin/videos/[id]/route.ts
git commit -m "feat: create Mux asset from R2 URL after upload completes"
```

---

## Task 4: Add Mux Status Polling Endpoint

**Files:**
- Create: `src/app/api/admin/videos/[id]/status/route.ts`

Mux transcoding takes seconds to minutes. The admin UI needs to poll for completion.

**Step 1: Create the status polling endpoint**

Create `src/app/api/admin/videos/[id]/status/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile } from '@/lib/db';
import { getMuxAssetStatus, getMuxPlaybackUrl } from '@/lib/mux';

// GET /api/admin/videos/[id]/status — check Mux transcoding status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const videoFile = await getVideoFileById(id);
  if (!videoFile) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // If no Mux asset or already ready, return current status
  if (!videoFile.muxAssetId || videoFile.status === 'ready') {
    return NextResponse.json({ status: videoFile.status, videoFile });
  }

  // Poll Mux for current status
  try {
    const muxStatus = await getMuxAssetStatus(videoFile.muxAssetId);

    if (muxStatus.status === 'ready') {
      // Transcoding complete — update our record
      const playbackId = muxStatus.playbackId || videoFile.muxPlaybackId;
      const updates: Record<string, unknown> = {
        status: 'ready',
      };
      if (muxStatus.duration) {
        updates.durationSec = Math.round(muxStatus.duration);
      }
      if (playbackId && !videoFile.muxPlaybackUrl) {
        updates.muxPlaybackUrl = getMuxPlaybackUrl(playbackId);
        updates.muxPlaybackId = playbackId;
      }

      const updated = await updateVideoFile(id, updates as Record<string, unknown>);
      return NextResponse.json({ status: 'ready', videoFile: updated });
    }

    if (muxStatus.status === 'errored') {
      await updateVideoFile(id, { status: 'error' });
      return NextResponse.json({ status: 'error', videoFile });
    }

    // Still processing
    return NextResponse.json({ status: 'processing', videoFile });
  } catch (err) {
    console.error('Mux status check error:', err);
    return NextResponse.json({ status: videoFile.status, videoFile });
  }
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/admin/videos/[id]/status/route.ts
git commit -m "feat: add Mux transcoding status polling endpoint"
```

---

## Task 5: Update Client Upload Flow

**Files:**
- Modify: `src/lib/video-upload.ts`

The client-side upload flow needs to:
1. Upload to R2 (unchanged)
2. Signal upload complete (PATCH status)
3. Poll for Mux transcoding to finish
4. Return the Mux HLS URL (not the R2 URL)

**Step 1: Update video-upload.ts**

Replace `src/lib/video-upload.ts`:

```typescript
export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  videoFileId: string;
  publicUrl: string;   // Mux HLS URL if available, else R2 URL
  filename: string;
}

export async function uploadVideo(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  // Step 1: Get presigned URL from our API
  const initRes = await fetch('/api/admin/videos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
    }),
  });

  if (!initRes.ok) {
    const err = await initRes.json();
    throw new Error(err.error || 'Failed to initialize upload');
  }

  const { videoFile, presignedUrl } = await initRes.json();

  // Step 2: Upload file directly to R2 via presigned PUT URL
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((e.loaded / e.total) * 100),
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.send(file);
  });

  // Step 3: Signal upload complete — server creates Mux asset
  onProgress?.({ loaded: file.size, total: file.size, percent: 100 });

  const patchRes = await fetch(`/api/admin/videos/${videoFile.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ready' }),
  });

  if (!patchRes.ok) {
    throw new Error('Failed to finalize upload');
  }

  const patchedFile = await patchRes.json();

  // Step 4: If Mux is processing, poll for completion
  if (patchedFile.status === 'processing' && patchedFile.muxAssetId) {
    const finalFile = await pollMuxStatus(videoFile.id, onProgress);
    return {
      videoFileId: finalFile.id,
      publicUrl: finalFile.muxPlaybackUrl || finalFile.publicUrl,
      filename: file.name,
    };
  }

  // No Mux — return R2 URL directly
  return {
    videoFileId: patchedFile.id,
    publicUrl: patchedFile.muxPlaybackUrl || patchedFile.publicUrl,
    filename: file.name,
  };
}

/**
 * Poll the Mux status endpoint until transcoding completes.
 * Typically takes 10-60 seconds for a 1-hour video.
 */
async function pollMuxStatus(
  videoId: string,
  onProgress?: (progress: UploadProgress) => void,
  maxAttempts = 120,
  intervalMs = 3000,
): Promise<Record<string, string>> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    const res = await fetch(`/api/admin/videos/${videoId}/status`);
    if (!res.ok) continue;

    const data = await res.json();

    // Show "processing" progress to user (indeterminate-style)
    if (onProgress && data.status === 'processing') {
      onProgress({ loaded: 0, total: 0, percent: -1 }); // -1 signals indeterminate
    }

    if (data.status === 'ready') {
      return data.videoFile;
    }

    if (data.status === 'error') {
      throw new Error('Video processing failed');
    }
  }

  throw new Error('Video processing timed out');
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/video-upload.ts
git commit -m "feat: poll Mux status after R2 upload, return HLS URL"
```

---

## Task 6: Update VideoManager UI for Processing State

**Files:**
- Modify: `src/app/(admin)/admin/_components/VideoManager.tsx`

**Step 1: Show processing/transcoding state in the UI**

Two changes needed:

1. The `fetchVideos` function currently filters `status === 'ready'`. Change it to also show `'processing'` videos.
2. Add a "processing" indicator with auto-refresh for videos being transcoded.
3. Show the Mux HLS URL (not R2 URL) when selecting a video.

In `VideoManager.tsx`, make these changes:

**Change 1:** Update `fetchVideos` to include processing videos:

Find:
```typescript
const data = await res.json();
setVideos(data.filter((v: VideoFile) => v.status === 'ready'));
```

Replace with:
```typescript
const data = await res.json();
setVideos(data.filter((v: VideoFile) => v.status === 'ready' || v.status === 'processing'));
```

**Change 2:** Add auto-polling for processing videos. Add this `useEffect` after the existing `fetchVideos` effect:

```typescript
// Auto-refresh when videos are processing (Mux transcoding)
useEffect(() => {
  const hasProcessing = videos.some(v => v.status === 'processing');
  if (!hasProcessing) return;

  const interval = setInterval(async () => {
    // Poll status for each processing video
    for (const v of videos.filter(v => v.status === 'processing')) {
      try {
        const res = await fetch(`/api/admin/videos/${v.id}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ready' || data.status === 'error') {
            await fetchVideos(); // Refresh the full list
            break;
          }
        }
      } catch { /* ignore polling errors */ }
    }
  }, 4000);

  return () => clearInterval(interval);
}, [videos, fetchVideos]);
```

**Change 3:** Update the video list item rendering to show processing state and use Mux URL when selecting.

Find the `onClick` in the video list item:
```typescript
onClick={() => {
  onChange(video.publicUrl);
  setView('selected');
  setError('');
}}
```

Replace with:
```typescript
onClick={() => {
  if (video.status === 'processing') return; // Don't select processing videos
  onChange(video.muxPlaybackUrl || video.publicUrl);
  setView('selected');
  setError('');
}}
```

**Change 4:** Add a processing indicator in the video list item. Find this line in the video list rendering:

```typescript
{value === video.publicUrl && (
  <span className="text-[#B8953F] text-xs font-medium shrink-0">当前</span>
)}
```

Replace with:
```typescript
{video.status === 'processing' ? (
  <span className="text-amber-500 text-xs font-medium shrink-0 flex items-center gap-1">
    <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    转码中
  </span>
) : (value === video.publicUrl || value === video.muxPlaybackUrl) ? (
  <span className="text-[#B8953F] text-xs font-medium shrink-0">当前</span>
) : null}
```

**Change 5:** Update the `selectedVideo` finder to match both URLs:

Find:
```typescript
const selectedVideo = videos.find(v => v.publicUrl === value);
```

Replace with:
```typescript
const selectedVideo = videos.find(v => v.publicUrl === value || v.muxPlaybackUrl === value);
```

**Change 6:** Make processing videos non-clickable in the list. Find the cursor styling:

```typescript
className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
```

Replace with:
```typescript
className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
  ${video.status === 'processing' ? 'cursor-wait opacity-60' : 'cursor-pointer'}
```

**Step 2: Update the upload handler progress for transcoding state**

In the `handleUpload` function, the progress callback may receive `percent: -1` during Mux processing. Update the progress display:

Find in the library view upload zone:
```typescript
上传中... {uploadProgress.percent}% ({formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)})
```

Replace with:
```typescript
{uploadProgress.percent === -1
  ? '视频转码中，请稍候...'
  : `上传中... ${uploadProgress.percent}% (${formatFileSize(uploadProgress.loaded)} / ${formatFileSize(uploadProgress.total)})`
}
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/app/\(admin\)/admin/_components/VideoManager.tsx
git commit -m "feat: show Mux transcoding status in VideoManager, use HLS URL"
```

---

## Task 7: Update Architecture Docs + Decision Log

**Files:**
- Modify: `docs/architecture.md` — Update video storage section
- Modify: `docs/decisions.md` — Append Mux decision

**Step 1: Update architecture.md**

Add/update the Video Storage section to mention Mux:

```markdown
### Video Storage & Delivery

Videos are uploaded to **Cloudflare R2** (S3-compatible) as the source-of-truth backup. After upload, the server creates a **Mux** asset from the R2 public URL. Mux auto-transcodes to HLS adaptive bitrate (360p–1080p) and serves via its global CDN at `stream.mux.com`. The webinar's `videoUrl` stores the Mux HLS URL (`https://stream.mux.com/{PLAYBACK_ID}.m3u8`).

If Mux env vars are not configured, the system falls back to serving the raw MP4 directly from R2 (no HLS, no adaptive bitrate).

Upload flow: Browser → R2 (presigned PUT) → Server creates Mux asset → Mux transcodes → Status polling → Ready
```

**Step 2: Append to decisions.md**

```markdown
### 2026-03-12 — Mux for video delivery (HLS adaptive streaming)

**Decision:** Add Mux as the video delivery layer on top of R2 storage. R2 remains the upload destination and backup; Mux handles transcoding and CDN delivery.

**Why:** R2's `r2.dev` subdomain has no CDN caching, causing video buffering. Mux provides automatic HLS adaptive bitrate, global CDN, and 100K free delivery minutes/month. Video.js + HLS.js already supports `.m3u8` URLs — zero player code changes needed.

**Alternatives rejected:** Cloudflare Stream ($60/mo at 1K viewers vs Mux ~$0.18), Bunny Stream (viable but Mux created Video.js — best compatibility), R2 custom domain (no HLS, needs domain on Cloudflare).
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: add Mux video delivery to architecture, record decision"
```

---

## Task 8: Manual Testing Checklist

No code changes — this is a verification task.

**Prerequisites:**
- Mux account created at https://dashboard.mux.com
- API access token created at https://dashboard.mux.com/settings/access-tokens
- `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` set in `.env.local`
- Supabase migration applied (Task 2 SQL)

**Test 1: Upload a video**
1. Run `npm run dev`
2. Go to admin panel → edit a webinar → video section
3. Upload a small video file (< 50MB for quick test)
4. Verify: Progress bar shows upload percentage
5. Verify: After upload, progress shows "视频转码中，请稍候..."
6. Verify: After 10-30 seconds, video appears in library as "ready"
7. Verify: Selecting the video sets `videoUrl` to an `https://stream.mux.com/...m3u8` URL

**Test 2: Play the video**
1. Register for the webinar and enter the live room
2. Verify: Video plays smoothly via HLS (no buffering/lag)
3. Verify: Seeking is still blocked (business requirement)
4. Verify: Chat messages still trigger at correct times
5. Verify: CTA overlays still appear at correct times

**Test 3: Delete a video**
1. In admin → video library, delete a video
2. Verify: No errors in console
3. Verify: Video removed from library
4. Check Mux dashboard: asset should be deleted

**Test 4: Fallback (no Mux env vars)**
1. Temporarily remove `MUX_TOKEN_ID` and `MUX_TOKEN_SECRET` from `.env.local`
2. Restart dev server
3. Upload a video
4. Verify: Upload succeeds, video uses R2 URL directly (no Mux processing)
5. Restore env vars

---

## Summary of All File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `@mux/mux-node` dependency |
| `src/lib/mux.ts` | Create | Mux client: create/delete assets, get status, playback URLs |
| `src/lib/types.ts` | Modify | Add `muxAssetId`, `muxPlaybackId`, `muxPlaybackUrl`, `'processing'` status |
| `src/app/api/admin/videos/[id]/route.ts` | Modify | Create Mux asset on PATCH, delete Mux asset on DELETE |
| `src/app/api/admin/videos/[id]/status/route.ts` | Create | Poll Mux transcoding status |
| `src/lib/video-upload.ts` | Modify | Add Mux status polling after R2 upload |
| `src/app/(admin)/admin/_components/VideoManager.tsx` | Modify | Show processing state, use HLS URL, auto-refresh |
| `docs/architecture.md` | Modify | Update video storage section |
| `docs/decisions.md` | Modify | Append Mux decision |
| `.env.local` | Modify | Add `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` |
| Supabase | Migration | Add `mux_asset_id`, `mux_playback_id`, `mux_playback_url` columns |

## Files NOT Changed (Zero Impact)

| File | Why unchanged |
|------|---------------|
| `src/components/video/VideoPlayer.tsx` | Already supports HLS `.m3u8` URLs via Video.js + HLS.js |
| `src/app/(public)/webinar/[id]/live/page.tsx` | Just passes `webinar.videoUrl` — transparent to source |
| `src/lib/utils.ts` → `getVideoSourceType()` | Mux URLs end in `.m3u8`, already returns correct MIME |
| `src/components/chat/ChatRoom.tsx` | Time sync unchanged — HLS `timeupdate` is standard |
| `src/components/cta/CTAOverlay.tsx` | Same — driven by `currentTime` prop |
| `src/lib/r2.ts` | R2 still used for upload — no changes |
