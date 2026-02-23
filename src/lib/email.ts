const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@webinar.example.com';
const FROM_NAME = process.env.FROM_NAME || 'Webinar';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log(`[Email] Would send to ${to}: "${subject}"`);
    console.log(`[Email] Body: ${html.substring(0, 200)}...`);
    return true;
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Email] Send failed:', err);
    return false;
  }
}

export function confirmationEmail(name: string, title: string, startTime: string, liveUrl: string): EmailParams {
  const date = new Date(startTime).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return {
    to: '',
    subject: `报名成功！${title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，恭喜你成功报名！</h2>
        <p>直播时间：${date}</p>
        <p>开播前我们会再次提醒你！</p>
        <a href="${liveUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:16px;">进入直播间</a>
      </div>
    `,
  };
}

export function reminderEmail(type: '24h' | '1h', name: string, title: string, liveUrl: string): EmailParams {
  const subject = type === '24h'
    ? `明天见！${title} 即将开始`
    : `${title} 1 小时后开始！`;
  const body = type === '24h'
    ? `<p>提醒你：${title} 明天开播！</p><p>准备好你的笔记本，明天见！</p>`
    : `<p>${title} 将在 1 小时后开始！</p><p>建议提前 5 分钟进入，确保网络顺畅。</p>`;

  return {
    to: '',
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，</h2>
        ${body}
        <a href="${liveUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:16px;">进入直播间</a>
      </div>
    `,
  };
}

export function followUpEmail(name: string, title: string, replayUrl: string, ctaUrl?: string): EmailParams {
  return {
    to: '',
    subject: `${title} 重播链接`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，感谢你参加今天的直播！</h2>
        <p>如果你错过了一部分，这是重播链接：</p>
        <a href="${replayUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin:16px 0;">观看重播</a>
        <p style="color:#666;">（重播 48 小时内有效）</p>
        ${ctaUrl ? `<p>今天讲座中提到的限时优惠，还剩 24 小时：</p><a href="${ctaUrl}">前往优惠页面</a>` : ''}
      </div>
    `,
  };
}
