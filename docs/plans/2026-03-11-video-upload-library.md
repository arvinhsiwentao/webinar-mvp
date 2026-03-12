# Video Upload & Library Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the video URL text field with a drag-and-drop upload system backed by Supabase Storage, with a video library for easy switching between uploaded content.

**Architecture:** Videos are uploaded directly from the browser to Supabase Storage using resumable uploads (TUS protocol) for large files (up to 2hrs/5GB). A JSON metadata file (`data/video-files.json`) tracks the library. The admin panel replaces the URL input with a VideoManager component that shows upload + library views. The existing `videoUrl` field on webinars stores the Supabase public URL — no changes to the player.

**Tech Stack:** Supabase Storage (resumable uploads via `@supabase/supabase-js`), Video.js (existing), Next.js API routes

---

## Prerequisites: Supabase Storage Bucket Setup

Before starting implementation, create the bucket in Supabase Dashboard:
1. Go to Supabase Dashboard → Storage
2. Create bucket named `webinar-videos`
3. Set to **public** (videos need to be served without auth)
4. Set file size limit to **5GB**
5. No RLS policies needed (we use service role key server-side)

---

### Task 1: VideoFile Type + JSON DB Functions

**Files:**
- Modify: `src/lib/types.ts` (add VideoFile interface)
- Modify: `src/lib/db.ts` (add CRUD for video-files.json)
- Create: `data/video-files.json` (empty array init)

**Step 1: Add VideoFile interface to types.ts**

Add after the existing interfaces:

```typescript
export interface VideoFile {
  id: string;
  filename: string;        // original upload filename
  storagePath: string;     // path in Supabase Storage bucket
  publicUrl: string;       // CDN URL for playback
  fileSize: number;        // bytes
  durationSec?: number;    // seconds (optional, set client-side)
  status: 'uploading' | 'ready' | 'error';
  uploadedAt: string;      // ISO date
}
```

**Step 2: Create data/video-files.json**

```json
[]
```

**Step 3: Add video file CRUD functions to db.ts**

Add these functions to `src/lib/db.ts`:

```typescript
// --- Video Files ---
const VIDEO_FILES_PATH = path.join(DATA_DIR, 'video-files.json');

export function getVideoFiles(): VideoFile[] {
  return readJsonFile<VideoFile[]>(VIDEO_FILES_PATH, []);
}

export function getVideoFileById(id: string): VideoFile | undefined {
  return getVideoFiles().find(v => v.id === id);
}

export function createVideoFile(data: Omit<VideoFile, 'id' | 'uploadedAt'>): VideoFile {
  const files = getVideoFiles();
  const videoFile: VideoFile = {
    ...data,
    id: generateId(),
    uploadedAt: new Date().toISOString(),
  };
  files.push(videoFile);
  writeJsonFile(VIDEO_FILES_PATH, files);
  return videoFile;
}

export function updateVideoFile(id: string, updates: Partial<VideoFile>): VideoFile | null {
  const files = getVideoFiles();
  const idx = files.findIndex(v => v.id === id);
  if (idx === -1) return null;
  files[idx] = { ...files[idx], ...updates };
  writeJsonFile(VIDEO_FILES_PATH, files);
  return files[idx];
}

export function deleteVideoFile(id: string): boolean {
  const files = getVideoFiles();
  const filtered = files.filter(v => v.id !== id);
  if (filtered.length === files.length) return false;
  writeJsonFile(VIDEO_FILES_PATH, filtered);
  return true;
}
```

Also add `VideoFile` to the import in db.ts from types.

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/db.ts data/video-files.json
git commit -m "feat: add VideoFile type and JSON DB functions for video library"
```

---

### Task 2: API Routes for Video Management

**Files:**
- Create: `src/app/api/admin/videos/route.ts` (GET list, POST create upload URL)
- Create: `src/app/api/admin/videos/[id]/route.ts` (PATCH update status, DELETE)

**Step 1: Create GET/POST route at `src/app/api/admin/videos/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFiles, createVideoFile } from '@/lib/db';
import { supabase } from '@/lib/supabase';

const BUCKET = 'webinar-videos';

// GET /api/admin/videos — list all videos
export async function GET() {
  const files = getVideoFiles();
  return NextResponse.json(files);
}

// POST /api/admin/videos — create metadata + return signed upload URL
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { filename, fileSize } = body;

  if (!filename || !fileSize) {
    return NextResponse.json({ error: 'filename and fileSize required' }, { status: 400 });
  }

  // Generate unique storage path
  const ext = filename.split('.').pop() || 'mp4';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // Create metadata record with status 'uploading'
  const videoFile = createVideoFile({
    filename,
    storagePath,
    publicUrl,
    fileSize,
    status: 'uploading',
  });

  // Create signed upload URL for client-side upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({
    videoFile,
    signedUrl: uploadData.signedUrl,
    token: uploadData.token,
    path: uploadData.path,
  });
}
```

**Step 2: Create PATCH/DELETE route at `src/app/api/admin/videos/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile, deleteVideoFile, getWebinars } from '@/lib/db';
import { supabase } from '@/lib/supabase';

const BUCKET = 'webinar-videos';

// PATCH /api/admin/videos/[id] — update status to 'ready'
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = updateVideoFile(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/admin/videos/[id] — delete from storage + metadata
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const videoFile = getVideoFileById(id);
  if (!videoFile) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Check if video is in use by any webinar
  const webinars = getWebinars();
  const inUseBy = webinars.find(w => w.videoUrl === videoFile.publicUrl);

  if (inUseBy) {
    // Return warning — client decides whether to force delete
    const forceHeader = _request.headers.get('x-force-delete');
    if (forceHeader !== 'true') {
      return NextResponse.json({
        error: 'in_use',
        webinarTitle: inUseBy.title,
        webinarId: inUseBy.id,
      }, { status: 409 });
    }
  }

  // Delete from Supabase Storage
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([videoFile.storagePath]);

  if (storageError) {
    console.error('Storage delete error:', storageError);
    // Continue with metadata deletion even if storage fails
  }

  // Delete metadata
  deleteVideoFile(id);

  return NextResponse.json({ success: true });
}
```

**Step 3: Verify getWebinars is exported from db.ts**

Check that `getWebinars()` is already exported from `src/lib/db.ts`. It should be — it's used by the webinar API routes.

**Step 4: Commit**

```bash
git add src/app/api/admin/videos/
git commit -m "feat: add video upload/list/delete API routes"
```

---

### Task 3: Supabase Client-Side Upload Helper

**Files:**
- Create: `src/lib/video-upload.ts`

**Step 1: Create client-side upload utility**

This handles the two-step flow: (1) get signed URL from our API, (2) upload file to Supabase.

```typescript
export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface UploadResult {
  videoFileId: string;
  publicUrl: string;
  filename: string;
}

export async function uploadVideo(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  // Step 1: Get signed upload URL from our API
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

  const { videoFile, signedUrl, token } = await initRes.json();

  // Step 2: Upload file to Supabase using XMLHttpRequest for progress tracking
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
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    // Supabase signed upload uses PUT with the token
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
```

**Step 2: Commit**

```bash
git add src/lib/video-upload.ts
git commit -m "feat: add client-side video upload helper with progress tracking"
```

---

### Task 4: VideoManager Admin Component

**Files:**
- Create: `src/app/(admin)/admin/_components/VideoManager.tsx`

**Step 1: Create the VideoManager component**

This is the main UI component that replaces the URL text field. It has three states:
- **Selected video** — shows the current video with a "Change" button
- **Library** — grid of previously uploaded videos to pick from
- **Upload** — drag-and-drop zone with progress bar

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { VideoFile } from '@/lib/types';
import { uploadVideo, UploadProgress, formatFileSize } from '@/lib/video-upload';

interface VideoManagerProps {
  value: string;             // current videoUrl
  onChange: (url: string) => void;
}

export default function VideoManager({ value, onChange }: VideoManagerProps) {
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'selected' | 'library'>('selected');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/videos');
      if (res.ok) {
        const data = await res.json();
        setVideos(data.filter((v: VideoFile) => v.status === 'ready'));
      }
    } catch {
      console.error('Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('请上传视频文件 (MP4, MOV, WebM)');
      return;
    }

    // 5GB limit
    if (file.size > 5 * 1024 * 1024 * 1024) {
      setError('文件大小不能超过 5GB');
      return;
    }

    setError('');
    setUploading(true);
    setUploadProgress({ loaded: 0, total: file.size, percent: 0 });

    try {
      const result = await uploadVideo(file, setUploadProgress);
      onChange(result.publicUrl);
      await fetchVideos();
      setView('selected');
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id: string, force = false) => {
    try {
      const headers: Record<string, string> = {};
      if (force) headers['x-force-delete'] = 'true';

      const res = await fetch(`/api/admin/videos/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.status === 409) {
        const data = await res.json();
        setDeleteConfirm(id);
        setError(`此视频正在被「${data.webinarTitle}」使用`);
        return;
      }

      if (!res.ok) throw new Error('删除失败');

      // If deleted video was selected, clear selection
      const deleted = videos.find(v => v.id === id);
      if (deleted && value === deleted.publicUrl) {
        onChange('');
      }

      setDeleteConfirm(null);
      setError('');
      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const selectedVideo = videos.find(v => v.publicUrl === value);

  // ---- Selected View (default) ----
  if (view === 'selected' && !uploading) {
    return (
      <div>
        <label className="block text-sm text-neutral-500 mb-2">视频文件 *</label>

        {selectedVideo ? (
          <div className="border border-neutral-300 rounded-lg p-4 bg-[#F5F5F0]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-[#B8953F]/10 rounded flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#B8953F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{selectedVideo.filename}</p>
                  <p className="text-xs text-neutral-400">{formatFileSize(selectedVideo.fileSize)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setView('library')}
                className="text-[#B8953F] text-sm hover:text-[#A07A2F] shrink-0 ml-3"
              >
                更换视频
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${dragOver ? 'border-[#B8953F] bg-[#B8953F]/5' : 'border-neutral-300 hover:border-neutral-400'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-10 h-10 text-neutral-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-neutral-500 mb-1">拖拽视频文件到此处，或点击上传</p>
            <p className="text-xs text-neutral-400">支持 MP4, MOV, WebM（最大 5GB）</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {!selectedVideo && videos.length > 0 && (
          <button
            type="button"
            onClick={() => setView('library')}
            className="text-[#B8953F] text-sm hover:text-[#A07A2F] mt-2"
          >
            从视频库选择已上传的视频
          </button>
        )}

        {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
      </div>
    );
  }

  // ---- Library View ----
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm text-neutral-500">视频库</label>
        <button
          type="button"
          onClick={() => { setView('selected'); setError(''); setDeleteConfirm(null); }}
          className="text-sm text-neutral-400 hover:text-neutral-600"
        >
          返回
        </button>
      </div>

      {/* Upload zone (compact in library view) */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mb-4
          ${uploading ? 'pointer-events-none' : ''}
          ${dragOver ? 'border-[#B8953F] bg-[#B8953F]/5' : 'border-neutral-300 hover:border-neutral-400'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading && uploadProgress ? (
          <div>
            <p className="text-sm text-neutral-600 mb-2">
              上传中... {uploadProgress.percent}% ({formatFileSize(uploadProgress.loaded)} / {formatFileSize(uploadProgress.total)})
            </p>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className="bg-[#B8953F] h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">拖拽或点击上传新视频</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Video list */}
      {loading ? (
        <p className="text-sm text-neutral-400 text-center py-4">加载中...</p>
      ) : videos.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-4">暂无视频，请上传</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {videos.map((video) => (
            <div
              key={video.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${value === video.publicUrl
                  ? 'border-[#B8953F] bg-[#B8953F]/5'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              onClick={() => {
                onChange(video.publicUrl);
                setView('selected');
                setError('');
              }}
            >
              <div className="w-8 h-8 bg-neutral-100 rounded flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">{video.filename}</p>
                <p className="text-xs text-neutral-400">
                  {formatFileSize(video.fileSize)} · {new Date(video.uploadedAt).toLocaleDateString('zh-CN')}
                </p>
              </div>
              {value === video.publicUrl && (
                <span className="text-[#B8953F] text-xs font-medium shrink-0">当前</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (deleteConfirm === video.id) {
                    handleDelete(video.id, true);
                  } else {
                    handleDelete(video.id);
                  }
                }}
                className="text-neutral-300 hover:text-red-400 shrink-0 transition-colors"
                title="删除"
              >
                {deleteConfirm === video.id ? (
                  <span className="text-red-400 text-xs">确认删除</span>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(admin)/admin/_components/VideoManager.tsx
git commit -m "feat: add VideoManager component with drag-drop upload and library"
```

---

### Task 5: Integrate VideoManager into WebinarForm

**Files:**
- Modify: `src/app/(admin)/admin/_components/WebinarForm.tsx`

**Step 1: Replace the video URL input with VideoManager**

At the top of the file, add the import:
```typescript
import VideoManager from './VideoManager';
```

Replace lines 178-191 (the video URL `<div>` block) with:
```tsx
<div className="md:col-span-2">
  <VideoManager
    value={formData.videoUrl}
    onChange={(url) => setFormData({ ...formData, videoUrl: url })}
  />
</div>
```

**Step 2: Remove `required` from the form submit validation if needed**

The `videoUrl` is still in formData and gets submitted normally. The VideoManager sets it via `onChange`. No changes needed to the submit handler — it already sends `formData.videoUrl` in the payload.

**Step 3: Verify form still works**

Run: `npm run dev`
Navigate to: `http://localhost:3000/admin`
- Create or edit a webinar
- Verify the VideoManager appears in the "基本信息" section
- Verify form submission still works

**Step 4: Commit**

```bash
git add src/app/(admin)/admin/_components/WebinarForm.tsx
git commit -m "feat: integrate VideoManager into WebinarForm, replace URL text field"
```

---

### Task 6: Clean Up YouTube Code Paths in VideoPlayer

**Files:**
- Modify: `src/components/video/VideoPlayer.tsx`
- Modify: `src/lib/utils.ts`

**Step 1: Remove YouTube-specific code from VideoPlayer**

In `VideoPlayer.tsx`:
- Remove the `isYouTubeUrl()` check and YouTube tech configuration
- Remove the `videojs-youtube` plugin import/usage
- Keep the HLS and MP4 detection (HLS is useful for future optimization)

The player should only handle direct video URLs (MP4, HLS) going forward.

**Step 2: Remove YouTube utility from utils.ts**

Remove the `isYouTubeUrl()` function. Keep `getVideoSourceType()` but remove the YouTube case.

**Step 3: Verify no other files reference YouTube utilities**

Search for `isYouTubeUrl` and `video/youtube` across the codebase to ensure nothing else depends on them.

**Step 4: Test playback**

Run: `npm run dev`
- Set a webinar's videoUrl to a direct MP4 link (from Supabase or any public URL)
- Verify playback works in the live room
- Verify DVR seek-limiting still works

**Step 5: Commit**

```bash
git add src/components/video/VideoPlayer.tsx src/lib/utils.ts
git commit -m "refactor: remove YouTube code paths from VideoPlayer, keep MP4/HLS only"
```

---

### Task 7: Update Documentation

**Files:**
- Modify: `docs/architecture.md` (add Video Library section)
- Modify: `docs/decisions.md` (record the decision)

**Step 1: Update architecture.md**

Add a "Video Storage" section documenting:
- Supabase Storage bucket `webinar-videos`
- Upload flow (signed URL → client upload → status update)
- VideoFile metadata in `data/video-files.json`
- New API routes under `/api/admin/videos/`

**Step 2: Append to decisions.md**

```markdown
## 2026-03-11: Supabase Storage for video hosting

**Decision:** Use Supabase Storage instead of YouTube embeds for video delivery.
**Why:** YouTube branding (logo, watermark, suggested videos) breaks the pseudo-live illusion.
Supabase is already in the stack, supports resumable uploads for large files (up to 5GB), and serves via CDN.
Admin panel gets drag-and-drop upload with a video library for easy switching.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: add video library architecture and decision record"
```

---

## Task Dependency Graph

```
T1 (types + DB) → T2 (API routes) → T3 (upload helper) → T4 (VideoManager UI) → T5 (form integration) → T6 (remove YouTube) → T7 (docs)
```

All tasks are sequential — each builds on the previous.

## Verification Checklist

After all tasks:
- [ ] Can drag-and-drop a video file in admin and see upload progress
- [ ] Uploaded video appears in video library
- [ ] Can click a video in library to select it for a webinar
- [ ] Can switch to a different video by clicking "更换视频"
- [ ] Can delete a video from library (with in-use warning)
- [ ] Video plays in live room without YouTube branding
- [ ] DVR seek-limiting still works
- [ ] `npm run build` passes
