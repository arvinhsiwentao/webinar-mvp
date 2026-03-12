import Mux from '@mux/mux-node';

let _mux: Mux | null = null;

export function getMuxClient(): Mux {
  if (!_mux) {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;
    if (!tokenId || !tokenSecret) {
      throw new Error('Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET env vars');
    }
    _mux = new Mux({ tokenId, tokenSecret });
  }
  return _mux;
}

export async function createMuxAssetFromUrl(videoUrl: string): Promise<{
  assetId: string;
  playbackId: string;
}> {
  const mux = getMuxClient();
  const asset = await mux.video.assets.create({
    inputs: [{ url: videoUrl }],
    playback_policies: ['public'],
    video_quality: 'basic',
  });

  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) {
    throw new Error('Mux asset created but no playback ID returned');
  }

  return {
    assetId: asset.id,
    playbackId,
  };
}

export function getMuxPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export async function getMuxAssetStatus(assetId: string): Promise<{
  status: string;
  playbackId?: string;
  duration?: number;
}> {
  const mux = getMuxClient();
  const asset = await mux.video.assets.retrieve(assetId);
  return {
    status: asset.status ?? 'preparing',
    playbackId: asset.playback_ids?.[0]?.id,
    duration: asset.duration,
  };
}

export async function deleteMuxAsset(assetId: string): Promise<void> {
  const mux = getMuxClient();
  try {
    await mux.video.assets.delete(assetId);
  } catch (err: unknown) {
    // 404 means the asset is already gone — treat as success
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      return;
    }
    throw err;
  }
}
