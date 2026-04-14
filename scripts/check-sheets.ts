/**
 * List all sheet tabs in the activation code spreadsheet
 * Run via next: npx tsx scripts/check-sheets.ts
 */

import { google } from 'googleapis';

const SPREADSHEET_ID = '1W9tK97n004XI7UbN_VuECcb_ZVVWmwa31sWRadBxZOQ';

async function main() {
  // Read the .env.local file and extract GOOGLE_SERVICE_ACCOUNT_KEY properly
  const { readFileSync } = await import('fs');
  const envContent = readFileSync('.env.local', 'utf-8');

  // Find the GOOGLE_SERVICE_ACCOUNT_KEY line — it may span multiple lines if JSON is multiline
  // But typically it's a single line with JSON wrapped in single quotes
  const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_KEY='?(\{[\s\S]*?\})'?/);
  if (!match) {
    console.log('Could not find GOOGLE_SERVICE_ACCOUNT_KEY in .env.local');
    return;
  }

  const keyJson = match[1];
  const credentials = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const res = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });

  const sheetTabs = res.data.sheets?.map(s => ({
    title: s.properties?.title,
    index: s.properties?.index,
    rowCount: s.properties?.gridProperties?.rowCount,
  }));

  console.log('Sheet tabs:');
  for (const tab of sheetTabs || []) {
    console.log(`  [${tab.index}] ${tab.title} (${tab.rowCount} rows)`);
  }
}

main().catch(console.error);
