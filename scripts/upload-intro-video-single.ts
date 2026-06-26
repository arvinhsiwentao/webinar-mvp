/**
 * One-off: upload a single hook video from Google Drive to Mux and print its playback ID.
 * Run: npx tsx scripts/upload-intro-video-single.ts
 * Pattern copied from upload-intro-videos-to-mux.ts.
 */

import { readFileSync } from 'fs';
import Mux from '@mux/mux-node';

const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1 || line.startsWith('#')) continue;
  const key = line.slice(0, eqIdx).trim();
  const val = line.slice(eqIdx + 1).trim();
  if (key && !key.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY')) {
    process.env[key] = val;
  }
}

const FILE_ID = '1taF9X_LTCJZ1MfEYdO6-o7TVdpLZM8qe';
const driveUrl = `https://drive.usercontent.google.com/download?id=${FILE_ID}&export=download&authuser=0&confirm=t`;

async function main() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    console.error('MUX_TOKEN_ID / MUX_TOKEN_SECRET not set');
    process.exit(1);
  }
  const mux = new Mux({ tokenId, tokenSecret });

  console.log(`[create] ${driveUrl}`);
  const asset = await mux.video.assets.create({
    inputs: [{ url: driveUrl }],
    playback_policy: ['public'],
    encoding_tier: 'baseline',
  });
  console.log(`  asset ${asset.id} (${asset.status})`);

  console.log(`\n[wait] polling until ready...`);
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const a = await mux.video.assets.retrieve(asset.id);
    if (a.status === 'ready') {
      const playbackId = a.playback_ids?.[0]?.id ?? '';
      console.log(`\n========== READY ==========`);
      console.log(`assetId:    ${asset.id}`);
      console.log(`playbackId: ${playbackId}`);
      console.log(`duration:   ${a.duration?.toFixed(1)}s`);
      console.log(`\nHLS URL:    https://stream.mux.com/${playbackId}.m3u8`);
      console.log(`Poster:     https://image.mux.com/${playbackId}/thumbnail.webp?time=2`);
      return;
    } else if (a.status === 'errored') {
      console.error(`ERRORED:`, JSON.stringify(a.errors, null, 2));
      return;
    } else {
      console.log(`  [${i + 1}] ${a.status}`);
    }
  }
  console.log(`⚠ timed out — check Mux dashboard for asset ${asset.id}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
