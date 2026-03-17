// src/lib/cron-auth.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that a cron request carries a valid Bearer token matching CRON_SECRET.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron-auth] CRON_SECRET env var is not configured');
    return NextResponse.json(
      { error: 'Cron secret not configured' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // valid
}
