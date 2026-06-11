/**
 * Create Mux assets for the 3 us-stock-course intro hook videos from Google Drive.
 * Mux pulls each file directly from its public Drive download URL.
 * Run: npx tsx scripts/upload-intro-videos-to-mux.ts
 *
 * Pattern copied from scripts/upload-to-mux.ts (the proven Drive→Mux flow in this repo).
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

const VIDEOS: { angle: string; fileId: string }[] = [
  { angle: 'author', fileId: '14raIqoYFjHVvpr2s7eEyrwZ-Q176-Hil' },
  { angle: 'news', fileId: '1Yp323lB57aOJoXJKIsnRk5DOeePa0lOg' },
  { angle: 'feature', fileId: '1XTT8tUUShHaUb3L1RH6jvaOA-nVv5flV' },
];

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

  // 1) Create all 3 assets
  const created: { angle: string; assetId: string }[] = [];
  for (const v of VIDEOS) {
    console.log(`[create] ${v.angle} ← ${driveUrl(v.fileId)}`);
    const asset = await mux.video.assets.create({
      inputs: [{ url: driveUrl(v.fileId) }],
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    });
    console.log(`  ${v.angle}: asset ${asset.id} (${asset.status})`);
    created.push({ angle: v.angle, assetId: asset.id });
  }

  // 2) Poll each until ready
  const results: Record<string, string> = {};
  for (const c of created) {
    console.log(`\n[wait] ${c.angle} (${c.assetId})...`);
    let done = false;
    for (let i = 0; i < 120 && !done; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const a = await mux.video.assets.retrieve(c.assetId);
      if (a.status === 'ready') {
        const playbackId = a.playback_ids?.[0]?.id ?? '';
        results[c.angle] = playbackId;
        console.log(`  ✓ ${c.angle} READY — playbackId=${playbackId} dur=${a.duration?.toFixed(1)}s`);
        done = true;
      } else if (a.status === 'errored') {
        console.error(`  ✗ ${c.angle} ERRORED:`, JSON.stringify(a.errors, null, 2));
        done = true;
      } else {
        console.log(`  [${i + 1}] ${c.angle}: ${a.status}`);
      }
    }
    if (!done) console.log(`  ⚠ ${c.angle} timed out — check Mux dashboard`);
  }

  // 3) Print the ANGLE_CONFIG values to paste
  console.log('\n========== RESULT — paste into src/lib/usStockCourse.ts ==========');
  for (const v of VIDEOS) {
    const pid = results[v.angle];
    console.log(`${v.angle}: ${pid ? `https://stream.mux.com/${pid}.m3u8` : '(not ready — check dashboard)'}`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
