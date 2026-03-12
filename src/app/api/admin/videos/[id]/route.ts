import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile, deleteVideoFile, getAllWebinars } from '@/lib/db';
import { deleteMuxAsset } from '@/lib/mux';

// PATCH /api/admin/videos/[id] — update video metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const updated = await updateVideoFile(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/admin/videos/[id] — delete from Mux + metadata
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const videoFile = await getVideoFileById(id);
  if (!videoFile) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  // Check if video is in use by any webinar
  const webinars = await getAllWebinars();
  const inUseBy = webinars.find(w =>
    w.videoUrl === videoFile.muxPlaybackUrl
  );

  if (inUseBy) {
    const forceHeader = request.headers.get('x-force-delete');
    if (forceHeader !== 'true') {
      return NextResponse.json({
        error: 'in_use',
        webinarTitle: inUseBy.title,
        webinarId: inUseBy.id,
      }, { status: 409 });
    }
  }

  // Delete from Mux (if asset exists)
  if (videoFile.muxAssetId) {
    try {
      await deleteMuxAsset(videoFile.muxAssetId);
    } catch (muxError) {
      console.error('Mux asset delete error:', muxError);
    }
  }

  // Delete metadata from Supabase
  await deleteVideoFile(id);

  return NextResponse.json({ success: true });
}
