import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, postWebinarEmail } from '@/lib/email';
import { audit, hasPostWebinarEmailSent } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webinarId } = await params;

  let body: { email?: string; name?: string; checkoutUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { email, name, checkoutUrl } = body;
  if (!email || !checkoutUrl) {
    return NextResponse.json({ error: 'email and checkoutUrl are required' }, { status: 400 });
  }

  // Dedup: skip if already sent for this webinar + email
  const alreadySent = await hasPostWebinarEmailSent(webinarId, email);
  if (alreadySent) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Mark as sent first to prevent race condition from simultaneous CTA + end page triggers
  audit({ type: 'post_webinar_email_sent', email, webinarId });

  const emailData = postWebinarEmail(email, name || '', checkoutUrl);
  sendEmail(emailData); // fire and forget

  return NextResponse.json({ ok: true });
}
