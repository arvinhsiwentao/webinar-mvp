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
  const [externalUrl, setExternalUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/videos');
      if (res.ok) {
        const data = await res.json();
        setVideos(data.filter((v: VideoFile) => v.status === 'ready' || v.status === 'processing'));
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

  // Auto-refresh when videos are processing (Mux transcoding)
  useEffect(() => {
    const hasProcessing = videos.some(v => v.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(async () => {
      for (const v of videos.filter(v => v.status === 'processing')) {
        try {
          const res = await fetch(`/api/admin/videos/${v.id}/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'ready' || data.status === 'error') {
              await fetchVideos();
              break;
            }
          }
        } catch { /* ignore polling errors */ }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [videos, fetchVideos]);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('请上传视频文件 (MP4, MOV, WebM)');
      return;
    }

    // 20GB limit
    if (file.size > 20 * 1024 * 1024 * 1024) {
      setError('文件大小不能超过 20GB');
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
      if (deleted && (value === deleted.muxPlaybackUrl || value === deleted.publicUrl)) {
        onChange('');
      }

      setDeleteConfirm(null);
      setError('');
      await fetchVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const selectedVideo = videos.find(v => v.publicUrl === value || v.muxPlaybackUrl === value);

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
            <p className="text-xs text-neutral-400">支持 MP4, MOV, WebM（最大 20GB）</p>
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
              {uploadProgress.percent === -2
                ? '⚠️ 网络已断开，上传暂停中... 恢复后将自动继续'
                : uploadProgress.percent === -3
                ? '网络已恢复，继续上传...'
                : uploadProgress.percent === -1
                ? '视频转码中，请稍候...'
                : `上传中... ${uploadProgress.percent}% (${formatFileSize(uploadProgress.loaded)} / ${formatFileSize(uploadProgress.total)})`
              }
            </p>
            <div className="w-full bg-neutral-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  uploadProgress.percent === -2 ? 'bg-amber-500' : 'bg-[#B8953F]'
                }`}
                style={{ width: `${Math.max(0, uploadProgress.percent)}%` }}
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
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${video.status === 'processing' ? 'cursor-wait opacity-60' : 'cursor-pointer'}
                ${(value === video.muxPlaybackUrl || value === video.publicUrl)
                  ? 'border-[#B8953F] bg-[#B8953F]/5'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
                }`}
              onClick={() => {
                if (video.status === 'processing') return;
                onChange(video.muxPlaybackUrl || video.publicUrl || '');
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
              {video.status === 'processing' ? (
                <span className="text-amber-500 text-xs font-medium shrink-0 flex items-center gap-1">
                  <span className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  转码中
                </span>
              ) : (value === video.publicUrl || value === video.muxPlaybackUrl) ? (
                <span className="text-[#B8953F] text-xs font-medium shrink-0">当前</span>
              ) : null}
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

      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
