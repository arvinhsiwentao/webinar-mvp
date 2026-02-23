import { NextRequest, NextResponse } from 'next/server';
import { appendEvent } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    appendEvent(event);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
