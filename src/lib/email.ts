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
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[Email] SendGrid error ${res.status}: ${errorBody}`);
    }
    return res.ok;
  } catch (err) {
    console.error('[Email] Send failed:', err);
    return false;
  }
}

export function confirmationEmail(to: string, name: string, title: string, startTime: string, liveUrl: string): EmailParams {
  const date = new Date(startTime).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return {
    to,
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

export function reminderEmail(to: string, type: '24h' | '1h', name: string, title: string, liveUrl: string): EmailParams {
  const subject = type === '24h'
    ? `明天见！${title} 即将开始`
    : `${title} 1 小时后开始！`;
  const body = type === '24h'
    ? `<p>提醒你：${title} 明天开播！</p><p>准备好你的笔记本，明天见！</p>`
    : `<p>${title} 将在 1 小时后开始！</p><p>建议提前 5 分钟进入，确保网络顺畅。</p>`;

  return {
    to,
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

export function followUpEmail(to: string, name: string, title: string, replayUrl: string, ctaUrl?: string): EmailParams {
  return {
    to,
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

export interface PurchaseEmailData {
  to: string;
  name: string;
  activationCode: string;
  orderDate: string;
  orderId: string;
  email: string;
}

export function purchaseConfirmationEmail(data: PurchaseEmailData): EmailParams {
  const productName = '美股二加一实战组合包';
  const codeExpiry = '2026/12/31';
  const appLink = 'https://cmoneymike.onelink.me/ZEaW/kkyo4oqs';
  const course1Link = 'https://cmy.tw/00CKIq';
  const course2Link = 'https://cmy.tw/00ChKt';
  const serviceEmail = 'service@cmoneyedu.com';
  const serviceHours = '周一至周五 09:00–18:00（台北时间）';

  return {
    to: data.to,
    subject: `感谢您购买【${productName}】，请查收您的商品启用序号`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A; line-height: 1.8;">
        <p style="font-size: 16px;">${data.name} 用户您好，感谢您购买【${productName}｜Mike 是麦克】，以下是您的订单资讯与商品启用序号，请妥善保存此邮件。</p>

        <!-- Order Info Table -->
        <table style="width: 100%; border-collapse: collapse; margin: 24px 0; border: 1px solid #E8E5DE; background: #FAFAF7;">
          <tr>
            <td style="border: 1px solid #E8E5DE; padding: 10px 14px; font-weight: bold; width: 33%;">订购日期</td>
            <td style="border: 1px solid #E8E5DE; padding: 10px 14px; font-weight: bold; width: 34%;">订单编号</td>
            <td style="border: 1px solid #E8E5DE; padding: 10px 14px; font-weight: bold; width: 33%;">商品名称</td>
          </tr>
          <tr>
            <td style="border: 1px solid #E8E5DE; padding: 10px 14px;">${data.orderDate}</td>
            <td style="border: 1px solid #E8E5DE; padding: 10px 14px; font-size: 13px; word-break: break-all;">${data.orderId}</td>
            <td style="border: 1px solid #E8E5DE; padding: 10px 14px;">${productName}</td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid #E8E5DE; padding: 10px 14px;"><strong>订购人 Email：</strong>${data.email}</td>
          </tr>
        </table>

        <!-- Activation Code Box -->
        <div style="border: 2px solid #B8953F; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 15px; color: #1A1A1A;">商品启用序号</p>
          <p style="margin: 0 0 12px 0; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #B8953F;">${data.activationCode}</p>
          <p style="margin: 0 0 4px 0; font-size: 13px; color: #B8953F;">※ 此序号仅限单次使用，启用后即失效，请勿分享给他人</p>
          <p style="margin: 0; font-size: 13px; color: #B8953F;">※ 序号到期日：${codeExpiry}</p>
        </div>

        <!-- Instructions -->
        <h3 style="margin: 24px 0 12px 0; font-size: 16px;">启用步骤</h3>
        <ol style="line-height: 2; padding-left: 20px;">
          <li>前往理财宝官网</li>
          <li>输入序号</li>
          <li>点击启用</li>
          <li>登入／注册帐号</li>
          <li>启用成功，即可开始使用</li>
        </ol>

        <!-- Product Links -->
        <h3 style="margin: 24px 0 12px 0; font-size: 16px;">商品连结</h3>
        <ul style="line-height: 2; padding-left: 20px;">
          <li><a href="${appLink}" style="color: #B8953F;">Mike是麦克 美股财富导航 App</a></li>
          <li><a href="${course1Link}" style="color: #B8953F;">震荡行情的美股期权操作解析</a></li>
          <li><a href="${course2Link}" style="color: #B8953F;">ETF 进阶资产放大术</a></li>
        </ul>

        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #E8E5DE; margin: 32px 0 16px 0;" />
        <p style="font-size: 13px; color: #6B6B6B;">如有任何问题，请联系理财宝客服：<a href="mailto:${serviceEmail}" style="color: #B8953F;">${serviceEmail}</a></p>
        <p style="font-size: 13px; color: #6B6B6B;">服务时间：${serviceHours}</p>
      </div>
    `,
  };
}
