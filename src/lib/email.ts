import { audit } from './audit';
import { formatInTimezone, getTimezoneLabel } from './timezone';

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
        from: { email: FROM_EMAIL, name: FROM_NAME },
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

export function confirmationEmail(to: string, name: string, title: string, startTime: string, liveUrl: string, speakerAvatarUrl?: string, timezone: string = 'America/Chicago', duration: number = 60): EmailParams {
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
            席位已为你保留，以下是你的讲座信息
          </p>
        </td></tr>

        <!-- Event details card -->
        <tr><td style="padding:20px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF7;border:1px solid #E8E5DE;border-radius:8px;">
            <tr><td style="padding:24px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:14px;">
                    <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">讲座主题</p>
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
            <span style="mso-text-raise:15pt;">进入直播间</span>
            <!--[if mso]><i style="mso-font-width:300%">&nbsp;</i><![endif]-->
          </a>
          <p style="margin:10px 0 0 0;font-size:12px;color:#9CA3AF;">开播前我们会再次发送提醒邮件</p>
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
          <p style="margin:0 0 16px 0;font-size:17px;font-weight:700;color:#1A1A1A;">40 分钟，不是鸡汤，是策略</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:7px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:12px;color:#B8953F;font-size:15px;font-weight:bold;line-height:1.5;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;line-height:1.6;">2026 三重机会窗口（AI + 降息 + 川普 2.0）— 钱现在在哪一层、接下来往哪流</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:7px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:12px;color:#B8953F;font-size:15px;font-weight:bold;line-height:1.5;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;line-height:1.6;">一套你能立刻执行的攻守框架 — 什么时候买、怎么配、什么时候不动</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:7px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:12px;color:#B8953F;font-size:15px;font-weight:bold;line-height:1.5;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;line-height:1.6;">Mike 从负债 50 万到 43 岁财务自由，他做对了什么</td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <!-- ── Section: 直播课大纲 ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;margin-top:20px;">&nbsp;</td></tr>
        <tr><td style="padding:28px 40px 24px 40px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">直播课大纲</p>
          <p style="margin:0 0 20px 0;font-size:17px;font-weight:700;color:#1A1A1A;">从「为什么要行动」到「具体怎么做」</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding-bottom:12px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:14px;width:32px;">
                  <div style="width:28px;height:28px;border-radius:50%;border:1px solid #B8953F;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#B8953F;">01</div>
                </td>
                <td style="vertical-align:middle;font-size:14px;font-weight:600;color:#1A1A1A;">普通人靠薪水为什么存不到钱？</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding-bottom:12px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:14px;width:32px;">
                  <div style="width:28px;height:28px;border-radius:50%;border:1px solid #B8953F;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#B8953F;">02</div>
                </td>
                <td style="vertical-align:middle;font-size:14px;font-weight:600;color:#1A1A1A;">AI 六层架构 — 2026 年的机会在哪一层</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding-bottom:12px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:14px;width:32px;">
                  <div style="width:28px;height:28px;border-radius:50%;border:1px solid #B8953F;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#B8953F;">03</div>
                </td>
                <td style="vertical-align:middle;font-size:14px;font-weight:600;color:#1A1A1A;">从负债 50 万到 43 岁财务自由 — Mike 做对了什么</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding-bottom:12px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:14px;width:32px;">
                  <div style="width:28px;height:28px;border-radius:50%;border:1px solid #B8953F;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#B8953F;">04</div>
                </td>
                <td style="vertical-align:middle;font-size:14px;font-weight:600;color:#1A1A1A;">一套可执行的投资框架 — 长短线怎么配、ETF 怎么选</td>
              </tr></table>
            </td></tr>
            <tr><td>
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;padding-right:14px;width:32px;">
                  <div style="width:28px;height:28px;border-radius:50%;border:1px solid #B8953F;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#B8953F;">05</div>
                </td>
                <td style="vertical-align:middle;font-size:14px;font-weight:600;color:#1A1A1A;">真实学员案例 — 从零开始到稳定执行</td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <!-- ── Section: 温馨提示 ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:20px 40px 28px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF7;border-left:3px solid #B8953F;border-radius:0 4px 4px 0;">
            <tr><td style="padding:14px 20px;">
              <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.6;">
                &#128161; <strong style="color:#1A1A1A;">温馨提示：</strong>建议提前 5 分钟进入直播间，确保网络连接顺畅。本次讲座为限时公开，名额有限，请务必准时参加。
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
}

export function purchaseConfirmationEmail(data: PurchaseEmailData): EmailParams {
  const codeExpiry = '2026/12/31';
  const appLink = 'https://cmoneymike.onelink.me/ZEaW/kkyo4oqs';
  const course1Link = 'https://cmy.tw/00CKIq';
  const course2Link = 'https://cmy.tw/00ChKt';
  const serviceEmail = 'cmoney_overseas@cmoney.com.tw';
  const serviceHours = '北京时间週一到週五 8：30 ~ 17：30';
  const mikeWhatsApp = 'https://wa.me/15109927777?text=' + encodeURIComponent('我已购买课程套餐，想与 Mike 老师做一对一持仓分析');
  const csWhatsApp = 'https://wa.me/886917642752?text=' + encodeURIComponent('你好，我想咨询课程相关问题');

  // Build product display name from codes
  const codes = data.activationCodes || (data.activationCode
    ? [{ productId: 'bundle', productName: '美股二加一实战组合包', code: data.activationCode }]
    : []);
  const productDisplayName = codes.length === 1
    ? codes[0].productName
    : codes.map(c => c.productName).join(' + ');

  // Build activation codes HTML
  const codesHtml = codes.map(c => `
    <div style="border: 2px solid #B8953F; border-radius: 8px; padding: 20px; text-align: center; margin: 16px 0;">
      <p style="margin: 0 0 4px 0; font-size: 13px; color: #6B6B6B;">${c.productName}</p>
      <p style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #B8953F;">${c.code}</p>
      <p style="margin: 0; font-size: 12px; color: #B8953F;">仅限单次使用 · 到期日：${codeExpiry}</p>
    </div>
  `).join('');

  // Build product links based on what was purchased
  const productIds = codes.map(c => c.productId);
  const hasOptions = productIds.some(id => id === 'options' || id === 'etf-options' || id === 'bundle');
  const hasEtf = productIds.some(id => id === 'etf-options' || id === 'bundle');
  const hasApp = productIds.some(id => id === 'app-monthly' || id === 'bundle' || id === 'options' || id === 'etf-options');

  const productLinksHtml = [
    hasApp ? `<li><a href="${appLink}" style="color: #B8953F;">Mike是麦克 美股财富导航 App 下载</a></li>` : '',
    hasOptions ? `<li><a href="${course1Link}" style="color: #B8953F;">震荡行情的美股期权操作解析 线上课程观看</a></li>` : '',
    hasEtf ? `<li><a href="${course2Link}" style="color: #B8953F;">ETF 进阶资产放大术 线上课程观看</a></li>` : '',
  ].filter(Boolean).join('\n');

  return {
    to: data.to,
    subject: `感谢您购买【${productDisplayName}】，请查收您的商品启用序号`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A; line-height: 1.8;">
        <p style="font-size: 16px;">${data.name} 用户您好，感谢您购买【${productDisplayName}｜Mike 是麦克】，以下是您的订单资讯与商品启用序号，请妥善保存此邮件。</p>

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
        <h3 style="margin: 24px 0 12px 0; font-size: 16px;">启用步骤</h3>
        <p style="font-size: 13px; color: #6B6B6B; margin-bottom: 8px;">每个商品需分别启用序号：</p>
        <ol style="line-height: 2; padding-left: 20px;">
          <li>前往<a href="https://www.cmoney.tw/" style="color: #B8953F;">商品官网</a></li>
          <li>点击右上角「登入 / 注册」，完成登入或注册理财宝帐号</li>
          <li>登入后，将鼠标移动到右上角，在下拉选单中选择「启用序号」</li>
          <li>输入上方商品启用序号，点击「启用序号」按钮，即可看到「序号启用成功！」</li>
        </ol>

        <!-- Product Links -->
        <h3 style="margin: 24px 0 12px 0; font-size: 16px;">商品启用后，可前往以下页面使用权限：</h3>
        <ul style="line-height: 2; padding-left: 20px;">
          ${productLinksHtml}
        </ul>

        ${data.bonusEligible ? `
        <!-- 1-on-1 Portfolio Analysis (bonus) -->
        <div style="border: 2px solid #B8953F; border-radius: 8px; padding: 24px; margin: 24px 0; background: #FAFAF7;">
          <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #B8953F;">🎁 直播限定福利：Mike 一对一持仓分析</h3>
          <p style="margin: 0 0 12px 0; font-size: 14px;">恭喜你获得 Mike 老师亲自为你做一对一持仓分析的机会！请按照以下步骤预约：</p>
          <ol style="line-height: 2; padding-left: 20px; margin: 0 0 16px 0;">
            <li><strong>截图保存此封确认邮件</strong>作为购买凭证</li>
            <li>点击下方 WhatsApp 链接联系 Mike 老师</li>
            <li>发送截图并预约一对一分析时间</li>
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
        <p style="font-size: 13px; color: #6B6B6B;">※ 如您遇到任何问题，欢迎联繫官网客服</p>
        <p style="font-size: 13px; color: #6B6B6B;">Email：<a href="mailto:${serviceEmail}" style="color: #B8953F;">${serviceEmail}</a></p>
        <p style="font-size: 13px; color: #6B6B6B;">服务时间：${serviceHours}</p>
      </div>
    `,
  };
}

export function postWebinarEmail(to: string, name: string, checkoutUrl: string, slidesUrl: string): EmailParams {
  const displayName = name || '学员';
  return {
    to,
    subject: `${displayName}，今天的直播简报已送达 + 一份独家精华文章给你`,
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

        <!-- Mike letter opening -->
        <tr><td style="padding:32px 40px 8px 40px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">Mike是麦克</p>
          <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:700;color:#1A1A1A;line-height:1.4;">嗨 ${displayName}，我是 Mike</h1>
          <p style="margin:0 0 16px 0;font-size:15px;color:#1A1A1A;line-height:1.7;">谢谢你今天花时间看完整场直播。完整简报附在这封信里，方便你回去再消化一遍，哪个段落想再看一眼，直接打开就有。</p>
        </td></tr>

        <!-- Slides download card -->
        <tr><td style="padding:0 40px 20px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border:1px solid #E8E5DE;border-radius:8px;">
            <tr>
              <td style="padding:14px 8px 14px 18px;vertical-align:middle;width:1%;white-space:nowrap;">
                <div style="width:42px;height:42px;background:#FFFFFF;border:1px solid #E8E5DE;border-radius:6px;text-align:center;line-height:42px;font-size:20px;">📑</div>
              </td>
              <td style="padding:14px 8px;vertical-align:middle;">
                <p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:#1A1A1A;">今天的直播完整简报</p>
                <p style="margin:0;font-size:12px;color:#6B6B6B;">PDF · 点击下载，离线随时回看</p>
              </td>
              <td style="padding:14px 18px 14px 8px;vertical-align:middle;text-align:right;width:1%;white-space:nowrap;">
                <a href="${slidesUrl}" style="display:inline-block;background-color:#1A1A1A;color:#FFFFFF;font-size:13px;font-weight:600;text-decoration:none;padding:9px 18px;border-radius:4px;">
                  下载 →
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Survey lead-in -->
        <tr><td style="padding:0 40px 16px 40px;">
          <p style="margin:0 0 12px 0;font-size:15px;color:#1A1A1A;line-height:1.7;">另外，我还有一份礼物想送给你，<strong>相信对你一定有帮助</strong>。只要花 3 分钟帮我填个问卷，跟我聊聊你看完直播之后的想法，就免费送给你。每一个回答都会让我知道下次怎么讲得更清楚、要补什么内容、可以怎么再多帮上你一点。</p>
          <p style="margin:0;font-size:15px;color:#1A1A1A;line-height:1.7;">没有对错，凭直觉回答就好。你的回答只有我和小团队会看到，不会用于其他用途。</p>
        </td></tr>

        <!-- Gift card with survey CTA -->
        <tr><td style="padding:16px 40px 24px 40px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border:2px solid #B8953F;border-radius:8px;">
            <tr><td style="padding:24px 26px;">
              <span style="display:inline-block;background:#B8953F;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:3px;letter-spacing:0.8px;">🎁 你的礼物</span>
              <p style="margin:14px 0 4px 0;font-size:12px;color:#6B6B6B;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;">独家精华文章</p>
              <p style="margin:0 0 14px 0;font-size:18px;font-weight:700;color:#1A1A1A;line-height:1.5;">《2026 年资本流向与普通人的投资战略》</p>
              <p style="margin:0 0 14px 0;font-size:14px;color:#4B5563;line-height:1.7;">这一份不是公开内容，是我私下整理给认真听课的学员，把今年这场地缘 + AI + 能源大变局，用我自己的判断和操作摊开来讲，<strong style="color:#1A1A1A;">不是网上那些虚的宏观分析</strong>。里面包括：</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">
                ${[
                  '美国怎么用 AI 主导权 + 全球关键资源 + 重塑供应链三条主线，重新分配下一轮资本红利',
                  '地缘危机与能源真相：为什么油价暴涨反而常常是通缩前兆？霍尔木兹海峡冲突背后真正的资本流向',
                  '2026 大盘三档情境预判：短期 / 中期 / 极端情境下的具体操作节奏（含 SPX 目标位 + 联准会降息预期判断）',
                  '具体标的拆解：特斯拉 / OKL — 怎么看、怎么操作、仓位多少才合理',
                  '普通人唯一能掌控的筹码：仓位管理 + 现金弹性的实战拆解',
                ].map(item => `
                <tr><td style="padding:5px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align:top;padding-right:10px;color:#B8953F;font-size:14px;font-weight:bold;line-height:1.6;">•</td>
                    <td style="font-size:14px;color:#1A1A1A;line-height:1.6;">${item}</td>
                  </tr></table>
                </td></tr>`).join('')}
              </table>
              <div style="text-align:center;">
                <a href="https://www.surveycake.com/s/VXgA6" style="display:inline-block;background-color:#B8953F;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:13px 32px;letter-spacing:0.5px;border-radius:4px;">
                  填问卷领精华文章 →
                </a>
              </div>
            </td></tr>
          </table>
        </td></tr>

        <!-- Checkout CTA divider -->
        <tr><td style="padding:24px 40px 0 40px;">
          <div style="border-top:1px solid #E8E5DE;height:1px;font-size:0;line-height:0;">&nbsp;</div>
        </td></tr>

        <!-- Checkout CTA -->
        <tr><td style="padding:36px 40px 36px 40px;text-align:center;">
          <p style="margin:0 0 12px 0;font-size:20px;font-weight:700;color:#1A1A1A;">加入 Mike 的投资学习社群</p>
          <p style="margin:0 0 24px 0;font-size:15px;color:#6B6B6B;line-height:1.7;">想清楚了，随时都欢迎。专属链接已帮你保留直播间价格</p>
          <a href="${checkoutUrl}" style="display:inline-block;background-color:#B8953F;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;letter-spacing:0.5px;border-radius:4px;">
            前往专属结帐页面
          </a>
          <p style="margin:12px 0 0 0;font-size:12px;color:#9CA3AF;">直播间专属价格 · 限时有效</p>
          <p style="margin:16px 0 0 0;font-size:13px;color:#16a34a;font-weight:600;">🛡️ 所有方案均享 30 天无理由退款保证 · 零风险体验</p>
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
