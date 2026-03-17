import { google } from 'googleapis';
import { Order } from './types';

const SPREADSHEET_ID = '1W9tK97n004XI7UbN_VuECcb_ZVVWmwa31sWRadBxZOQ';
const SHEET_RANGE = 'A:E';
const MAX_RETRIES = 3;

const ORDERS_SPREADSHEET_ID = '1sba5HDJav8aUO5L59-JmkeV2QXp8F6gpR4PUOLXMqD8';
const ORDERS_SHEET_RANGE = 'Orders!A:K';

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;

  const credentials = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Claim an activation code from a Google Sheet.
 * Finds the first unused row, marks it as used with order details, and returns the code.
 *
 * Throws if GOOGLE_SERVICE_ACCOUNT_KEY is not configured.
 */
export async function claimActivationCode(
  orderId: string,
  orderEmail: string
): Promise<string> {
  const auth = getAuth();

  if (!auth) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not configured — cannot claim activation code'
    );
  }

  const sheets = google.sheets({ version: 'v4', auth });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // 1. Read all rows
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      throw new Error('No activation codes available');
    }

    // 2. Find first row where column B (is_used) is FALSE or empty
    //    Row 0 is likely a header row, so start from index 1
    let targetRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const isUsed = (rows[i][1] ?? '').toString().trim().toUpperCase();
      if (isUsed === '' || isUsed === 'FALSE') {
        targetRowIndex = i;
        break;
      }
    }

    if (targetRowIndex === -1) {
      throw new Error('No activation codes available');
    }

    const code = rows[targetRowIndex][0] as string;
    // Sheet rows are 1-indexed (row 0 in array = row 1 in sheet)
    const sheetRow = targetRowIndex + 1;
    const today = formatDate(new Date());

    // 3. Write: mark as used with order details (columns B-E)
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `B${sheetRow}:E${sheetRow}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['TRUE', orderId, orderEmail, today]],
      },
    });

    // 4. Race condition check: re-read the row and verify our orderId persisted
    const verifyRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `A${sheetRow}:E${sheetRow}`,
    });

    const verifiedRow = verifyRes.data.values?.[0];
    if (verifiedRow && verifiedRow[2] === orderId) {
      // Our write won — return the code
      return code;
    }

    // Another process claimed this row; retry with next available
    console.warn(
      `[google-sheets] Race condition on row ${sheetRow}, attempt ${attempt}/${MAX_RETRIES} — retrying`
    );
  }

  throw new Error(
    'Failed to claim activation code after maximum retries (race condition)'
  );
}

/** Format a Date as yyyy/mm/dd */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
}

/**
 * Sync all orders to a Google Sheet.
 * Clears existing data (except header) and writes fresh rows.
 * Returns the number of rows written.
 */
export async function syncOrdersToSheet(
  orders: Order[]
): Promise<number> {
  const auth = getAuth();
  if (!auth) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not configured — cannot sync orders'
    );
  }

  const spreadsheetId = ORDERS_SPREADSHEET_ID;

  const sheets = google.sheets({ version: 'v4', auth });

  // Header row
  const header = [
    'ID', 'Webinar ID', 'Email', 'Name', 'Status',
    'Amount', 'Currency', 'Activation Code',
    'Created At', 'Paid At', 'Fulfilled At',
  ];

  // Map orders to row arrays
  const dataRows = orders.map(order => [
    order.id,
    order.webinarId,
    order.email,
    order.name,
    order.status,
    order.amount,
    order.currency,
    order.activationCode ?? '',
    order.createdAt,
    order.paidAt ?? '',
    order.fulfilledAt ?? '',
  ]);

  const allRows = [header, ...dataRows];

  // Clear existing data in the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: ORDERS_SHEET_RANGE,
  });

  // Write all rows
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: ORDERS_SHEET_RANGE,
    valueInputOption: 'RAW',
    requestBody: {
      values: allRows,
    },
  });

  return dataRows.length;
}
