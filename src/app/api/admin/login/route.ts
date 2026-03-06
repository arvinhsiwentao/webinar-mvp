import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin password not configured' }, { status: 500 });
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  // Create HMAC-signed session token: timestamp:hmac
  const timestamp = Date.now().toString();
  const hmac = crypto.createHmac('sha256', adminPassword).update(timestamp).digest('hex');
  const token = `${timestamp}:${hmac}`;

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 86400, // 24 hours
  });

  return response;
}
