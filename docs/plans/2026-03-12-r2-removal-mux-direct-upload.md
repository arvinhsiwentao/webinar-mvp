# R2 Removal & Mux Direct Upload Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Cloudflare R2 from the video upload pipeline and replace it with Mux Direct Uploads, eliminating the middleman storage layer.

**Architecture:** Browser uploads directly to Mux via `@mux/upchunk` (chunked, resumable). Server creates Mux Direct Upload URLs instead of R2 presigned URLs. After upload, Mux auto-creates the asset and transcodes to HLS. Client polls upload/asset status until ready. R2 client, env vars, and AWS SDK packages are fully removed.

**Tech Stack:** `@mux/mux-node` (server, already installed), `@mux/upchunk` (client, new), Supabase Postgres (schema migration)

**Current DB state (verified live):**
- 1 webinar — `video_url` = Mux HLS URL (no R2 dependency)
- 10 `video_files` rows — 1 ready (has Mux), 9 stuck at `uploading` (legacy garbage)
- `storage_path` and `public_url` are `NOT NULL` — must be altered

---

## Pre-flight: Data Cleanup

### Task 0: Clean up legacy failed uploads & verify no R2 dependencies

**Why:** 9 of 10 `video_files` rows are stuck at `uploading` status from old Supabase Storage migration attempts. They have no Mux data and are not referenced by any webinar. Clean these up before schema migration to avoid complications.

**Step 1: Verify no webinar uses an R2 URL**

Run this SQL in Supabase dashboard or via MCP:
```sql
SELECT id, title, video_url FROM webinars
WHERE video_url LIKE '%r2.dev%' OR video_url NOT LIKE '%stream.mux.com%';
```
Expected: 0 rows (already verified — the only webinar uses `stream.mux.com`)

**Step 2: Delete orphaned failed uploads**

```sql
DELETE FROM video_files WHERE status = 'uploading';
```
Expected: 9 rows deleted. Only the 1 `ready` row with Mux data remains.

**Step 3: Verify remaining data**

```sql
SELECT id, filename, status, mux_asset_id, mux_playback_url FROM video_files;
```
Expected: 1 row — `多元模型.mp4`, status `ready`, with mux fields populated.

**Step 4: Commit (no code change, just document the cleanup)**

```bash
# No code commit needed — this is a DB-only cleanup
```

---

## Phase 1: Schema & Type Changes

### Task 1: Supabase migration — make R2 columns nullable, add `mux_upload_id`

**Files:**
- Modify: `scripts/supabase-schema.sql` (add `video_files` table definition)

**Step 1: Run migration SQL**

Apply via Supabase MCP `apply_migration` or dashboard:
```sql
-- Make R2 columns nullable (they won't be populated for new uploads)
ALTER TABLE video_files ALTER COLUMN storage_path DROP NOT NULL;
ALTER TABLE video_files ALTER COLUMN public_url DROP NOT NULL;

-- Add column for Mux Direct Upload tracking
ALTER TABLE video_files ADD COLUMN IF NOT EXISTS mux_upload_id text;
```

**Step 2: Verify migration**

```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'video_files' AND column_name IN ('storage_path', 'public_url', 'mux_upload_id');
```
Expected: `storage_path` = YES, `public_url` = YES, `mux_upload_id` = YES

**Step 3: Add `video_files` table to schema SQL file**

Add to `scripts/supabase-schema.sql` (currently missing):
```sql
-- Video files (upload metadata + Mux delivery)
create table if not exists video_files (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  storage_path text,           -- legacy R2 path (nullable, not used for new uploads)
  public_url text,             -- legacy R2 URL (nullable, not used for new uploads)
  file_size bigint not null,
  duration_sec integer,
  status text not null default 'uploading' check (status in ('uploading', 'processing', 'ready', 'error')),
  uploaded_at timestamptz not null default now(),
  mux_upload_id text,          -- Mux Direct Upload ID (for polling upload status)
  mux_asset_id text,
  mux_playback_id text,
  mux_playback_url text
);
create index if not exists idx_video_files_status on video_files(status);
```

**Step 4: Commit**

```bash
git add scripts/supabase-schema.sql
git commit -m "chore: add video_files table to schema, make R2 columns nullable"
```

---

### Task 2: Update `VideoFile` TypeScript interface

**Files:**
- Modify: `src/lib/types.ts:134-146`

**Step 1: Update the interface**

Replace lines 134-146 in `src/lib/types.ts`:
```typescript
export interface VideoFile {
  id: string;
  filename: string;           // original upload filename
  storagePath?: string;       // legacy R2 path (not used for new uploads)
  publicUrl?: string;         // legacy R2 URL (not used for new uploads)
  fileSize: number;           // bytes
  durationSec?: number;       // seconds (set from Mux after transcoding)
  status: 'uploading' | 'processing' | 'ready' | 'error';
  uploadedAt: string;         // ISO date
  muxUploadId?: string;       // Mux Direct Upload ID (for tracking upload)
  muxAssetId?: string;        // Mux asset ID (for management/deletion)
  muxPlaybackId?: string;     // Mux playback ID (used to construct HLS URL)
  muxPlaybackUrl?: string;    // full HLS URL: https://stream.mux.com/{id}.m3u8
}
```

**Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: Type errors in files that use `storagePath` and `publicUrl` as required — these will be fixed in subsequent tasks.

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "refactor: make R2 fields optional on VideoFile, add muxUploadId"
```

---

## Phase 2: Server-Side — Mux Direct Upload

### Task 3: Add Mux Direct Upload functions to `mux.ts`

**Files:**
- Modify: `src/lib/mux.ts`

**Step 1: Add `createMuxDirectUpload` and `getMuxUploadStatus` functions**

Add these functions to the end of `src/lib/mux.ts` (after `deleteMuxAsset`):
```typescript
export async function createMuxDirectUpload(options: {
  corsOrigin: string;
  passthrough?: string;
}): Promise<{ uploadId: string; uploadUrl: string }> {
  const mux = getMuxClient();
  const upload = await mux.video.uploads.create({
    cors_origin: options.corsOrigin,
    new_asset_settings: {
      playback_policies: ['public'],
      video_quality: 'basic',
    },
    timeout: 86400, // 24 hours for large files
  });

  return {
    uploadId: upload.id,
    uploadUrl: upload.url,
  };
}

export async function getMuxUploadStatus(uploadId: string): Promise<{
  status: string;
  assetId?: string;
}> {
  const mux = getMuxClient();
  const upload = await mux.video.uploads.retrieve(uploadId);
  return {
    status: upload.status ?? 'waiting',
    assetId: upload.asset_id ?? undefined,
  };
}
```

**Step 2: Remove `createMuxAssetFromUrl`**

Delete the `createMuxAssetFromUrl` function (lines 17-37). It is no longer needed — Mux auto-creates assets from direct uploads.

**Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: Error in `src/app/api/admin/videos/[id]/route.ts` where `createMuxAssetFromUrl` is imported — will be fixed in Task 5.

**Step 4: Commit**

```bash
git add src/lib/mux.ts
git commit -m "feat: add Mux Direct Upload functions, remove createMuxAssetFromUrl"
```

---

### Task 4: Rewrite `POST /api/admin/videos` — create Mux upload URL instead of R2 presigned URL

**Files:**
- Modify: `src/app/api/admin/videos/route.ts`

**Step 1: Rewrite the file**

Replace the entire content of `src/app/api/admin/videos/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFiles, createVideoFile } from '@/lib/db';
import { createMuxDirectUpload } from '@/lib/mux';

// GET /api/admin/videos — list all videos
export async function GET() {
  const files = await getVideoFiles();
  return NextResponse.json(files);
}

// POST /api/admin/videos — create metadata + Mux Direct Upload URL
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { filename, fileSize } = body;

  if (!filename || !fileSize) {
    return NextResponse.json({ error: 'filename and fileSize required' }, { status: 400 });
  }

  // Determine CORS origin from request
  const origin = request.headers.get('origin') || '*';

  // Create Mux Direct Upload URL
  const { uploadId, uploadUrl } = await createMuxDirectUpload({
    corsOrigin: origin,
  });

  // Create metadata record with status 'uploading'
  const videoFile = await createVideoFile({
    filename,
    fileSize,
    status: 'uploading',
    muxUploadId: uploadId,
  });

  return NextResponse.json({
    videoFile,
    uploadUrl,
  });
}
```

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/admin/videos/route.ts
git commit -m "feat: POST /api/admin/videos creates Mux Direct Upload URL instead of R2 presigned URL"
```

---

### Task 5: Rewrite `PATCH/DELETE /api/admin/videos/[id]` — remove R2 logic

**Files:**
- Modify: `src/app/api/admin/videos/[id]/route.ts`

**Step 1: Rewrite the file**

Replace the entire content of `src/app/api/admin/videos/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile, deleteVideoFile, getAllWebinars } from '@/lib/db';
import { deleteMuxAsset } from '@/lib/mux';

// PATCH /api/admin/videos/[id] — update video metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = await updateVideoFile(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/admin/videos/[id] — delete from Mux + metadata
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
  const inUseBy = webinars.find(w =>
    w.videoUrl === videoFile.muxPlaybackUrl
  );

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
      console.error('Mux asset delete error:', muxError);
    }
  }

  // Delete metadata from Supabase
  await deleteVideoFile(id);

  return NextResponse.json({ success: true });
}
```

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/admin/videos/[id]/route.ts
git commit -m "refactor: remove R2 from video PATCH/DELETE, simplify in-use check to Mux URL only"
```

---

### Task 6: Rewrite `GET /api/admin/videos/[id]/status` — handle Mux upload + asset status

**Files:**
- Modify: `src/app/api/admin/videos/[id]/status/route.ts`

**Step 1: Rewrite the file**

Replace the entire content:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile } from '@/lib/db';
import { getMuxAssetStatus, getMuxPlaybackUrl, getMuxUploadStatus } from '@/lib/mux';
import type { VideoFile } from '@/lib/types';

// GET /api/admin/videos/[id]/status — check upload + transcoding status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const videoFile = await getVideoFileById(id);
  if (!videoFile) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Already ready or errored — return as-is
  if (videoFile.status === 'ready' || videoFile.status === 'error') {
    return NextResponse.json({ status: videoFile.status, videoFile });
  }

  try {
    // Phase 1: Upload still in progress — check if Mux has received the file
    if (videoFile.muxUploadId && !videoFile.muxAssetId) {
      const uploadStatus = await getMuxUploadStatus(videoFile.muxUploadId);

      if (uploadStatus.status === 'asset_created' && uploadStatus.assetId) {
        // Upload complete — Mux created the asset, move to processing
        const updated = await updateVideoFile(id, {
          status: 'processing',
          muxAssetId: uploadStatus.assetId,
        });
        return NextResponse.json({ status: 'processing', videoFile: updated });
      }

      if (uploadStatus.status === 'errored' || uploadStatus.status === 'timed_out' || uploadStatus.status === 'cancelled') {
        await updateVideoFile(id, { status: 'error' });
        return NextResponse.json({ status: 'error', videoFile });
      }

      // Still waiting for upload to complete
      return NextResponse.json({ status: 'uploading', videoFile });
    }

    // Phase 2: Asset exists — check transcoding status
    if (videoFile.muxAssetId) {
      const muxStatus = await getMuxAssetStatus(videoFile.muxAssetId);

      if (muxStatus.status === 'ready') {
        const playbackId = muxStatus.playbackId || videoFile.muxPlaybackId;
        const updates: Partial<VideoFile> = { status: 'ready' };

        if (muxStatus.duration) {
          updates.durationSec = Math.round(muxStatus.duration);
        }
        if (playbackId && !videoFile.muxPlaybackUrl) {
          updates.muxPlaybackUrl = getMuxPlaybackUrl(playbackId);
          updates.muxPlaybackId = playbackId;
        }

        const updated = await updateVideoFile(id, updates);
        return NextResponse.json({ status: 'ready', videoFile: updated });
      }

      if (muxStatus.status === 'errored') {
        await updateVideoFile(id, { status: 'error' });
        return NextResponse.json({ status: 'error', videoFile });
      }

      return NextResponse.json({ status: 'processing', videoFile });
    }

    // No Mux upload or asset — shouldn't happen, return current status
    return NextResponse.json({ status: videoFile.status, videoFile });
  } catch (err) {
    console.error('Status check error:', err);
    return NextResponse.json({ status: videoFile.status, videoFile });
  }
}
```

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/api/admin/videos/[id]/status/route.ts
git commit -m "feat: status endpoint handles both Mux upload and asset transcoding phases"
```

---

## Phase 3: Client-Side — UpChunk Upload

### Task 7: Install `@mux/upchunk`, remove AWS SDK packages

**Files:**
- Modify: `package.json`

**Step 1: Install and remove packages**

```bash
cd /c/Users/user1/dev/webinar-mvp && npm install @mux/upchunk && npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Step 2: Verify package.json**

Confirm `@mux/upchunk` is in dependencies, and `@aws-sdk/*` packages are gone.

```bash
cat package.json | grep -E "upchunk|aws-sdk"
```
Expected: Only `@mux/upchunk` appears.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add @mux/upchunk, remove @aws-sdk/client-s3 and s3-request-presigner"
```

---

### Task 8: Rewrite `video-upload.ts` — use UpChunk instead of XHR to R2

**Files:**
- Modify: `src/lib/video-upload.ts`

**Step 1: Rewrite the file**

Replace the entire content of `src/lib/video-upload.ts`:
```typescript
import * as UpChunk from '@mux/upchunk';

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  videoFileId: string;
  publicUrl: string;   // Mux HLS URL
  filename: string;
}

export async function uploadVideo(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  // Step 1: Get Mux Direct Upload URL from our API
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

  const { videoFile, uploadUrl } = await initRes.json();

  // Step 2: Upload file to Mux via UpChunk (chunked, resumable)
  await new Promise<void>((resolve, reject) => {
    const upload = UpChunk.createUpload({
      endpoint: uploadUrl,
      file,
      chunkSize: 5120, // ~5MB chunks
    });

    upload.on('progress', (detail: { detail: number }) => {
      const percent = Math.round(detail.detail);
      onProgress?.({
        loaded: Math.round((percent / 100) * file.size),
        total: file.size,
        percent,
      });
    });

    upload.on('success', () => {
      onProgress?.({ loaded: file.size, total: file.size, percent: 100 });
      resolve();
    });

    upload.on('error', (err: { detail: { message: string } }) => {
      reject(new Error(err.detail?.message || 'Upload failed'));
    });
  });

  // Step 3: Poll for Mux upload completion + asset transcoding
  const finalFile = await pollStatus(videoFile.id, onProgress);

  return {
    videoFileId: finalFile.id,
    publicUrl: finalFile.muxPlaybackUrl,
    filename: file.name,
  };
}

/**
 * Poll the status endpoint until:
 * 1. Mux receives the upload and creates an asset (uploading → processing)
 * 2. Mux finishes transcoding (processing → ready)
 */
async function pollStatus(
  videoId: string,
  onProgress?: (progress: UploadProgress) => void,
  maxAttempts = 180,
  intervalMs = 3000,
): Promise<Record<string, string>> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    const res = await fetch(`/api/admin/videos/${videoId}/status`);
    if (!res.ok) continue;

    const data = await res.json();

    if (data.status === 'processing' || data.status === 'uploading') {
      // Show indeterminate progress for transcoding phase
      onProgress?.({ loaded: 0, total: 0, percent: -1 });
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

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/video-upload.ts
git commit -m "feat: rewrite video upload to use Mux Direct Upload via @mux/upchunk"
```

---

## Phase 4: Admin UI Fixes

### Task 9: Fix VideoManager URL matching bugs

**Files:**
- Modify: `src/app/(admin)/admin/_components/VideoManager.tsx`

There are 3 places in `VideoManager.tsx` that compare against `publicUrl` or use `publicUrl` as fallback. These need to use `muxPlaybackUrl` as the primary (and only) URL.

**Step 1: Fix delete-clears-selection (line 127)**

Find:
```typescript
      if (deleted && value === deleted.publicUrl) {
```
Replace with:
```typescript
      if (deleted && (value === deleted.muxPlaybackUrl || value === deleted.publicUrl)) {
```

**Step 2: Fix selected video matching (line 139)**

No change needed — line 139 already checks both:
```typescript
const selectedVideo = videos.find(v => v.publicUrl === value || v.muxPlaybackUrl === value);
```

**Step 3: Fix library highlight (lines 296-299)**

Find:
```typescript
                ${value === video.publicUrl
                  ? 'border-[#B8953F] bg-[#B8953F]/5'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
```
Replace with:
```typescript
                ${(value === video.muxPlaybackUrl || value === video.publicUrl)
                  ? 'border-[#B8953F] bg-[#B8953F]/5'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
```

**Step 4: Run type check**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/app/(admin)/admin/_components/VideoManager.tsx
git commit -m "fix: VideoManager URL matching checks both muxPlaybackUrl and publicUrl"
```

---

## Phase 5: Cleanup

### Task 10: Delete `r2.ts` and remove all R2 imports

**Files:**
- Delete: `src/lib/r2.ts`
- Verify: no remaining imports of `r2.ts` anywhere

**Step 1: Delete the file**

```bash
rm src/lib/r2.ts
```

**Step 2: Search for any remaining R2 references in source code**

```bash
grep -r "from.*r2" src/ --include="*.ts" --include="*.tsx"
grep -r "getR2" src/ --include="*.ts" --include="*.tsx"
grep -r "R2_" src/ --include="*.ts" --include="*.tsx"
```
Expected: 0 matches (all R2 imports were removed in Tasks 4 and 5).

**Step 3: Run type check and build**

```bash
npx tsc --noEmit && npm run build
```
Expected: Clean pass — no errors.

**Step 4: Commit**

```bash
git add -A src/lib/r2.ts
git commit -m "chore: delete r2.ts — R2 fully removed from video pipeline"
```

---

### Task 11: Update `createVideoFile` in `db.ts` to handle optional R2 fields

**Files:**
- Modify: `src/lib/db.ts:330-344`

**Step 1: Update the `createVideoFile` signature**

The current signature uses `Omit<VideoFile, 'id' | 'uploadedAt'>` which requires `storagePath` and `publicUrl`. Since these are now optional on the interface (Task 2), the function already works — but the `camelToSnake` mapper will include `undefined` values. Verify this doesn't cause issues.

Run a quick test: create a video file from the admin UI (Task 12 will test this end-to-end).

No code change needed here — the `Omit` type correctly picks up the optional fields from the updated interface. The Supabase client handles `undefined` values by not including them in the INSERT.

**Step 2: Commit (skip if no changes)**

No commit needed.

---

### Task 12: End-to-end manual test

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Test upload flow**

1. Open admin panel → create/edit a webinar
2. Click "视频库" → drag a small test video file
3. Verify: Upload progress bar shows percentage (from UpChunk)
4. Verify: After upload, status shows "视频转码中" (processing spinner)
5. Verify: After ~30-60 seconds, video becomes selectable (status: ready)
6. Click the video to select it
7. Verify: `videoUrl` is set to a `stream.mux.com` HLS URL

**Step 3: Test playback**

1. Save the webinar and navigate to the live page
2. Verify: Video plays via HLS (adaptive quality)
3. Verify: No console errors related to R2 or storage

**Step 4: Test deletion**

1. Go to admin → video library
2. Delete the test video
3. Verify: Video removed from library
4. Verify: No R2-related errors in console

**Step 5: Test external URL input**

1. In video manager, paste an external `.m3u8` URL
2. Click "使用"
3. Verify: URL is accepted and saved

---

### Task 13: Update documentation

**Files:**
- Modify: `docs/architecture.md` (video upload section)
- Modify: `docs/decisions.md` (append new decision)
- Modify: `CLAUDE.md` (update Key Directories / lib descriptions)

**Step 1: Update `docs/architecture.md`**

Find the video upload section and update to describe Mux Direct Upload flow. Remove all R2 references from the video pipeline description.

**Step 2: Append to `docs/decisions.md`**

```markdown
### 2026-03-12: Remove R2, use Mux Direct Uploads
**Decision:** Removed Cloudflare R2 from video upload pipeline. Browser now uploads directly to Mux via `@mux/upchunk`.
**Why:** R2 was only a staging area for Mux to fetch from — the R2 copy was never accessed after Mux ingested it. Direct upload eliminates the double-transfer (browser→R2→Mux), reduces infra (5 env vars, 2 npm packages), and adds resumable chunked uploads.
**Trade-off:** No local backup of raw video. Mux retains the master (downloadable via `master_access` API).
```

**Step 3: Update `CLAUDE.md`**

In the Key Directories section under `src/lib/`, update the `r2.ts` entry:
- Remove `r2.ts (Cloudflare R2 client)` from the list
- Update `video-upload.ts` description to mention Mux Direct Upload + UpChunk

**Step 4: Commit**

```bash
git add docs/architecture.md docs/decisions.md CLAUDE.md
git commit -m "docs: update architecture and decisions for R2 removal"
```

---

### Task 14: Remove R2 environment variables

**Step 1: Remove from `.env.local`**

Delete these 5 lines from `.env.local`:
```
CLOUDFLARE_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...
```

**Step 2: Verify dev server still works**

```bash
npm run dev
```
Expected: No startup errors about missing R2 env vars.

**Step 3: Final build check**

```bash
npm run build
```
Expected: Clean build with no errors.

**Step 4: Commit**

Note: `.env.local` is gitignored, so no commit needed for this step.

---

## Summary of Changes

| File | Action |
|------|--------|
| `src/lib/r2.ts` | **DELETE** |
| `src/lib/mux.ts` | Remove `createMuxAssetFromUrl`, add `createMuxDirectUpload` + `getMuxUploadStatus` |
| `src/lib/video-upload.ts` | **REWRITE** — UpChunk instead of XHR to R2 |
| `src/lib/types.ts` | Make `storagePath`/`publicUrl` optional, add `muxUploadId` |
| `src/app/api/admin/videos/route.ts` | **REWRITE** — Mux upload URL instead of R2 presigned URL |
| `src/app/api/admin/videos/[id]/route.ts` | **REWRITE** — remove R2 delete, simplify PATCH |
| `src/app/api/admin/videos/[id]/status/route.ts` | **REWRITE** — handle upload + asset status phases |
| `src/app/(admin)/admin/_components/VideoManager.tsx` | Fix URL matching bugs (3 locations) |
| `scripts/supabase-schema.sql` | Add `video_files` table definition |
| `package.json` | Add `@mux/upchunk`, remove `@aws-sdk/*` |
| `docs/architecture.md` | Update video section |
| `docs/decisions.md` | Append decision entry |
| `CLAUDE.md` | Remove `r2.ts` reference |
| `.env.local` | Remove 5 R2 env vars |
| Supabase `video_files` table | Make `storage_path`/`public_url` nullable, add `mux_upload_id` |
