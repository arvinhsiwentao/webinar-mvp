import { NextRequest, NextResponse } from 'next/server';
import { getMuxClient, getMuxPlaybackUrl } from '@/lib/mux';
import { getVideoFiles, createVideoFile } from '@/lib/db';

// POST /api/admin/videos/import — import an existing Mux asset into video_files
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
  const { assetId } = body;

  if (!assetId || typeof assetId !== 'string') {
    return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
  }

  // Check for duplicate import
  const existing = await getVideoFiles();
  if (existing.some(v => v.muxAssetId === assetId)) {
    return NextResponse.json(
      { error: '该视频已导入' },
      { status: 409 }
    );
  }

  try {
    const mux = getMuxClient();
    const asset = await mux.video.assets.retrieve(assetId);

    const publicPlayback = asset.playback_ids?.find(p => p.policy === 'public');
    if (!publicPlayback) {
      return NextResponse.json(
        { error: '该资源没有公开播放权限，无法导入' },
        { status: 422 }
      );
    }

    const playbackId = publicPlayback.id;

    const videoFile = await createVideoFile({
      filename: asset.passthrough || assetId,
      fileSize: 0,
      status: 'ready',
      muxAssetId: assetId,
      muxPlaybackId: playbackId,
      muxPlaybackUrl: getMuxPlaybackUrl(playbackId),
      ...(asset.duration != null && { durationSec: asset.duration }),
    });

    return NextResponse.json(videoFile, { status: 201 });
  } catch (err) {
    console.error('Failed to import Mux asset:', err);
    return NextResponse.json(
      { error: '无法连接 Mux，请稍后重试' },
      { status: 502 }
    );
  }
}
