import { NextRequest, NextResponse } from 'next/server';

async function validateAdminSession(cookie: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const [timestamp, providedHmac] = cookie.split(':');
  if (!timestamp || !providedHmac) return false;

  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > 86400000 || age < 0) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(adminPassword),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(timestamp));
  const expectedHmac = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedHmac === providedHmac;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Non-admin routes: set UTM cookies server-side (survives Safari ITP 7-day cap)
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'gclid'];
    const url = request.nextUrl;
    const hasUtm = utmKeys.some(key => url.searchParams.has(key));

    if (!hasUtm) return NextResponse.next();

    const response = NextResponse.next();
    const maxAge = 90 * 24 * 60 * 60; // 90 days

    for (const key of utmKeys) {
      const value = url.searchParams.get(key);
      if (value) {
        response.cookies.set(key, value, {
          path: '/',
          maxAge,
          sameSite: 'lax',
          httpOnly: false, // Client JS needs to read these
        });
      }
    }

    return response;
  }

  // Skip login endpoints
  if (pathname === '/admin/login' || pathname === '/api/admin/login') {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('admin_session')?.value;
  if (!cookie || !(await validateAdminSession(cookie))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',                    // Landing page (UTM params arrive here from ads)
    '/webinar/:path*',      // Lobby/live/end pages (UTM params arrive here from EDM links)
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
