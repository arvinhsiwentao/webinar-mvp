import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';

// 一次性 Google ID token 驗證 — 用於報名 modal 的「快速填寫」功能。
// 驗完即丟，不發 cookie、不寫 DB、不建 session。
// 真正的報名仍走 /api/register。

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

let client: OAuth2Client | null = null;
function getClient(): OAuth2Client {
  if (!client) client = new OAuth2Client(CLIENT_ID);
  return client;
}

export async function POST(request: NextRequest) {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 503 });
  }

  try {
    const { credential } = await request.json();
    if (!credential || typeof credential !== 'string') {
      return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
    }

    const ticket = await getClient().verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    return NextResponse.json({
      email: payload.email,
      name: payload.name || payload.given_name || '',
      emailVerified: payload.email_verified === true,
    });
  } catch (err) {
    console.error('[google-verify] verification failed:', err);
    return NextResponse.json({ error: 'Token verification failed' }, { status: 401 });
  }
}
