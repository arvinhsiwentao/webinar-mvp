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
