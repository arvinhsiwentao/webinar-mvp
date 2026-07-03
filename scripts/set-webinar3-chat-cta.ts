/**
 * 把 Webinar 3 (HeyGen) 的 autoChat + ctaEvents 設成「4/14 commit 版本」為基底：
 *  - autoChat：scripts/autochat-v2.json 的 114 筆（每筆補 UUID）
 *  - ctaEvents：同檔的 2 個 CTA（on_video + below_video），showAtSec 都設 1968（32:48，使用者指定）
 * 只改 Webinar 3（dbdf8b45），不動 Webinar 1。使用者之後會再去後台微調。
 *
 * Run: npx tsx scripts/set-webinar3-chat-cta.ts
 */
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// --- Load env ---
for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
  const i = line.indexOf('=');
  if (i === -1 || line.startsWith('#')) continue;
  const k = line.slice(0, i).trim();
  if (k && !k.startsWith('GOOGLE_SERVICE_ACCOUNT_KEY')) process.env[k] = line.slice(i + 1).trim();
}

const WEBINAR_3 = 'dbdf8b45-5f80-47d3-82c0-4a10a184dee4';
const CTA_SHOW_AT_SEC = 1968; // 32:48

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const seed = JSON.parse(readFileSync('scripts/autochat-v2.json', 'utf-8')) as {
    autoChat: { timeSec: number; name: string; message: string }[];
    ctaEvents: Record<string, unknown>[];
  };

  const autoChat = seed.autoChat.map((m) => ({
    id: randomUUID(), timeSec: m.timeSec, name: m.name, message: m.message,
  }));

  const ctaEvents = seed.ctaEvents.map((c) => ({
    ...c, id: randomUUID(), showAtSec: CTA_SHOW_AT_SEC,
  }));

  console.log(`即將寫入 Webinar 3：autoChat ${autoChat.length} 筆、ctaEvents ${ctaEvents.length} 個（showAtSec=${CTA_SHOW_AT_SEC}）`);

  const { data, error } = await supabase
    .from('webinars')
    .update({ auto_chat: autoChat, cta_events: ctaEvents })
    .eq('id', WEBINAR_3)
    .select('id, title')
    .single();
  if (error) throw error;

  console.log(`✅ 已更新 ${data.id}（${data.title}）`);
  console.log(`   CTA 出現時間：${Math.floor(CTA_SHOW_AT_SEC / 60)}:${String(CTA_SHOW_AT_SEC % 60).padStart(2, '0')}`);
  console.log('   留言與 CTA 皆可到後台 /admin 再微調。');
}

main().catch((e) => { console.error('❌ 失敗：', e); process.exit(1); });
