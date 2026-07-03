import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, postWebinarEmail } from '@/lib/email';
import { audit, hasPostWebinarEmailSent } from '@/lib/audit';
import { recordPostWebinarRecipient } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webinarId } = await params;

  // TEMP：暫停 Webinar 1(真人)「寄送」post-webinar 簡報信——SLIDES_URL 全站共用且
  // 目前指向 Webinar 3 簡報，避免寄給 W1 觀眾錯的簡報。W1 有自己的簡報後移除此 flag
  // （或改為 per-webinar slidesUrl，各寄各的）。
  // 注意：只跳過「寄信」，仍照常記錄再行銷名單（名單以 webinar_id 區分 W1/W3）。
  // 涵蓋 W1 兩種 id 表示：數字別名 '1'（直接進）與 UUID（提醒信進）。
  const SEND_EMAIL_DISABLED_WEBINARS = new Set(['1', '50ddbae7-c89b-406a-b0c3-afe154b3671c']);
  const sendDisabled = SEND_EMAIL_DISABLED_WEBINARS.has(webinarId);

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

  // Mark as processed first to prevent race condition from simultaneous CTA + end page triggers
  audit({ type: 'post_webinar_email_sent', email, webinarId });

  // 寄送簡報信（Webinar 1 暫時停寄，見上方 flag）
  if (!sendDisabled) {
    const slidesUrl = process.env.SLIDES_URL;
    if (!slidesUrl) {
      console.warn('[post-email] SLIDES_URL env var not set — download button will be broken');
    }
    const emailData = postWebinarEmail(email, name || '', checkoutUrl, slidesUrl || '#');
    sendEmail(emailData); // fire and forget
  }

  // Retargeting list: 一律記錄（W1/W3 皆是），以 webinar_id 區分場次（fire and forget）
  recordPostWebinarRecipient({ webinarId, email, name: name || '' }).catch(err =>
    console.error('[post-email] recordPostWebinarRecipient failed:', err)
  );

  return NextResponse.json({ ok: true, emailSent: !sendDisabled });
}
