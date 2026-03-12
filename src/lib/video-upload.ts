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

    if (onProgress && data.status === 'processing') {
      onProgress({ loaded: 0, total: 0, percent: -1 });
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
