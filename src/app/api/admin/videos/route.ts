import { NextRequest, NextResponse } from 'next/server';
import { getVideoFiles, createVideoFile } from '@/lib/db';
import { supabase } from '@/lib/supabase';

const BUCKET = 'webinar-videos';

// GET /api/admin/videos — list all videos
export async function GET() {
  const files = await getVideoFiles();
  return NextResponse.json(files);
}

// POST /api/admin/videos — create metadata + return signed upload URL
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { filename, fileSize } = body;

  if (!filename || !fileSize) {
    return NextResponse.json({ error: 'filename and fileSize required' }, { status: 400 });
  }

  // Generate unique storage path
  const ext = filename.split('.').pop() || 'mp4';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  // Create metadata record with status 'uploading'
  const videoFile = await createVideoFile({
    filename,
    storagePath,
    publicUrl,
    fileSize,
    status: 'uploading',
  });

  // Create signed upload URL for client-side upload
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  return NextResponse.json({
    videoFile,
    signedUrl: uploadData.signedUrl,
    token: uploadData.token,
    path: uploadData.path,
  });
}
