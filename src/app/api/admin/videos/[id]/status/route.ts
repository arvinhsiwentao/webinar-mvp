import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile } from '@/lib/db';
import { getMuxAssetStatus, getMuxPlaybackUrl } from '@/lib/mux';
import type { VideoFile } from '@/lib/types';

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
      const playbackId = muxStatus.playbackId || videoFile.muxPlaybackId;
      const updates: Partial<VideoFile> = {
        status: 'ready',
      };
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
  } catch (err) {
    console.error('Mux status check error:', err);
    return NextResponse.json({ status: videoFile.status, videoFile });
  }
}
