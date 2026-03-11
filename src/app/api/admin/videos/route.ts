import { NextRequest, NextResponse } from 'next/server';
import { getVideoFiles, createVideoFile } from '@/lib/db';
import { getR2Client, getR2BucketName, getR2PublicUrl } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = 'webinar-videos';

// GET /api/admin/videos — list all videos
export async function GET() {
  const files = await getVideoFiles();
  return NextResponse.json(files);
}

// POST /api/admin/videos — create metadata + return R2 presigned upload URL
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { filename, fileSize } = body;

  if (!filename || !fileSize) {
    return NextResponse.json({ error: 'filename and fileSize required' }, { status: 400 });
  }

  // Generate unique storage path
  const ext = filename.split('.').pop() || 'mp4';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Get public URL from R2
  const publicUrl = getR2PublicUrl(storagePath);

  // Create metadata record with status 'uploading'
  const videoFile = await createVideoFile({
    filename,
    storagePath,
    publicUrl,
    fileSize,
    status: 'uploading',
  });

  // Generate presigned PUT URL for direct browser upload to R2
  const r2 = getR2Client();
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: storagePath,
    ContentType: `video/${ext === 'mp4' ? 'mp4' : ext}`,
  });
  const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

  return NextResponse.json({
    videoFile,
    presignedUrl,
  });
}
