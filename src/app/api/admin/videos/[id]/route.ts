import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile, deleteVideoFile, getAllWebinars } from '@/lib/db';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName } from '@/lib/r2';

// PATCH /api/admin/videos/[id] — update status to 'ready'
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

// DELETE /api/admin/videos/[id] — delete from storage + metadata
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
  const inUseBy = webinars.find(w => w.videoUrl === videoFile.publicUrl);

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

  // Delete from R2 Storage
  try {
    const r2 = getR2Client();
    await r2.send(new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: videoFile.storagePath,
    }));
  } catch (storageError) {
    console.error('Storage delete error:', storageError);
  }

  // Delete metadata
  await deleteVideoFile(id);

  return NextResponse.json({ success: true });
}
