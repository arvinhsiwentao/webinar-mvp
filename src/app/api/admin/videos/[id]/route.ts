import { NextRequest, NextResponse } from 'next/server';
import { getVideoFileById, updateVideoFile, deleteVideoFile, getAllWebinars } from '@/lib/db';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getR2BucketName } from '@/lib/r2';
import { createMuxAssetFromUrl, getMuxPlaybackUrl, deleteMuxAsset } from '@/lib/mux';

// PATCH /api/admin/videos/[id] — update status to 'ready'
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // When client signals R2 upload is complete, try to create a Mux asset
  if (body.status === 'ready') {
    const videoFile = await getVideoFileById(id);
    if (!videoFile) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const muxConfigured = process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET;

    if (muxConfigured) {
      // Set status to 'processing' while Mux ingests the video
      await updateVideoFile(id, { status: 'processing' });

      try {
        const { assetId, playbackId } = await createMuxAssetFromUrl(videoFile.publicUrl);
        const muxPlaybackUrl = getMuxPlaybackUrl(playbackId);

        const updated = await updateVideoFile(id, {
          status: 'processing', // stays processing until Mux webhook confirms ready
          muxAssetId: assetId,
          muxPlaybackId: playbackId,
          muxPlaybackUrl,
        });

        return NextResponse.json(updated);
      } catch (muxError) {
        console.error('Mux asset creation failed, falling back to R2-only:', muxError);
        // Fall back to 'ready' status (R2-only mode)
        const updated = await updateVideoFile(id, { status: 'ready' });
        return NextResponse.json(updated);
      }
    }
    // No Mux env vars — just mark as 'ready' normally (fall through)
  }

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

  // Check if video is in use by any webinar (match both R2 URL and Mux URL)
  const webinars = await getAllWebinars();
  const inUseBy = webinars.find(w =>
    w.videoUrl === videoFile.publicUrl ||
    (videoFile.muxPlaybackUrl && w.videoUrl === videoFile.muxPlaybackUrl)
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
