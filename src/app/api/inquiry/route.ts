import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

const CUSTOMER_SERVICE_EMAIL = 'cmoney_overseas@cmoney.com.tw';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webinarId, name, email, question, pageSource } = body;

    if (!email || !question) {
      return NextResponse.json(
        { error: '请填写邮箱和问题' },
        { status: 400 }
      );
    }

    // 1. Save to DB
    const { error } = await supabase.from('chatbot_inquiries').insert({
      webinar_id: webinarId || null,
      name: name || '',
      email,
      question,
      page_source: pageSource || 'unknown',
    });

    if (error) {
      console.error('Failed to save inquiry:', error);
      return NextResponse.json(
        { error: 'Failed to save inquiry' },
        { status: 500 }
      );
    }

    // 2. Send notification email to customer service (non-blocking — DB is the source of truth)
    const displayName = name || '未提供';
    const emailSent = await sendEmail({
      to: CUSTOMER_SERVICE_EMAIL,
      subject: `【Mike掘金课程咨询】来自 ${displayName} 的提问`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #1A1A1A; line-height: 1.8;">
          <h2 style="color: #B8953F; margin-bottom: 16px;">新的课程咨询</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #E8E5DE; font-weight: bold; width: 100px;">称呼</td>
              <td style="padding: 8px 12px; border: 1px solid #E8E5DE;">${displayName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #E8E5DE; font-weight: bold;">邮箱</td>
              <td style="padding: 8px 12px; border: 1px solid #E8E5DE;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; border: 1px solid #E8E5DE; font-weight: bold;">来源页面</td>
              <td style="padding: 8px 12px; border: 1px solid #E8E5DE;">${pageSource || 'unknown'}</td>
            </tr>
          </table>
          <div style="background: #FAFAF7; border: 1px solid #E8E5DE; border-radius: 8px; padding: 16px;">
            <p style="font-weight: bold; margin: 0 0 8px 0;">问题内容：</p>
            <p style="margin: 0; white-space: pre-line;">${question}</p>
          </div>
          <p style="color: #6B6B6B; font-size: 13px; margin-top: 16px;">请直接回复用户邮箱：<a href="mailto:${email}">${email}</a></p>
        </div>
      `,
    });

    if (!emailSent) {
      console.error(`[Inquiry] Failed to send notification email for inquiry from ${email} (${displayName}). Question saved to DB — check chatbot_inquiries table.`);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
