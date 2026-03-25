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

export function confirmationEmail(to: string, name: string, title: string, startTime: string, liveUrl: string, speakerAvatarUrl?: string, timezone: string = 'America/Chicago'): EmailParams {
  const { date: dateFormatted, time: timeFormatted } = formatInTimezone(startTime, timezone);
  const tzLabel = getTimezoneLabel(timezone);

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
                <p style="margin:2px 0 0 0;font-size:12px;color:#6B6B6B;letter-spacing:0.5px;">美股财富自由攻略</p>
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
                        <p style="margin:0;font-size:15px;color:#1A1A1A;font-weight:600;">${timeFormatted} (${tzLabel})</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA Button -->
        <tr><td style="padding:8px 40px 28px 40px;text-align:center;">
          <a href="${liveUrl}" style="display:inline-block;background-color:#B8953F;color:#FFFFFF;font-size:16px;font-weight:700;text-decoration:none;padding:14px 48px;letter-spacing:0.5px;mso-padding-alt:0;text-align:center;">
            <!--[if mso]><i style="mso-font-width:300%;mso-text-raise:30pt">&nbsp;</i><![endif]-->
            <span style="mso-text-raise:15pt;">进入直播间</span>
            <!--[if mso]><i style="mso-font-width:300%">&nbsp;</i><![endif]-->
          </a>
          <p style="margin:10px 0 0 0;font-size:12px;color:#9CA3AF;">开播前我们会再次发送提醒邮件</p>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="border-top:1px solid #E8E5DE;"></div></td></tr>

        <!-- Benefits section -->
        <tr><td style="padding:24px 40px 8px 40px;">
          <p style="margin:0 0 16px 0;font-size:14px;font-weight:700;color:#1A1A1A;">讲座中你将获得：</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:10px;color:#B8953F;font-size:14px;font-weight:bold;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;">公开 Mike 如何从负债到达成财务自由的完整路径</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:6px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:10px;color:#B8953F;font-size:14px;font-weight:bold;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;">独家公开 Mike 的美股持仓清单与选股逻辑</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:6px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:10px;color:#B8953F;font-size:14px;font-weight:bold;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;">打造你的被动收入系统——用对的投资策略让钱自己长大</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:6px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:10px;color:#B8953F;font-size:14px;font-weight:bold;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;">学会判断「什么时候该进场」——抓住 AI 时代的最佳买入时机</td>
              </tr></table>
            </td></tr>
            <tr><td style="padding:6px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:top;padding-right:10px;color:#B8953F;font-size:14px;font-weight:bold;">&#10003;</td>
                <td style="font-size:14px;color:#1A1A1A;">APP 陪跑带你执行——不用自己盯盘，打开手机就知道怎么做</td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Reminder box -->
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
  const serviceEmail = 'csservice@cmoney.com.tw';
  const serviceHours = '北京时间週一到週五 8：30 ~ 17：30';

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
          <li>前往<a href="https://www.cmoney.tw/" style="color: #B8953F;">商品官网</a></li>
          <li>输入上方商品启用序号</li>
          <li>点击「启用序号」</li>
          <li>如您尚未登入或註册理财宝帐号，请您登入或註册</li>
          <li>登入帐号并启用序号后，即可看到「序号启用成功！」</li>
        </ol>

        <!-- Product Links -->
        <h3 style="margin: 24px 0 12px 0; font-size: 16px;">商品启用后，可前往三个商品各自页面，并确保已登入您的帐号后，方可享有以下商品权限：</h3>
        <ul style="line-height: 2; padding-left: 20px;">
          <li><a href="${appLink}" style="color: #B8953F;">Mike是麦克 美股财富导航 App 下载</a></li>
          <li><a href="${course1Link}" style="color: #B8953F;">震盪行情的美股期权操作解析 线上课程观看</a></li>
          <li><a href="${course2Link}" style="color: #B8953F;">ETF 进阶资产放大术 线上课程观看</a></li>
        </ul>

        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #E8E5DE; margin: 32px 0 16px 0;" />
        <p style="font-size: 13px; color: #6B6B6B;">※ 如您遇到任何问题，欢迎联繫官网客服</p>
        <p style="font-size: 13px; color: #6B6B6B;">Email：<a href="mailto:${serviceEmail}" style="color: #B8953F;">${serviceEmail}</a></p>
        <p style="font-size: 13px; color: #6B6B6B;">服务时间：${serviceHours}</p>
      </div>
    `,
  };
}
