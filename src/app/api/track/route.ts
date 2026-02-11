import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    const dataDir = path.join(process.cwd(), 'data');
    const filepath = path.join(dataDir, 'events.json');

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    let events: unknown[] = [];
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      events = JSON.parse(content);
    } catch { /* file doesn't exist yet */ }

    events.push(event);
    fs.writeFileSync(filepath, JSON.stringify(events, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
