import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf-8');
const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_KEY='?(\{[\s\S]*?\})'?/);
if (match) process.env.GOOGLE_SERVICE_ACCOUNT_KEY = match[1];

import { google } from 'googleapis';

const SPREADSHEET_ID = '1W9tK97n004XI7UbN_VuECcb_ZVVWmwa31sWRadBxZOQ';
const SHEETS = ['工作表1', '期權+App(月)', '期權+ETF+App(月)', 'App(季)'];

async function main() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  for (const tab of SHEETS) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab}!A:E`,
    });
    const rows = res.data.values || [];
    console.log(`\n=== ${tab} (${rows.length} rows) ===`);
    rows.forEach((row, i) => {
      console.log(`  [${i}] ${(row[0] || '').toString().substring(0, 20).padEnd(20)} | used=${row[1] || ''}`);
    });
  }
}

main().catch(console.error);
