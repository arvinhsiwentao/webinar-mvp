# Cloudflare R2 Video Storage Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Supabase Storage with Cloudflare R2 for video file uploads to eliminate the 50MB free-tier limit and get zero-egress-fee video streaming.

**Architecture:** Server-side API generates presigned PUT URLs via `@aws-sdk/client-s3`. Client uploads directly to R2 via XHR (with progress tracking). Video metadata stays in Supabase `video_files` table. Public URLs served from R2's `r2.dev` subdomain (custom domain later). Also adds a "paste external URL" fallback input.

**Tech Stack:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, Cloudflare R2 (S3-compatible API)

---

## Prerequisites

User must complete R2 setup first (see separate guide) and add to `.env.local`:
```
CLOUDFLARE_ACCOUNT_ID=<account-id>
R2_ACCESS_KEY_ID=<access-key-id>
R2_SECRET_ACCESS_KEY=<secret-access-key>
R2_BUCKET_NAME=webinar-videos
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

---

### Task 1: Install AWS S3 SDK, remove TUS client

**Files:**
- Modify: `package.json`

**Step 1: Install S3 SDK packages**

Run:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Step 2: Remove TUS client**

Run:
```bash
npm uninstall tus-js-client
```

**Step 3: Verify install**

Run: `npm ls @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`
Expected: Both packages listed

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: replace tus-js-client with @aws-sdk/client-s3 for R2 uploads"
```

---

### Task 2: Create R2 client module

**Files:**
- Create: `src/lib/r2.ts`

**Step 1: Create R2 client**

```typescript
import { S3Client } from '@aws-sdk/client-s3';

let _r2: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_r2) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing R2 env vars: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    }
    _r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _r2;
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || 'webinar-videos';
}

export function getR2PublicUrl(storagePath: string): string {
  const baseUrl = process.env.R2_PUBLIC_URL;
  if (!baseUrl) {
    throw new Error('Missing R2_PUBLIC_URL env var');
  }
  return `${baseUrl}/${storagePath}`;
}
```

**Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/r2.ts
git commit -m "feat: add Cloudflare R2 client module"
```

---

### Task 3: Update video upload API route (Supabase → R2 presigned URL)

**Files:**
- Modify: `src/app/api/admin/videos/route.ts`

**Step 1: Rewrite POST handler to use R2 presigned URLs**

Replace the POST handler to:
1. Generate unique storage path (keep existing pattern)
2. Get public URL from R2 (not Supabase)
3. Create metadata record in Supabase `video_files` table (keep existing)
4. Generate presigned PUT URL via `@aws-sdk/s3-request-presigner` (replace Supabase signed URL + TUS)
5. Return `{ videoFile, presignedUrl }` (no more tusEndpoint/tusToken/bucketName/storagePath)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFiles, createVideoFile } from '@/lib/db';
import { getR2Client, getR2BucketName, getR2PublicUrl } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// GET handler stays the same

// POST handler:
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { filename, fileSize } = body;

  if (!filename || !fileSize) {
    return NextResponse.json({ error: 'filename and fileSize required' }, { status: 400 });
  }

  const ext = filename.split('.').pop() || 'mp4';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const publicUrl = getR2PublicUrl(storagePath);

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

**Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/admin/videos/route.ts
git commit -m "feat: generate R2 presigned upload URLs instead of Supabase TUS"
```

---

### Task 4: Update video delete API route (Supabase Storage → R2)

**Files:**
- Modify: `src/app/api/admin/videos/[id]/route.ts`

**Step 1: Replace Supabase storage delete with R2 delete**

Replace the `supabase.storage.from(...).remove(...)` call with:

```typescript
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName } from '@/lib/r2';

// In DELETE handler, replace storage deletion:
const r2 = getR2Client();
await r2.send(new DeleteObjectCommand({
  Bucket: getR2BucketName(),
  Key: video.storagePath,
}));
```

Remove the `supabase` import from this file.

**Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/admin/videos/[id]/route.ts
git commit -m "feat: delete video files from R2 instead of Supabase Storage"
```

---

### Task 5: Rewrite client-side upload (TUS → XHR PUT to presigned URL)

**Files:**
- Modify: `src/lib/video-upload.ts`

**Step 1: Replace TUS upload with XHR PUT**

R2 presigned URLs accept a simple PUT with the raw file body (no FormData wrapping needed). XHR gives us progress tracking. Max 5GB per single PUT.

```typescript
// Remove: import * as tus from 'tus-js-client';

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

    // R2 presigned URL: simple PUT with raw file body
    // Auth is embedded in the URL query params (no headers needed)
    xhr.open('PUT', presignedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.send(file);
  });

  // Step 3: Mark upload as ready
  await fetch(`/api/admin/videos/${videoFile.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ready' }),
  });

  return {
    videoFileId: videoFile.id,
    publicUrl: videoFile.publicUrl,
    filename: file.name,
  };
}
```

**Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/video-upload.ts
git commit -m "feat: upload videos to R2 via presigned PUT URL"
```

---

### Task 6: Add "paste external URL" option to VideoManager

**Files:**
- Modify: `src/app/(admin)/admin/_components/VideoManager.tsx`

**Step 1: Add URL input mode**

Add a text input below the upload zone that lets the admin paste any external MP4/HLS URL directly. This is a fallback for videos hosted elsewhere (existing CDN, manually uploaded to R2 via dashboard, etc.).

In the VideoManager component:
1. Add state: `const [externalUrl, setExternalUrl] = useState('')`
2. Below the upload drop zone (in both selected and library views), add a divider + text input:

```tsx
{/* External URL input */}
<div className="mt-3 pt-3 border-t border-gray-200">
  <div className="flex gap-2">
    <input
      type="url"
      value={externalUrl}
      onChange={(e) => setExternalUrl(e.target.value)}
      placeholder="或粘贴视频 URL (MP4/M3U8)"
      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#B8953F]"
    />
    <button
      onClick={() => {
        if (externalUrl.trim()) {
          onChange(externalUrl.trim());
          setExternalUrl('');
        }
      }}
      disabled={!externalUrl.trim()}
      className="px-3 py-1.5 text-sm bg-[#B8953F] text-white rounded-md hover:bg-[#A07E35] disabled:opacity-50"
    >
      使用
    </button>
  </div>
</div>
```

**Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Test manually**

- Open admin panel
- Verify upload zone still works
- Verify paste URL input appears
- Paste a test URL, click "使用", verify it sets the video URL

**Step 4: Commit**

```bash
git add src/app/(admin)/admin/_components/VideoManager.tsx
git commit -m "feat: add paste-URL fallback input to VideoManager"
```

---

### Task 7: Clean up Supabase Storage references

**Files:**
- Modify: `src/app/api/admin/videos/route.ts` (remove supabase import if not already)
- Check: `src/lib/supabase.ts` (keep — still used for DB)
- Modify: `docs/architecture.md` (update video storage section)
- Modify: `docs/decisions.md` (record migration decision)

**Step 1: Remove unused Supabase Storage imports**

In `src/app/api/admin/videos/route.ts`, ensure the `supabase` import is removed (replaced by R2 in Task 3).

**Step 2: Update `docs/architecture.md`**

Update the Video Storage section to reflect R2:
- Storage: Cloudflare R2 bucket `webinar-videos`
- Upload: Presigned PUT URL via `@aws-sdk/client-s3`
- Serving: Public URL from R2 `r2.dev` subdomain
- Metadata: Still in Supabase `video_files` table
- Fallback: Admin can paste any external MP4/HLS URL

**Step 3: Update `docs/decisions.md`**

Append entry:
```
## 2026-03-11: Migrate video storage from Supabase to Cloudflare R2
Supabase free tier has 50MB file upload limit (hard cap, no workaround). R2 free tier: 10GB storage, zero egress, 5GB per upload. Metadata stays in Supabase DB. Added paste-URL fallback for flexibility.
```

**Step 4: Commit**

```bash
git add src/app/api/admin/videos/route.ts docs/architecture.md docs/decisions.md
git commit -m "docs: update architecture for R2 migration, record decision"
```

---

### Task 8: End-to-end verification

**Step 1: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Test upload flow**

Run: `npm run dev`
1. Go to admin panel
2. Upload a video file (any size) via drag-drop
3. Verify progress bar works
4. Verify video appears in library with status "ready"
5. Select video for a webinar
6. Open webinar live page — verify video plays from R2 URL

**Step 3: Test paste URL flow**

1. Paste any public MP4 URL in the URL input
2. Click "使用"
3. Verify video URL is set on the webinar

**Step 4: Test delete flow**

1. Delete a video from the library
2. Verify it's removed from both R2 and the metadata table

---

## Summary of Changes

| File | Change |
|------|--------|
| `package.json` | Add `@aws-sdk/client-s3` + `s3-request-presigner`, remove `tus-js-client` |
| `src/lib/r2.ts` | **New** — R2 client, bucket name, public URL helpers |
| `src/lib/video-upload.ts` | TUS → XHR PUT to presigned URL |
| `src/app/api/admin/videos/route.ts` | Supabase signed URL → R2 presigned URL |
| `src/app/api/admin/videos/[id]/route.ts` | Supabase storage delete → R2 delete |
| `src/app/(admin)/admin/_components/VideoManager.tsx` | Add paste-URL input |
| `docs/architecture.md` | Update video storage section |
| `docs/decisions.md` | Record R2 migration decision |
| `.env.local` | Add 5 R2 env vars |
