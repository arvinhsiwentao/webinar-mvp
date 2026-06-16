/**
 * Create a Mux asset for the us-stock-course PHONE activation tutorial video,
 * pulled directly from its public Google Drive download URL.
 * Run: npx tsx scripts/upload-tutorial-phone-to-mux.ts
 *
 * Pattern copied from scripts/upload-intro-videos-to-mux.ts (proven Drive→Mux flow).
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

const FILE_ID = '19oopdaR34fmaV24aIribcBWpB7KeZK4P';
const driveUrl = (id: string) =>
  `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0&confirm=t`;

async function main() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) {
    console.error('MUX_TOKEN_ID / MUX_TOKEN_SECRET not set');
    process.exit(1);
  }
  const mux = new Mux({ tokenId, tokenSecret });

  console.log(`[create] phone tutorial ← ${driveUrl(FILE_ID)}`);
  const asset = await mux.video.assets.create({
    inputs: [{ url: driveUrl(FILE_ID) }],
    playback_policy: ['public'],
    encoding_tier: 'baseline',
  });
  console.log(`  asset ${asset.id} (${asset.status})`);

  let done = false;
  for (let i = 0; i < 120 && !done; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const a = await mux.video.assets.retrieve(asset.id);
    if (a.status === 'ready') {
      const playbackId = a.playback_ids?.[0]?.id ?? '';
      console.log(`\n✓ READY`);
      console.log(`HLS: https://stream.mux.com/${playbackId}.m3u8`);
      console.log(`poster: https://image.mux.com/${playbackId}/thumbnail.webp?time=1`);
      console.log(`duration: ${a.duration?.toFixed(1)}s`);
      done = true;
    } else if (a.status === 'errored') {
      console.error(`\n✗ ERRORED:`, JSON.stringify(a.errors, null, 2));
      done = true;
    } else {
      console.log(`  [${i + 1}] ${a.status}`);
    }
  }
  if (!done) console.log('⚠ timed out — check Mux dashboard');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
