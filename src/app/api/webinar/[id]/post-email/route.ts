import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, postWebinarEmail } from '@/lib/email';
import { audit, hasPostWebinarEmailSent } from '@/lib/audit';
import { recordPostWebinarRecipient } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webinarId } = await params;

  // TEMP gate：暫停 Webinar 1(真人)的 post-webinar EDM。
  // 原因：SLIDES_URL 是全站共用且目前指向 Webinar 3 的簡報，避免寄給 W1 觀眾錯的簡報。
  // W1 有自己的簡報後移除此 gate（或改為 per-webinar slidesUrl）。
  // 涵蓋 W1 的兩種 id 表示：數字別名 '1'（直接進）與 UUID（提醒信進）。
  const POST_EMAIL_DISABLED_WEBINARS = new Set(['1', '50ddbae7-c89b-406a-b0c3-afe154b3671c']);
  if (POST_EMAIL_DISABLED_WEBINARS.has(webinarId)) {
    return NextResponse.json({ ok: true, skipped: 'disabled_for_webinar_1' });
  }

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

  const slidesUrl = process.env.SLIDES_URL;
  if (!slidesUrl) {
    console.warn('[post-email] SLIDES_URL env var not set — download button will be broken');
  }

  const emailData = postWebinarEmail(email, name || '', checkoutUrl, slidesUrl || '#');
  sendEmail(emailData); // fire and forget

  // Retargeting list: snapshot recipient + UTM into dedicated table (fire and forget)
  recordPostWebinarRecipient({ webinarId, email, name: name || '' }).catch(err =>
    console.error('[post-email] recordPostWebinarRecipient failed:', err)
  );

  return NextResponse.json({ ok: true });
}
