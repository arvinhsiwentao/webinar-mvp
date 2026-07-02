/**
 * Clone Webinar 1 (真人) → Webinar 3 (HeyGen AI 分身) for the A/B test.
 *
 * 完整複製 Webinar 1 的所有設定（ctaEvents / autoChat / evergreen / 講師 / 文案圖等），
 * 只覆蓋 video_url 為 HeyGen 影片。title 維持一致（使用者不該察覺差異）。
 * 以原始 snake_case row 複製，免大小寫轉換、也不牽動 db.ts 的 import 鏈。
 *
 * 冪等：若已存在同一 video_url 的 webinar，直接回報、不重複建立。
 *
 * Run: npx tsx scripts/clone-webinar.ts
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// --- Load env from .env.local (同 scripts/upload-to-mux.ts 樣式) ---
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

// --- Config ---
const SOURCE_WEBINAR_ID = '50ddbae7-c89b-406a-b0c3-afe154b3671c'; // Webinar 1 真人
const HEYGEN_VIDEO_URL = 'https://stream.mux.com/G8i4OAM7T00APJSp4eZcGfSt00f53v6P6rQNAY5ijZi01U.m3u8';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key);

  // 1. Idempotency guard — 已存在同 video_url 就不重複建
  const { data: existing, error: exErr } = await supabase
    .from('webinars')
    .select('id, title, created_at')
    .eq('video_url', HEYGEN_VIDEO_URL);
  if (exErr) throw exErr;
  if (existing && existing.length > 0) {
    console.log('⚠️  已存在使用該 HeyGen video_url 的 webinar，略過建立：');
    for (const w of existing) console.log(`   id=${w.id}  created=${w.created_at}  title=${w.title}`);
    console.log('\n若要重建，請先在 Supabase 刪除上述 record。');
    return;
  }

  // 2. Fetch Webinar 1 raw row (snake_case)
  const { data: src, error: srcErr } = await supabase
    .from('webinars')
    .select('*')
    .eq('id', SOURCE_WEBINAR_ID)
    .single();
  if (srcErr) throw srcErr;
  if (!src) throw new Error(`Source webinar ${SOURCE_WEBINAR_ID} not found`);

  console.log(`來源 Webinar 1：id=${src.id}  title=${src.title}`);
  console.log(`  原 video_url=${src.video_url}`);

  // 3. Build clone — 去掉 DB 自管欄位，覆蓋 video_url，其餘照抄
  const clone: Record<string, unknown> = { ...src };
  delete clone.id;
  delete clone.created_at;
  delete clone.updated_at;
  clone.video_url = HEYGEN_VIDEO_URL;

  // 4. Insert
  const { data: created, error: insErr } = await supabase
    .from('webinars')
    .insert(clone)
    .select('id, title, status, video_url, created_at')
    .single();
  if (insErr) throw insErr;

  console.log('\n✅ 已建立 Webinar 3 (HeyGen)：');
  console.log(`   UUID_3   = ${created.id}`);
  console.log(`   title    = ${created.title}`);
  console.log(`   status   = ${created.status}`);
  console.log(`   video    = ${created.video_url}`);
  console.log(`   created  = ${created.created_at}`);
  console.log('\n⬇️ 記下 UUID_3，之後 /free-webinar 用數字 "3"、儀表板映射用此 UUID。');
}

main().catch((err) => {
  console.error('❌ clone-webinar 失敗：', err);
  process.exit(1);
});
