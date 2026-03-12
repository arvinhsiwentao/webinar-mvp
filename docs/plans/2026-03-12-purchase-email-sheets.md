# Purchase Email Redesign + Google Sheets Activation Codes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the minimal purchase confirmation email with a professional, content-rich template matching the provided screenshot, and switch activation code sourcing from random generation to a pre-populated Google Sheet.

**Architecture:** Two parallel changes converge at the same call sites. (1) A new `google-sheets.ts` module claims pre-defined activation codes from a shared Google Sheet via the Sheets API, replacing random code generation. (2) The `purchaseConfirmationEmail` function in `email.ts` is redesigned with a rich HTML layout including order details, activation instructions, product links, and customer service info. Both changes are wired into the existing webhook and session-status fulfillment handlers.

**Tech Stack:** googleapis (Google Sheets API v4), Google Service Account auth, SendGrid (existing), Stripe (existing), Next.js API routes

---

## Task 1: Install googleapis dependency

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run:
```bash
npm install googleapis
```

Expected: `googleapis` added to `dependencies` in package.json

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add googleapis dependency for Google Sheets integration"
```

---

## Task 2: Create Google Sheets activation code module

**Files:**
- Create: `src/lib/google-sheets.ts`

**Step 1: Create the Google Sheets client module**

```typescript
import { google } from 'googleapis';
import { generateActivationCode } from './activation-codes';

const SPREADSHEET_ID = '1W9tK97n004XI7UbN_VuECcb_ZVVWmwa31sWRadBxZOQ';
const SHEET_RANGE = 'A:E'; // code, is_used, order_id, order_email, date

function getAuthClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;

  const credentials = JSON.parse(keyJson);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Claims the first unused activation code from Google Sheets.
 * Updates the row with order info and marks it as used.
 * Falls back to random code generation if Google credentials are not configured.
 */
export async function claimActivationCode(
  orderId: string,
  orderEmail: string,
): Promise<string> {
  const auth = getAuthClient();
  if (!auth) {
    console.warn('[GoogleSheets] GOOGLE_SERVICE_ACCOUNT_KEY not set, falling back to random code generation');
    return generateActivationCode();
  }

  const sheets = google.sheets({ version: 'v4', auth });
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Read all rows
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });

    const rows = res.data.values;
    if (!rows || rows.length < 2) {
      throw new Error('No activation codes found in the Google Sheet');
    }

    // Find first unused code (skip header row)
    let targetRowIndex = -1;
    let code = '';
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const isUsed = (row[1] || '').toString().toUpperCase();
      if (isUsed !== 'TRUE') {
        targetRowIndex = i + 1; // Sheets rows are 1-indexed
        code = row[0];
        break;
      }
    }

    if (targetRowIndex === -1 || !code) {
      throw new Error('No activation codes available — all codes in the Google Sheet have been used');
    }

    // Claim the code: update is_used, order_id, order_email, date
    const today = new Date().toLocaleDateString('en-CA'); // yyyy-mm-dd format
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `B${targetRowIndex}:E${targetRowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['TRUE', orderId, orderEmail, today]],
      },
    });

    // Verify our write stuck (race condition check)
    const verify = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `C${targetRowIndex}`,
    });
    const writtenOrderId = verify.data.values?.[0]?.[0];
    if (writtenOrderId === orderId) {
      console.log(`[GoogleSheets] Claimed code at row ${targetRowIndex} for order ${orderId}`);
      return code;
    }

    // Another process claimed this row — retry with next available
    console.warn(`[GoogleSheets] Row ${targetRowIndex} was claimed by another process, retrying (attempt ${attempt + 1}/${maxRetries})`);
  }

  throw new Error('Failed to claim activation code after max retries — possible high concurrency');
}
```

**Step 2: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/google-sheets.ts
git commit -m "feat: add Google Sheets client for claiming activation codes"
```

---

## Task 3: Redesign purchase confirmation email template

**Files:**
- Modify: `src/lib/email.ts:99-125`

**Step 1: Replace the `purchaseConfirmationEmail` function**

Replace lines 99-125 of `src/lib/email.ts` (the entire `purchaseConfirmationEmail` function) with:

```typescript
interface PurchaseEmailData {
  to: string;
  name: string;
  activationCode: string;
  orderDate: string;
  orderId: string;
  email: string;
}

export function purchaseConfirmationEmail(data: PurchaseEmailData): EmailParams {
  const { to, name, activationCode, orderDate, orderId, email } = data;
  const productName = '美股二加一实战组合包';
  const codeExpiry = '2026/12/31';

  return {
    to,
    subject: `感谢您购买【${productName}】，请查收您的商品启用序号`,
    html: `
<div style="font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A; line-height: 1.8; padding: 20px;">

  <p style="font-size: 16px; margin-bottom: 24px;">
    ${name} 用户您好，感谢您购买【${productName}｜Mike 是麦克】，请您参照下方说明启用本方案商品权限。
  </p>

  <!-- Order Info Table -->
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr>
      <td style="border: 1px solid #E8E5DE; padding: 10px 14px; background: #FAFAF7; width: 33%;">订购日期：${orderDate}</td>
      <td style="border: 1px solid #E8E5DE; padding: 10px 14px; background: #FAFAF7; width: 33%;">订单编号：${orderId}</td>
      <td style="border: 1px solid #E8E5DE; padding: 10px 14px; background: #FAFAF7; width: 34%;">商品名称：${productName}</td>
    </tr>
    <tr>
      <td colspan="3" style="border: 1px solid #E8E5DE; padding: 10px 14px; background: #FAFAF7;">订购人 Email：${email}</td>
    </tr>
  </table>

  <!-- Activation Code Box -->
  <div style="border: 2px solid #B8953F; border-radius: 8px; padding: 24px; margin-bottom: 8px; background: #FAFAF7;">
    <p style="margin: 0 0 12px 0; font-size: 14px; color: #6B6B6B;">商品启用序号：</p>
    <p style="margin: 0; text-align: center;">
      <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #B8953F;">${activationCode}</span>
    </p>
  </div>

  <p style="font-size: 13px; color: #6B6B6B; margin: 4px 0;">※ 本启用序号专为您所有，并且仅可使用一次，请勿外流他人。</p>
  <p style="font-size: 13px; color: #6B6B6B; margin: 4px 0 24px 0;">※ 序号到期日：${codeExpiry}</p>

  <!-- Activation Instructions -->
  <div style="margin-bottom: 24px;">
    <p style="font-weight: bold; font-size: 15px; margin-bottom: 8px;">商品启用说明：</p>
    <ol style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 2.2;">
      <li>前往理财宝官网，输入上方商品启用序号后，点击「启用序号」</li>
      <li>如您尚未登入或註册理财宝帐号，请您登入或註册</li>
      <li>登入、序号启用后，即可看到「序号启用成功！」</li>
    </ol>
  </div>

  <!-- Product Links -->
  <div style="background: #FAFAF7; border: 1px solid #E8E5DE; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
    <p style="font-size: 14px; margin: 0 0 12px 0;">
      商品启用后，可前往三个商品各自页面，并确保已登入您的理财宝帐号后，方可享有以下商品权限：
    </p>
    <ul style="padding-left: 20px; margin: 0; font-size: 14px; line-height: 2.2;">
      <li>Mike是麦克 美股财富导航 App 下载：<a href="https://cmoneymike.onelink.me/ZEaW/kkyo4oqs" style="color: #B8953F;">https://cmoneymike.onelink.me/ZEaW/kkyo4oqs</a></li>
      <li>震盪行情的美股期权操作解析 线上课程观看：<a href="https://cmy.tw/00CKIq" style="color: #B8953F;">https://cmy.tw/00CKIq</a></li>
      <li>ETF 进阶资产放大术 线上课程观看：<a href="https://cmy.tw/00ChKt" style="color: #B8953F;">https://cmy.tw/00ChKt</a></li>
    </ul>
  </div>

  <!-- Footer -->
  <div style="border-top: 1px solid #E8E5DE; padding-top: 20px; text-align: center; font-size: 13px; color: #6B6B6B;">
    <p style="margin: 0 0 4px 0;">※ 如您遇到任何问题，欢迎联繫理财宝客服</p>
    <p style="margin: 0 0 4px 0;">Email：csservice@cmoney.com.tw</p>
    <p style="margin: 0;">服务时间：北京时间週一到週五 8：30 ~ 17：30</p>
  </div>

</div>
    `,
  };
}
```

**Step 2: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: Compilation errors in `webhook/route.ts` and `session-status/route.ts` because the function signature changed. This is expected — we fix those in Task 4.

**Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: redesign purchase confirmation email with full order details and activation instructions"
```

---

## Task 4: Update webhook handler to use Google Sheets + new email

**Files:**
- Modify: `src/app/api/checkout/webhook/route.ts:1-72`

**Step 1: Update the webhook handler**

Replace the **entire file** `src/app/api/checkout/webhook/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId, updateOrder } from '@/lib/db';
import { claimActivationCode } from '@/lib/google-sheets';
import { sendEmail, purchaseConfirmationEmail } from '@/lib/email';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
    // IMPORTANT: Use raw text body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const order = await getOrderBySessionId(session.id);

    if (!order) {
      console.error('[Webhook] No order found for session:', session.id);
      return NextResponse.json({ received: true });
    }

    // Idempotency: skip if already fulfilled
    if (order.status === 'fulfilled') {
      console.log('[Webhook] Order already fulfilled:', order.id);
      return NextResponse.json({ received: true });
    }

    // Claim activation code from Google Sheets (falls back to random if no credentials)
    const code = await claimActivationCode(order.id, order.email);

    const now = new Date().toISOString();
    await updateOrder(order.id, {
      status: 'fulfilled',
      activationCode: code,
      stripePaymentIntentId: session.payment_intent as string,
      paidAt: now,
      fulfilledAt: now,
    });

    // Send purchase confirmation email
    const orderDate = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const emailParams = purchaseConfirmationEmail({
      to: order.email,
      name: order.name || order.email,
      activationCode: code,
      orderDate,
      orderId: session.payment_intent as string,
      email: order.email,
    });
    await sendEmail(emailParams);

    console.log(`[Webhook] Order fulfilled: ${order.id}, code: ${code}`);
  }

  return NextResponse.json({ received: true });
}
```

Key changes from original:
- Import `claimActivationCode` from `@/lib/google-sheets` instead of `generateActivationCode`
- Remove `getOrderByActivationCode` import (no longer needed)
- Replace the generate-and-check-uniqueness loop with single `claimActivationCode()` call
- Pass `PurchaseEmailData` object to `purchaseConfirmationEmail()` instead of positional args

**Step 2: Verify it compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: May still error on `session-status/route.ts` — that's fixed in Task 5.

**Step 3: Commit**

```bash
git add src/app/api/checkout/webhook/route.ts
git commit -m "feat: webhook uses Google Sheets codes + redesigned email template"
```

---

## Task 5: Update session-status handler (backup fulfillment)

**Files:**
- Modify: `src/app/api/checkout/session-status/route.ts:1-59`

**Step 1: Update the session-status handler**

Replace the **entire file** `src/app/api/checkout/session-status/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId, updateOrder } from '@/lib/db';
import { claimActivationCode } from '@/lib/google-sheets';
import { sendEmail, purchaseConfirmationEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // If payment completed, ensure fulfillment as backup (webhook is primary)
    if (session.status === 'complete') {
      const order = await getOrderBySessionId(sessionId);
      if (order && order.status !== 'fulfilled') {
        // Claim activation code from Google Sheets
        const code = await claimActivationCode(order.id, order.email);

        const now = new Date().toISOString();
        await updateOrder(order.id, {
          status: 'fulfilled',
          activationCode: code,
          stripePaymentIntentId: session.payment_intent as string,
          paidAt: now,
          fulfilledAt: now,
        });

        // Send email
        const orderDate = new Date().toLocaleDateString('zh-CN', {
          year: 'numeric', month: '2-digit', day: '2-digit',
        });
        const emailParams = purchaseConfirmationEmail({
          to: order.email,
          name: order.name || order.email,
          activationCode: code,
          orderDate,
          orderId: session.payment_intent as string,
          email: order.email,
        });
        await sendEmail(emailParams);
      }
    }

    return NextResponse.json({
      status: session.status,
      customerEmail: session.customer_details?.email || session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
      productName: session.metadata?.webinar_title || 'Webinar Course',
    });
  } catch (err) {
    console.error('[Checkout] Session status check failed:', err);
    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500 },
    );
  }
}
```

Key changes: identical to webhook — swap imports, use `claimActivationCode()`, pass `PurchaseEmailData` object.

**Step 2: Verify full project compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Verify production build**

Run:
```bash
npm run build
```

Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/app/api/checkout/session-status/route.ts
git commit -m "feat: session-status backup uses Google Sheets codes + redesigned email"
```

---

## Task 6: Update documentation

**Files:**
- Modify: `docs/decisions.md`
- Modify: `docs/architecture.md`

**Step 1: Append to `docs/decisions.md`**

Add at the end:

```markdown
## 2026-03-12 — Use Stripe Payment Intent ID as order number in emails

Needed a human-visible order ID for the purchase confirmation email ("订单编号").
Chose Stripe Payment Intent ID (`pi_xxx`) because it's already saved at fulfillment,
customer support can look it up directly in Stripe Dashboard, and no DB migration needed.
Alternatives considered: auto-increment order_number (requires migration), truncated UUID (meaningless).

## 2026-03-12 — Google Sheets for activation codes instead of random generation

Activation codes are pre-defined in a Google Sheet managed by the business team.
Webhook claims the next unused code via Sheets API instead of generating random ones.
Graceful fallback: if `GOOGLE_SERVICE_ACCOUNT_KEY` is not set, falls back to random generation.
Sheet ID: `1W9tK97n004XI7UbN_VuECcb_ZVVWmwa31sWRadBxZOQ`.
```

**Step 2: Update `docs/architecture.md`**

Add `google-sheets.ts` to the Key Libraries section (find the section listing `src/lib/` files):

```markdown
- `src/lib/google-sheets.ts` — Claims activation codes from a Google Sheet via Sheets API v4; falls back to random generation without credentials
```

**Step 3: Commit**

```bash
git add docs/decisions.md docs/architecture.md
git commit -m "docs: record Stripe PI order ID and Google Sheets activation code decisions"
```

---

## Task 7: Environment setup guide (manual)

This task is for the user to complete manually. No code changes needed.

### Google Service Account 创建步骤

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建或选择一个项目
3. 启用 **Google Sheets API**：搜索 "Google Sheets API" → 点击"启用"
4. 创建 Service Account：
   - IAM & Admin → Service Accounts → "Create Service Account"
   - 名称：`webinar-sheets`，点击 Create → Continue → Done
5. 创建 JSON Key：
   - 点击刚创建的 Service Account → Keys → Add Key → Create new key → JSON
   - 下载 JSON 文件
6. 设置环境变量：将 JSON 文件内容作为单行字符串设置为 `GOOGLE_SERVICE_ACCOUNT_KEY`
   ```bash
   # .env.local
   GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"...","client_email":"webinar-sheets@xxx.iam.gserviceaccount.com",...}'
   ```
7. 共享 Google Sheet：
   - 打开 Google Sheet → 点击"共享"
   - 添加 JSON 中 `client_email` 的邮箱地址
   - 给予 **编辑者** 权限

---

## Verification Checklist

1. **Type check**: `npx tsc --noEmit` — no errors
2. **Build**: `npm run build` — succeeds
3. **Fallback test** (without Google credentials):
   - Remove/comment `GOOGLE_SERVICE_ACCOUNT_KEY` from `.env.local`
   - Trigger a test purchase — should log warning and generate random code
4. **Google Sheets test** (with credentials):
   - Set `GOOGLE_SERVICE_ACCOUNT_KEY` in `.env.local`
   - Trigger a test purchase
   - Verify: code claimed from Sheet, row updated with `TRUE`, order_id, email, date
5. **Email preview** (without SendGrid key):
   - Check console log output — verify HTML contains order table, activation code box, product links, footer
6. **Email rendering** (with SendGrid key):
   - Send to your own email
   - Check rendering in Gmail, Outlook, Apple Mail
