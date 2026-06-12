/**
 * Create the invisible "container" webinar row that us-stock-course orders attach to.
 * Orders need a webinars FK; this row never appears in any URL or public listing.
 * Run once: npx tsx scripts/create-us-stock-container.ts
 */
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1 || line.startsWith('#')) continue;
  const key = line.slice(0, eqIdx).trim();
  let val = line.slice(eqIdx + 1).trim();
  // strip surrounding quotes if any
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (key) process.env[key] = val;
}

async function main() {
  const { createWebinar } = await import('../src/lib/db');
  const w = await createWebinar({
    title: '[容器] US$1 美股入门课 — us-stock-course 直购漏斗（请勿删除）',
    speakerName: 'Mike是麦克',
    videoUrl: '',
    duration: 0,
    highlights: [],
    autoChat: [],
    ctaEvents: [],
    status: 'draft',
  } as Parameters<typeof createWebinar>[0]);

  console.log('\n✓ Container webinar created.');
  console.log(`  id (UUID): ${w.id}`);
  console.log(`\nAdd to .env.local:`);
  console.log(`  US_STOCK_CONTAINER_WEBINAR_ID=${w.id}`);
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
