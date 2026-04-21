/**
 * Create Mux asset from Google Drive URL (Mux pulls directly from public URL)
 * Run: npx tsx scripts/upload-to-mux.ts
 */

import { readFileSync } from 'fs';
import Mux from '@mux/mux-node';

// Load env from .env.local
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

const FILE_ID = '1UKMzl_jWB7ItkFt-sx8ZwQJtrtNWBctf';
// New Google Drive endpoint that handles large file virus scan bypass
const VIDEO_URL = `https://drive.usercontent.google.com/download?id=${FILE_ID}&export=download&authuser=0&confirm=t`;

async function main() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    console.error('MUX_TOKEN_ID / MUX_TOKEN_SECRET not set');
    return;
  }

  const mux = new Mux({ tokenId, tokenSecret });

  console.log(`Source URL: ${VIDEO_URL}`);
  console.log('\n[1/2] Creating Mux asset from URL...');

  const asset = await mux.video.assets.create({
    inputs: [{ url: VIDEO_URL }],
    playback_policy: ['public'],
    encoding_tier: 'baseline',
  });
  console.log(`  Asset ID: ${asset.id}`);
  console.log(`  Status:   ${asset.status}`);

  console.log('\n[2/2] Waiting for Mux to download + transcode...');
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const a = await mux.video.assets.retrieve(asset.id);
    if (a.status === 'ready') {
      const playbackId = a.playback_ids?.[0]?.id;
      console.log(`\n✓ Ready!`);
      console.log(`  Asset ID:    ${a.id}`);
      console.log(`  Playback ID: ${playbackId}`);
      console.log(`  HLS URL:     https://stream.mux.com/${playbackId}.m3u8`);
      console.log(`  Duration:    ${a.duration?.toFixed(1)}s`);
      return;
    }
    if (a.status === 'errored') {
      console.error('\nAsset errored:', JSON.stringify(a.errors, null, 2));
      return;
    }
    console.log(`  [${i + 1}] Status: ${a.status}`);
  }
  console.log('\nTimeout. Check Mux dashboard.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
