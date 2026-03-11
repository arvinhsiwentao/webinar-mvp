import { S3Client } from '@aws-sdk/client-s3';

let _r2: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_r2) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing R2 env vars: CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    }
    _r2 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _r2;
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || 'webinar-videos';
}

export function getR2PublicUrl(storagePath: string): string {
  const baseUrl = process.env.R2_PUBLIC_URL;
  if (!baseUrl) {
    throw new Error('Missing R2_PUBLIC_URL env var');
  }
  return `${baseUrl}/${storagePath}`;
}
