/**
 * Create Mux assets for the us-stock-course trailer videos (Ch0, Ch1) from Google Drive.
 * Run: npx tsx scripts/upload-trailers-to-mux.ts
 * Pattern from scripts/upload-intro-videos-to-mux.ts.
 */

import { readFileSync } from 'fs';
import Mux from '@mux/mux-node';

const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1 || line.startsWith('#')) continue;
  const key = line.slice(0, eqIdx).trim();
  const val = line.slice(eqIdx + 1).trim();
  if (key && !key.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY')) process.env[key] = val;
}

const VIDEOS: { name: string; fileId: string }[] = [
  { name: 'ch0', fileId: '1VmeuAtlRfnwcPL7Lxv_QQPUq18fx6C8s' },
  { name: 'ch1', fileId: '1k4SfNcaYh-hZJXjscqRUCxrIKRiQkoQC' },
];

const driveUrl = (id: string) =>
  `https://drive.usercontent.google.com/download?id=${id}&export=download&authuser=0&confirm=t`;

async function main() {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;
  if (!tokenId || !tokenSecret) { console.error('MUX creds missing'); process.exit(1); }
  const mux = new Mux({ tokenId, tokenSecret });

  const created: { name: string; assetId: string }[] = [];
  for (const v of VIDEOS) {
    console.log(`[create] ${v.name}`);
    const asset = await mux.video.assets.create({
      inputs: [{ url: driveUrl(v.fileId) }],
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    });
    console.log(`  ${v.name}: asset ${asset.id} (${asset.status})`);
    created.push({ name: v.name, assetId: asset.id });
  }

  const results: Record<string, string> = {};
  for (const c of created) {
    console.log(`\n[wait] ${c.name} (${c.assetId})...`);
    let done = false;
    for (let i = 0; i < 120 && !done; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const a = await mux.video.assets.retrieve(c.assetId);
      if (a.status === 'ready') {
        results[c.name] = a.playback_ids?.[0]?.id ?? '';
        console.log(`  ✓ ${c.name} READY playbackId=${results[c.name]} dur=${a.duration?.toFixed(1)}s`);
        done = true;
      } else if (a.status === 'errored') {
        console.error(`  ✗ ${c.name} ERRORED:`, JSON.stringify(a.errors));
        done = true;
      } else {
        console.log(`  [${i + 1}] ${c.name}: ${a.status}`);
      }
    }
  }

  console.log('\n========== RESULT ==========');
  for (const v of VIDEOS) {
    const pid = results[v.name];
    console.log(`${v.name}: ${pid ? `https://stream.mux.com/${pid}.m3u8  (thumb: https://image.mux.com/${pid}/thumbnail.webp)` : '(not ready)'}`);
  }
}

main().catch((err) => { console.error('Error:', err); process.exit(1); });
