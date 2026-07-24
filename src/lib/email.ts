import { audit } from './audit';
import { formatInTimezone, getTimezoneLabel } from './timezone';
import { PRODUCT_IDS } from './products';
import { getConfirmationEmailContent } from './webinar-email-content';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@webinar.example.com';
const FROM_NAME = process.env.FROM_NAME || 'Webinar';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  /** Override the global FROM_NAME for this email (e.g. per funnel). */
  fromName?: string;
}

export async function sendEmail({ to, subject, html, fromName }: EmailParams): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn(`[Email] SENDGRID_API_KEY not set — email NOT sent to ${to}: "${subject}"`);
    audit({ type: 'email_failed', to, template: subject, error: 'SENDGRID_API_KEY not configured' });
    return false;
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
        from: { email: FROM_EMAIL, name: fromName || FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[Email] SendGrid error ${res.status}: ${errorBody}`);
      audit({ type: 'email_failed', to, template: subject, error: `HTTP ${res.status}` });
    } else {
      audit({ type: 'email_sent', to, template: subject });
    }
    return res.ok;
  } catch (err) {
    console.error('[Email] Send failed:', err);
    audit({ type: 'email_failed', to, template: subject, error: String(err) });
    return false;
  }
}

export function confirmationEmail(to: string, name: string, title: string, startTime: string, liveUrl: string, speakerAvatarUrl?: string, timezone: string = 'America/Chicago', duration: number = 60, webinarId?: string): EmailParams {
  // 分場文案（帶走這些 / 大綱）；未登錄的 webinar 回傳預設（Webinar 1 三四五版）
  const c = getConfirmationEmailContent(webinarId);
  const { date: dateFormatted, time: ptTime } = formatInTimezone(startTime, 'America/Los_Angeles');
  const { time: etTime } = formatInTimezone(startTime, 'America/New_York');
  const timeFormatted = `${ptTime} 美西 (PT) / ${etTime} 美东 (ET)`;

  // Build calendar links
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const fmtGCal = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const gcalDesc = `讲者: Mike是麦克\n加入直播: ${liveUrl}`;
  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmtGCal(start)}/${fmtGCal(end)}&details=${encodeURIComponent(gcalDesc)}&location=${encodeURIComponent(liveUrl)}`;
  const baseUrl = (() => { try { return new URL(liveUrl).origin; } catch { return ''; } })();
  const icsUrl = `${baseUrl}/api/calendar/ics?${new URLSearchParams({ title, start: startTime, duration: String(duration), url: liveUrl, desc: gcalDesc }).toString()}`;

  return {
    to,
    subject: `报名成功！${title}`,
    html: `
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#1A1A1A;line-height:1.6;">
  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F0;">
    <tr><td align="center" style="padding:32px 16px;">

      <!-- Email container -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E8E5DE;">

        <!-- Gold top accent bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#B8953F,#C9A962,#B8953F);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Header: Speaker + Brand -->
        <tr><td style="padding:32px 40px 24px 40px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              ${speakerAvatarUrl ? `<td style="vertical-align:middle;padding-right:14px;">
                <div style="width:52px;height:52px;border-radius:50%;background:#F5F5F0;border:2px solid #E8E5DE;overflow:hidden;display:inline-block;">
                  <img src="${speakerAvatarUrl}" alt="Mike" width="52" height="52" style="width:52px;height:52px;object-fit:cover;border-radius:50%;display:block;" />
                </div>
              </td>` : ''}
              <td style="vertical-align:middle;text-align:left;">
                <p style="margin:0;font-size:16px;font-weight:700;color:#1A1A1A;">Mike是麦克</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="border-top:1px solid #E8E5DE;"></div></td></tr>

        <!-- Main content -->
        <tr><td style="padding:28px 40px 8px 40px;">
          <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:#1A1A1A;">
            ${name}，你已成功报名！
          </h1>
          <p style="margin:0;font-size:14px;color:#6B6B6B;">
            席位已为你保留，以下是你的${c.sessionNoun}信息
          </p>
        </td></tr>

        <!-- Event details card -->
        <tr><td style="padding:20px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF7;border:1px solid #E8E5DE;border-radius:8px;">
            <tr><td style="padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:14px;">
                    <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">${c.sessionNoun}主题</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#1A1A1A;">${title}</p>
                  </td>
                </tr>
                <tr><td style="padding-bottom:14px;border-top:1px solid #E8E5DE;padding-top:14px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:top;padding-right:8px;font-size:16px;">&#128197;</td>
                      <td>
                        <p style="margin:0 0 2px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">日期</p>
                        <p style="margin:0;font-size:15px;color:#1A1A1A;font-weight:600;">${dateFormatted}</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
                <tr><td>
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="vertical-align:top;padding-right:8px;font-size:16px;">&#9201;</td>
                      <td>
                        <p style="margin:0 0 2px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">时间</p>
                        <p style="margin:0;font-size:15px;color:#1A1A1A;font-weight:600;">${timeFormatted}</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA Button -->
        <tr><td style="padding:8px 40px 16px 40px;text-align:center;">
          <a href="${liveUrl}" style="display:inline-block;background-color:#B8953F;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;letter-spacing:0.5px;mso-padding-alt:0;text-align:center;">
            <!--[if mso]><i style="mso-font-width:300%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
            <span style="mso-text-raise:15pt;">${c.enterButtonText}</span>
            <!--[if mso]><i style="mso-font-width:300%">&nbsp;</i><![endif]-->
          </a>
        </td></tr>

        <!-- ── Section: 加入行事历 ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:20px 40px;text-align:center;">
          <p style="margin:0 0 12px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">加入行事历</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="padding-right:8px;">
                <a href="${googleCalUrl}" style="display:inline-block;background-color:#FFFFFF;color:#1A1A1A;font-size:13px;font-weight:600;text-decoration:none;padding:9px 18px;border:1px solid #E8E5DE;border-radius:4px;">
                  &#128197; Google 行事历
                </a>
              </td>
              <td>
                <a href="${icsUrl}" style="display:inline-block;background-color:#FFFFFF;color:#1A1A1A;font-size:13px;font-weight:600;text-decoration:none;padding:9px 18px;border:1px solid #E8E5DE;border-radius:4px;">
                  &#128222; Apple / Outlook
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- ── Section: 你将带走这些 ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 40px 8px 40px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">你将带走这些</p>
          <p style="margin:0 0 16px 0;font-size:17px;font-weight:700;color:#1A1A1A;">${c.takeawaySubhead}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${c.takeaways.map(t => `<tr><td style="padding:7px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:12px;color:#B8953F;font-size:15px;font-weight:bold;line-height:1.5;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;line-height:1.6;">${t}</td>
              </tr></table>
            </td></tr>`).join('')}
          </table>
        </td></tr>

        <!-- ── Section: 大綱（讲座/体验课，依场次分场） ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;margin-top:20px;">&nbsp;</td></tr>
        <tr><td style="padding:28px 40px 24px 40px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">${c.outlineHeading}</p>
          <p style="margin:0 0 20px 0;font-size:17px;font-weight:700;color:#1A1A1A;">从「为什么要行动」到「具体怎么做」</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${c.outline.map((o, i) => `<tr><td${i < c.outline.length - 1 ? ' style="padding-bottom:12px;"' : ''}>
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:14px;width:32px;">
                  <div style="width:28px;height:28px;border-radius:50%;border:1px solid #B8953F;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#B8953F;">${o.num}</div>
                </td>
                <td style="vertical-align:middle;font-size:14px;font-weight:600;color:#1A1A1A;">${o.title}</td>
              </tr></table>
            </td></tr>`).join('')}
          </table>
        </td></tr>

        <!-- ── Section: 温馨提示 ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:20px 40px 28px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF7;border-left:3px solid #B8953F;border-radius:0 4px 4px 0;">
            <tr><td style="padding:14px 20px;">
              <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.6;">
                &#128161; <strong style="color:#1A1A1A;">温馨提示：</strong>建议提前 5 分钟进入直播间，确保网络连接顺畅。本次${c.sessionNoun}为限时公开，名额有限，请务必准时参加。
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;background-color:#FAFAF7;border-top:1px solid #E8E5DE;">
          <p style="margin:0 0 4px 0;font-size:11px;color:#9CA3AF;text-align:center;">
            此邮件由系统自动发送，请勿直接回复
          </p>
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">
            &copy; ${new Date().getFullYear()} Mike是麦克. All rights reserved.
          </p>
        </td></tr>

      </table>
      <!-- /Email container -->

    </td></tr>
  </table>
</body>
</html>
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
  /** Legacy single code (backward compat) */
  activationCode?: string;
  /** Multi-product codes */
  activationCodes?: { productId: string; productName: string; code: string }[];
  orderDate: string;
  orderId: string;
  email: string;
  bonusEligible?: boolean;
  /** us-stock funnel: link to the standalone activation tutorial page. */
  tutorialUrl?: string;
}

export function purchaseConfirmationEmail(data: PurchaseEmailData): EmailParams {
  const appLink = 'https://cmoneymike.onelink.me/ZEaW/kkyo4oqs';
  const course1Link = 'https://cmy.tw/00CKIq';
  const course2Link = 'https://cmy.tw/00ChKt';
  const usStockCourseLink = 'https://www.cmoney.tw/course-media/17781/chapters?platform=5';
  const usStockAppLink = 'https://cmoneymike.onelink.me/ZEaW/hqq09hla';
  const bundleTutorialUrl = 'https://mike.cmoney.cc/activation-tutorial'; // App 内启用图文教学页
  const serviceEmail = 'cmoney_overseas@cmoney.com.tw';
  const serviceHours = '北京时间週一到週五 8：30 ~ 17：30';
  const mikeWhatsApp = 'https://wa.me/15109927777?text=' + encodeURIComponent('我已购买课程套餐，想与 Mike 老师做一对一持仓分析');
  const csWhatsApp = 'https://wa.me/886917642752?text=' + encodeURIComponent('你好，我想咨询课程相关问题');

  // Build product display name from codes
  const codes = data.activationCodes || (data.activationCode
    ? [{ productId: 'bundle', productName: '实战组合包－Mike App年方案 + ETF/期权课程', code: data.activationCode }]
    : []);
  const isUsStock = codes.some(c => c.productId === PRODUCT_IDS.US_STOCK_1PLUS3);
  const productDisplayName = isUsStock
    ? 'US$1 美股入门课'
    : (codes.length === 1
        ? codes[0].productName
        : codes.map(c => c.productName).join(' + '));

  // Build activation codes HTML
  const codesHtml = codes.map(c => `
    <div style="border: 2px solid #B8953F; border-radius: 8px; padding: 20px; text-align: center; margin: 16px 0;">
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #6B6B6B;">${c.productName}</p>
      <p style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #B8953F;">${c.code}</p>
    </div>
  `).join('');

  // Build product links based on what was purchased
  const productIds = codes.map(c => c.productId);
  const hasOptions = productIds.some(id => id === 'options' || id === 'etf-options' || id === 'bundle');
  const hasEtf = productIds.some(id => id === 'etf-options' || id === 'bundle');
  const hasApp = productIds.some(id => id === 'app-monthly' || id === 'bundle' || id === 'options' || id === 'etf-options');

  const productLinksHtml = isUsStock
    ? [
        `<li><a href="${usStockCourseLink}" style="color: #B8953F;">点此观看课程</a></li>`,
        `<li><a href="${usStockAppLink}" style="color: #B8953F;">点此下载 Mike是麦克 App</a></li>`,
      ].join('\n')
    : [
        hasApp ? `<li><a href="${appLink}" style="color: #B8953F;">Mike是麦克 美股财富导航 App 下载</a></li>` : '',
        hasOptions ? `<li><a href="${course1Link}" style="color: #B8953F;">震荡行情的美股期权操作解析 线上课程观看</a></li>` : '',
        hasEtf ? `<li><a href="${course2Link}" style="color: #B8953F;">ETF 进阶资产放大术 线上课程观看</a></li>` : '',
      ].filter(Boolean).join('\n');

  return {
    to: data.to,
    fromName: isUsStock ? 'Mike US$1美股入门课' : undefined,
    subject: `感谢您购买【${productDisplayName}】，请查收您的商品启用序号`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A; line-height: 1.8;">
        <p style="font-size: 16px;">${isUsStock ? '用户您好' : `${data.name} 用户您好`}，感谢您购买【${productDisplayName}】，以下是您的订单资讯与商品启用序号，请妥善保存此邮件。</p>

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
            <td style="border: 1px solid #E8E5DE; padding: 10px 14px;">${productDisplayName}</td>
          </tr>
          <tr>
            <td colspan="3" style="border: 1px solid #E8E5DE; padding: 10px 14px;"><strong>订购人 Email：</strong>${data.email}</td>
          </tr>
        </table>

        <!-- Activation Code(s) -->
        <h3 style="margin: 24px 0 12px 0; font-size: 16px;">商品启用序号</h3>
        ${codesHtml}
        <p style="font-size: 13px; color: #B8953F; text-align: center;">※ 每个序号仅限单次使用，启用后即失效，请勿分享给他人</p>

        <!-- Instructions -->
        <h3 style="margin: 24px 0 12px 0; font-size: 16px;">如何启用序号与观看课程？</h3>
        ${isUsStock
          ? `<div style="border: 1px solid #E8E5DE; border-radius: 8px; padding: 16px 20px; background: #FAFAF7;">
          <p style="margin: 0;"><a href="${data.tutorialUrl}" style="color: #B8953F; font-weight: bold; font-size: 15px;">点此查看启用图文教学 →</a></p>
        </div>`
          : `<p style="text-align: center; margin: 16px 0 8px 0;">
          <a href="${bundleTutorialUrl}" style="display: inline-block; background: #B8953F; color: #FFFFFF; font-size: 15px; font-weight: bold; text-decoration: none; padding: 13px 32px; border-radius: 6px;">📖 点此查看完整图文教学</a>
        </p>`}

        <!-- Product Links（仅 us-stock 显示；bundle 由图文教学页涵盖） -->
        ${isUsStock ? `<h3 style="margin: 24px 0 12px 0; font-size: 16px;">商品启用后，可前往以下页面使用权限：</h3>
        <ul style="line-height: 2; padding-left: 20px;">
          ${productLinksHtml}
        </ul>` : ''}

        ${data.bonusEligible ? `
        <!-- 1-on-1 Portfolio Analysis (bonus) -->
        <div style="border: 2px solid #B8953F; border-radius: 8px; padding: 24px; margin: 24px 0; background: #FAFAF7;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #B8953F;">🎁 体验课限定福利：Mike 一对一持仓分析</h3>
          <p style="margin: 0 0 8px 0; font-size: 14px;">恭喜你！拿到了 Mike 老师亲自帮你做一对一持仓分析的名额。</p>
          <p style="margin: 0 0 12px 0; font-size: 14px;">Mike 会看你现在的持仓与配置，帮你把大方向理清楚、告诉你哪里该调整，让你的第一步走得稳、走得对。</p>
          <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: bold;">预约方式：</p>
          <ol style="line-height: 2; padding-left: 20px; margin: 0 0 16px 0;">
            <li><strong>截图保存此封确认邮件</strong>（作为购买凭证）</li>
            <li>点击下方 WhatsApp 联系 Mike 老师</li>
            <li>发送截图，说一声你是体验课学员，即可预约</li>
          </ol>
          <p style="text-align: center; margin: 16px 0 8px 0;">
            <a href="${mikeWhatsApp}" style="display: inline-block; background: #25D366; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">📱 WhatsApp 联系 Mike 老师预约</a>
          </p>
        </div>
        ` : ''}

        <!-- Customer Service WhatsApp -->
        <div style="background: #F5F5F0; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #1A1A1A;">课程使用有任何问题？</p>
          <p style="margin: 0 0 12px 0;">
            <a href="${csWhatsApp}" style="display: inline-block; background: #25D366; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">💬 WhatsApp 咨询客服</a>
          </p>
        </div>

        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #E8E5DE; margin: 32px 0 16px 0;" />
        <p style="font-size: 13px; color: #6B6B6B; text-align: center;">※ 如您遇到任何问题，欢迎联繫官网客服</p>
        <p style="font-size: 13px; color: #6B6B6B; text-align: center;">Email：<a href="mailto:${serviceEmail}" style="color: #B8953F;">${serviceEmail}</a></p>
        <p style="font-size: 13px; color: #6B6B6B; text-align: center;">服务时间：${serviceHours}</p>
      </div>
    `,
  };
}

export function postWebinarEmail(to: string, name: string, checkoutUrl: string, _slidesUrl?: string): EmailParams {
  const displayName = name || '学员';
  const appLink = 'https://cmoneymike.onelink.me/ZEaW/kkyo4oqs';
  // 图片需绝对网址；取 checkoutUrl 的 origin（本机预览为 localhost、线上为正式域名）
  const base = (() => { try { return new URL(checkoutUrl).origin; } catch { return 'https://mike.cmoney.cc'; } })();
  return {
    to,
    subject: `${displayName}，谢谢你参加今天的体验课｜重点整理 + 下一步`,
    html: `
<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#1A1A1A;line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F0;">
    <tr><td align="center" style="padding:32px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #E8E5DE;">

        <!-- Gold top bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#B8953F,#C9A962,#B8953F);font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- ===== Block 1: 感谢 + 鼓励 + 体验课总结 ===== -->
        <tr><td style="padding:32px 40px 4px 40px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">Mike是麦克</p>
          <h1 style="margin:0 0 18px 0;font-size:24px;font-weight:700;color:#1A1A1A;line-height:1.4;">嗨 ${displayName}，谢谢你今天来参加体验课</h1>
          <p style="margin:0 0 16px 0;font-size:16px;color:#1A1A1A;line-height:1.7;">你今天愿意花一小时坐下来、把这套方法认真听完，光是这一步，就已经比大多数还在场外观望、每天追高杀低的人，更靠近你想要的结果了。</p>
          <p style="margin:0 0 8px 0;font-size:16px;color:#1A1A1A;line-height:1.7;">帮你把今天的重点，简单收个尾：</p>
        </td></tr>

        <!-- 体验课总结 3 点 -->
        <tr><td style="padding:8px 40px 20px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border:1px solid #E8E5DE;border-radius:8px;">
            <tr><td style="padding:20px 24px;">
              ${[
                ['AI 六层架构', '看懂钱正在往哪一层流、现在进场还来不来得及'],
                ['选股四动作', '看大盘 → 找风口 → 找交集 → 找买点，自己就能判断一支股能不能买'],
                ['仓位配置', '核心 / 卫星 / 现金三块怎么分，依你的年龄与目标来调'],
              ].map(([t, d]) => `
              <p style="margin:0 0 3px 0;font-size:16px;font-weight:700;color:#1A1A1A;line-height:1.5;"><span style="color:#B8953F;">&#10003;</span>&nbsp;${t}</p>
              <p style="margin:0 0 14px 0;padding-left:22px;font-size:15px;color:#6B6B6B;line-height:1.6;">${d}</p>`).join('')}
              <p style="margin:2px 0 0 0;font-size:15px;color:#1A1A1A;line-height:1.7;">这套东西，学会了就是你自己的，谁也拿不走。</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- ===== Block 2: Mike App 下载 ===== -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 40px 8px 40px;text-align:center;">
          <p style="margin:0 0 8px 0;font-size:23px;font-weight:700;color:#1A1A1A;">Mike App 下载</p>
          <p style="margin:0 0 20px 0;font-size:16px;color:#6B6B6B;line-height:1.7;">扫描 QR Code 下载，或到 App Store / Google Play 搜寻「Mike是麦克」，也可以点击下方连结下载。</p>
          <img src="${base}/images/app-download-qrcode.png" alt="扫码下载 Mike是麦克 App" width="180" height="180" style="width:180px;height:180px;display:block;margin:0 auto 18px auto;border:1px solid #E8E5DE;border-radius:10px;" />
          <a href="${appLink}" style="display:inline-block;background-color:#5E3E9E;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:6px;">📱 立即下载 App</a>
        </td></tr>

        <!-- 限时免费视频直播 -->
        <tr><td style="padding:20px 40px 28px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFFB;border:1px solid #E2D6F6;border-radius:8px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 14px 0;font-size:17px;font-weight:700;color:#5E3E9E;">🎬 立即去收听限时免费的视频直播</p>
              ${['2026 长线定投逻辑', '7 巨头财报前作战策略', '记忆体超级周期'].map(t => `
              <p style="margin:0 0 8px 0;font-size:16px;color:#1A1A1A;line-height:1.5;"><span style="color:#5E3E9E;font-weight:bold;">&#9656;</span>&nbsp; ${t}</p>`).join('')}
            </td></tr>
          </table>
        </td></tr>

        <!-- ===== Block 3: 购买页 ===== -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:30px 40px 34px 40px;text-align:center;">
          <p style="margin:0 0 22px 0;font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.4;">体验课学员优惠已为您保留</p>
          <a href="${checkoutUrl}" style="display:inline-block;background-color:#B8953F;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;border-radius:6px;">前往专属方案页面 →</a>
          <p style="margin:16px 0 0 0;font-size:14px;color:#16a34a;font-weight:600;">🛡️ 7 天无条件退款保证 · 零风险体验</p>
        </td></tr>

        <!-- WhatsApp -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="margin:0 0 16px 0;font-size:14px;color:#1A1A1A;">有任何问题，随时找我们</p>
          <a href="https://wa.me/886917642752?text=${encodeURIComponent('你好，我想咨询课程相关问题')}" style="display:inline-block;background:#25D366;color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 20px;border-radius:6px;">💬 WhatsApp 咨询客服小帮手</a>
          <p style="margin:12px 0 0 0;font-size:13px;color:#6B6B6B;">或发送邮件至 <a href="mailto:cmoney_overseas@cmoney.com.tw" style="color:#B8953F;text-decoration:none;">cmoney_overseas@cmoney.com.tw</a></p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;background-color:#FAFAF7;border-top:1px solid #E8E5DE;">
          <p style="margin:0 0 4px 0;font-size:11px;color:#9CA3AF;text-align:center;">此邮件由系统自动发送，请勿直接回复</p>
          <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">&copy; ${new Date().getFullYear()} Mike是麦克. All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
    `,
  };
}
