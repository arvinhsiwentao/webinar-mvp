import { NextRequest, NextResponse } from 'next/server';
import { getVideoFiles, createVideoFile } from '@/lib/db';
import { createMuxDirectUpload } from '@/lib/mux';

// GET /api/admin/videos — list all videos
export async function GET() {
  const files = await getVideoFiles();
  return NextResponse.json(files);
}

// POST /api/admin/videos — create metadata + Mux Direct Upload URL
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { filename, fileSize } = body;

  if (!filename || !fileSize) {
    return NextResponse.json({ error: 'filename and fileSize required' }, { status: 400 });
  }

  // Determine CORS origin from request
  const origin = request.headers.get('origin') || '*';

  // Create Mux Direct Upload URL
  const { uploadId, uploadUrl } = await createMuxDirectUpload({
    corsOrigin: origin,
  });

  // Create metadata record with status 'uploading'
  const videoFile = await createVideoFile({
    filename,
    fileSize,
    status: 'uploading',
    muxUploadId: uploadId,
  });

  return NextResponse.json({
    videoFile,
    uploadUrl,
  });
}
