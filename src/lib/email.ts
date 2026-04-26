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
  const csWhatsApp = 'https://wa.me/886981159288?text=' + encodeURIComponent('你好，我想咨询课程相关问题');

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

export function postWebinarEmail(to: string, name: string, checkoutUrl: string): EmailParams {
  const displayName = name || '学员';
  return {
    to,
    subject: `${displayName}，Mike直播完整大纲 + 你的专属结帐链接`,
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

        <!-- Header -->
        <tr><td style="padding:32px 40px 28px 40px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">Mike是麦克</p>
          <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:700;color:#1A1A1A;">${displayName}，感谢今天花时间听完</h1>
          <p style="margin:0 0 12px 0;font-size:15px;color:#1A1A1A;line-height:1.7;">如果你看完之后，脑子里还有这些声音：</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border-left:3px solid #B8953F;border-radius:0 4px 4px 0;margin-bottom:20px;">
            <tr><td style="padding:14px 20px;">
              <p style="margin:0 0 8px 0;font-size:14px;color:#4B5563;">「现在市场这么乱，油价、地缘政治……这时候进场真的没问题吗？」</p>
              <p style="margin:0 0 8px 0;font-size:14px;color:#4B5563;">「AI 已经涨了这么多，我现在进场是不是太晚了？」</p>
              <p style="margin:0;font-size:14px;color:#4B5563;">「道理我都懂，但真的不知道第一步该怎么踏出去……」</p>
            </td></tr>
          </table>
          <p style="margin:0 0 14px 0;font-size:15px;color:#1A1A1A;line-height:1.7;">这很正常。你能问出这几个问题，说明你在认真想这件事——不是随便来凑热闹的。</p>
          <p style="margin:0 0 14px 0;font-size:15px;color:#1A1A1A;line-height:1.7;">很多人遇到这种感觉，选择继续等——等市场更明朗一点、等自己再多了解一点、等「时机对了」再进场。但时机，从来不会自动变对。<strong>等待本身，是有成本的。</strong></p>
          <p style="margin:0 0 16px 0;font-size:15px;color:#1A1A1A;line-height:1.7;">今天讲的这套攻守系统，核心不是「帮你预测市场」，而是——不管市场往哪走，你都有清楚的动作可以执行：</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr><td style="padding:4px 0 4px 16px;border-left:2px solid #B8953F;">
              <p style="margin:0 0 10px 0;font-size:14px;color:#1A1A1A;line-height:1.6;"><strong>市场上涨时：</strong>你知道该分批布局哪几类 ETF，不会因为追高而套在高点</p>
              <p style="margin:0 0 10px 0;font-size:14px;color:#1A1A1A;line-height:1.6;"><strong>市场下跌时：</strong>防守仓位已经帮你在收保费，不需要盯盘、不需要恐慌</p>
              <p style="margin:0;font-size:14px;color:#1A1A1A;line-height:1.6;"><strong>市场横盘时：</strong>你知道该等，还是该用期权策略在波动中创造收益</p>
            </td></tr>
          </table>
          <p style="margin:0 0 14px 0;font-size:15px;color:#1A1A1A;line-height:1.7;">不同起点的人，都在用这套框架走出了自己的节奏——有从零开始的全职妈妈，有每天没时间却靠灯号系统管仓的科技上班族，也有餐厅生意繁忙却依然冷静持仓的经营者。</p>
          <p style="margin:0;font-size:15px;color:#1A1A1A;line-height:1.7;">你今天坐下来听完，说明你也已经准备好了。下面是今天讲过的完整内容，以及帮你整理好的方案——不用重新想，看一遍就知道下一步该怎么走。</p>
        </td></tr>

        <!-- ── Section: 直播课大纲 ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 40px 20px 40px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">今天讲了什么</p>
          <p style="margin:0 0 16px 0;font-size:16px;font-weight:700;color:#1A1A1A;">完整大纲回顾</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${[
              ['01', '普通人靠薪水为什么存不到钱？', '解析「高收入高支出」的困境，为什么投资不是选项，而是必须。'],
              ['02', 'AI 六层架构 — 2026 年的机会在哪一层', '拆解 AI 产业链六层结构，资金正在往哪里流、哪些标的还在合理估值。'],
              ['03', '从负债 50 万到 43 岁财务自由 — Mike 做对了什么', '不是励志故事，是走过弯路之后建立框架的真实转折。你不需要再犯同样的错。'],
              ['04', '一套可执行的攻守框架 — ETF 怎么配、期权怎么用', '成长型、防御型、收益型、进阶型 — 四类 ETF 配置逻辑；跌市收保费的期权策略。'],
              ['05', '真实学员案例 — 从什么都不敢动到每天十分钟搞定', '不同背景、不同本金，用同一套框架，走出了属于自己的节奏。'],
            ].map(([num, title, desc], i) => `
            <tr><td style="padding-bottom:${i < 4 ? '14px' : '0'};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:14px;width:32px;">
                  <div style="width:28px;height:28px;border-radius:50%;border:1px solid #B8953F;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#B8953F;margin-top:2px;">${num}</div>
                </td>
                <td style="vertical-align:top;">
                  <p style="margin:0 0 3px 0;font-size:14px;font-weight:700;color:#1A1A1A;">${title}</p>
                  <p style="margin:0;font-size:13px;color:#6B6B6B;line-height:1.5;">${desc}</p>
                </td>
              </tr></table>
            </td></tr>`).join('')}
          </table>
        </td></tr>

        <!-- ── Section: 方案整理 ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:24px 40px 20px 40px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#B8953F;font-weight:600;">方案整理</p>
          <p style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:#1A1A1A;">选择适合你的方案</p>
          <p style="margin:0 0 16px 0;font-size:13px;color:#6B6B6B;">以下价格为直播间专属，已帮你锁定。</p>

          <!-- Bundle (推荐) -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;border:2px solid #B8953F;border-radius:6px;margin-bottom:10px;">
            <tr><td style="padding:16px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0 0 3px 0;font-size:15px;font-weight:700;color:#1A1A1A;">完整组合包</p>
                    <p style="margin:0 0 6px 0;font-size:12px;color:#6B6B6B;">ETF课程 + 期权课程 + APP一年权限</p>
                    <p style="margin:0;font-size:12px;color:#B8953F;font-weight:600;">+ 直播限定：Mike 一对一持仓分析（每位都送）</p>
                  </td>
                  <td style="text-align:right;vertical-align:top;white-space:nowrap;padding-left:12px;">
                    <span style="display:inline-block;background:#B8953F;color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:3px;margin-bottom:6px;">推荐</span><br>
                    <span style="font-size:20px;font-weight:700;color:#B8953F;">$599</span>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>

          <!-- Other products -->
          ${[
            ['ETF+期权课程组合', '完整攻守框架 — ETF配置 + 期权策略 + 加赠1个月APP', '$249'],
            ['期权策略课程', '市场越跌越赚钱的防守策略 + 加赠1个月APP', '$99'],
            ['APP 月方案', '每天 10 分钟，灯号告诉你该不该动', '$49'],
          ].map(([n, desc, price]) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8E5DE;border-radius:6px;margin-bottom:8px;">
            <tr><td style="padding:14px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td>
                  <p style="margin:0 0 2px 0;font-size:14px;font-weight:700;color:#1A1A1A;">${n}</p>
                  <p style="margin:0;font-size:12px;color:#6B6B6B;">${desc}</p>
                </td>
                <td style="text-align:right;vertical-align:middle;padding-left:12px;white-space:nowrap;">
                  <span style="font-size:16px;font-weight:700;color:#B8953F;">${price}</span>
                </td>
              </tr></table>
            </td></tr>
          </table>`).join('')}
        </td></tr>

        <!-- ── CTA ── -->
        <tr><td style="height:1px;background-color:#E8E5DE;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px 40px 32px 40px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:15px;font-weight:700;color:#1A1A1A;">想清楚了，随时都欢迎。</p>
          <p style="margin:0 0 20px 0;font-size:14px;color:#6B6B6B;">你的专属链接已帮你保留直播间价格：</p>
          <a href="${checkoutUrl}" style="display:inline-block;background-color:#B8953F;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;letter-spacing:0.5px;">
            前往专属结帐页面
          </a>
          <p style="margin:12px 0 0 0;font-size:12px;color:#9CA3AF;">直播间专属价格 · 限时有效</p>
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
