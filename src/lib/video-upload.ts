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

  const { videoFile, signedUrl } = await initRes.json();

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

    // Supabase expects FormData with the file appended (not raw binary body)
    // This matches how @supabase/storage-js uploadToSignedUrl handles Blob/File
    const formData = new FormData();
    formData.append('cacheControl', '3600');
    formData.append('', file);

    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('x-upsert', 'false');
    // Do NOT set Content-Type — browser sets multipart/form-data with boundary automatically
    xhr.send(formData);
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
