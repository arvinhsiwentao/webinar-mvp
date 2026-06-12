/**
 * Read-only check of the us-stock redemption-code sheets.
 * Reports how many UNUSED codes are available in each tab.
 * Run: npx tsx scripts/check-us-stock-codes.ts
 */
import { loadEnvConfig } from '@next/env';
import { google } from 'googleapis';

// Load .env.local exactly like Next does (handles the multi-line service-account JSON).
loadEnvConfig(process.cwd());

const SPREADSHEET_ID = '1W9tK97n004XI7UbN_VuECcb_ZVVWmwa31sWRadBxZOQ';
const TABS = ['掘金1+3_課程序號', '掘金1+3_App序號'];

async function main() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) { console.error('GOOGLE_SERVICE_ACCOUNT_KEY not set'); process.exit(1); }
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(keyJson),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  for (const tab of TABS) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tab}!A:E`,
      });
      const rows = res.data.values ?? [];
      let total = 0, available = 0;
      for (let i = 1; i < rows.length; i++) {
        const code = (rows[i][0] ?? '').toString().trim();
        if (!code) continue;
        total++;
        const used = (rows[i][1] ?? '').toString().trim().toUpperCase();
        if (used === '' || used === 'FALSE') available++;
      }
      console.log(`✓ "${tab}": ${available} unused / ${total} total`);
    } catch (e) {
      console.error(`✗ "${tab}": ${(e as Error).message.split('\n')[0]}`);
    }
  }
}

main().catch((e) => { console.error('Error:', e.message || e); process.exit(1); });
