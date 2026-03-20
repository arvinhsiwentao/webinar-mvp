import { NextResponse } from 'next/server';
import { listMuxAssets } from '@/lib/mux';
import { getVideoFiles } from '@/lib/db';

// GET /api/admin/videos/mux-assets — list Mux assets available for import
export async function GET() {
  try {
    const [muxAssets, dbVideos] = await Promise.all([
      listMuxAssets(),
      getVideoFiles(),
    ]);

    // Exclude assets already imported into video_files
    const importedAssetIds = new Set(
      dbVideos
        .map(v => v.muxAssetId)
        .filter((id): id is string => !!id)
    );

    const available = muxAssets.filter(a => !importedAssetIds.has(a.assetId));

    return NextResponse.json({ assets: available });
  } catch (err) {
    console.error('Failed to list Mux assets:', err);
    return NextResponse.json(
      { error: '无法连接 Mux，请稍后重试' },
      { status: 502 }
    );
  }
}
