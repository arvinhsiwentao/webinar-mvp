import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/db';
import { syncOrdersToSheet } from '@/lib/google-sheets';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const orders = await getAllOrders();
    const synced = await syncOrdersToSheet(orders);

    console.log(`[orders-sync] Synced ${synced} orders to Google Sheets`);
    return NextResponse.json({ synced });
  } catch (error) {
    console.error('[orders-sync] Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
