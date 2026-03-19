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
  maxAttempts = 2400,
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
