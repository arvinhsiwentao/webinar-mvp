import { readFileSync } from 'fs';
const envContent = readFileSync('.env.local', 'utf-8');
const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_KEY='?(\{[\s\S]*?\})'?/);
if (match) process.env.GOOGLE_SERVICE_ACCOUNT_KEY = match[1];

import { google } from 'googleapis';

const SPREADSHEET_ID = '1W9tK97n004XI7UbN_VuECcb_ZVVWmwa31sWRadBxZOQ';

async function main() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!);
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `期權+ETF+App(月)!A1:E5`,
  });
  const rows = res.data.values || [];
  for (const row of rows) {
    console.log(row.join(' | '));
  }
}
main().catch(console.error);
