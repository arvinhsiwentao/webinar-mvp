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
  const date = new Date(startTime).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return {
    to: '',
    subject: `報名成功！${title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，恭喜你成功報名！</h2>
        <p>直播時間：${date}</p>
        <p>開播前我們會再次提醒你！</p>
        <a href="${liveUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:16px;">進入直播間</a>
      </div>
    `,
  };
}

export function reminderEmail(type: '24h' | '1h', name: string, title: string, liveUrl: string): EmailParams {
  const subject = type === '24h'
    ? `明天見！${title} 即將開始`
    : `${title} 1 小時後開始！`;
  const body = type === '24h'
    ? `<p>提醒你：${title} 明天開播！</p><p>準備好你的筆記本，明天見！</p>`
    : `<p>${title} 將在 1 小時後開始！</p><p>建議提前 5 分鐘進入，確保網路順暢。</p>`;

  return {
    to: '',
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，</h2>
        ${body}
        <a href="${liveUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:16px;">進入直播間</a>
      </div>
    `,
  };
}

export function followUpEmail(name: string, title: string, replayUrl: string, ctaUrl?: string): EmailParams {
  return {
    to: '',
    subject: `${title} 重播連結`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，感謝你參加今天的直播！</h2>
        <p>如果你錯過了一部分，這是重播連結：</p>
        <a href="${replayUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin:16px 0;">觀看重播</a>
        <p style="color:#666;">（重播 48 小時內有效）</p>
        ${ctaUrl ? `<p>今天講座中提到的限時優惠，還剩 24 小時：</p><a href="${ctaUrl}">前往優惠頁面</a>` : ''}
      </div>
    `,
  };
}
