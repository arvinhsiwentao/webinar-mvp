# Purchase Fulfillment Hardening

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure every paying customer receives a valid activation code — on-screen immediately, with email as backup. Eliminate silent failures.

**Architecture:** Decouple fulfillment (claim code + save to DB) from notification (email). The return page becomes the primary delivery channel by polling for the activation code and displaying it directly. Google Sheets is the only source of activation codes — no fake code fallback. Email failure never rolls back fulfillment.

**Tech Stack:** Next.js App Router, React 19, Supabase, Stripe webhooks, Google Sheets API, SendGrid

---

### Task 1: Remove fake activation code fallback from Google Sheets

**Why:** A randomly generated code can't be redeemed on CMoney. Giving a customer a fake code is worse than showing an error. If Google Sheets is unavailable, the webhook should fail and let Stripe retry.

**Files:**
- Modify: `src/lib/google-sheets.ts:1-36`
- Delete: `src/lib/activation-codes.ts`

**Step 1: Edit `src/lib/google-sheets.ts`**

Remove the import and fallback. Replace with a thrown error:

```typescript
// DELETE this line:
import { generateActivationCode } from './activation-codes';

// REPLACE the fallback block (lines 31-36):
  if (!auth) {
    console.warn(
      '[google-sheets] GOOGLE_SERVICE_ACCOUNT_KEY not set — falling back to generated activation code'
    );
    return generateActivationCode();
  }

// WITH:
  if (!auth) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not configured — cannot claim activation code'
    );
  }
```

**Step 2: Delete `src/lib/activation-codes.ts`**

This file is only imported by `google-sheets.ts`. No other runtime code uses it.

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors (the only import was in `google-sheets.ts` which we just removed).

**Step 4: Commit**

```bash
git add src/lib/google-sheets.ts
git rm src/lib/activation-codes.ts
git commit -m "fix: remove fake activation code fallback — throw when Google Sheets unavailable"
```

---

### Task 2: Decouple email from fulfillment in webhook

**Why:** Currently, if `sendEmail` were to throw (e.g. due to a future code change), it would roll back the entire fulfillment. Email is a notification, not part of fulfillment. A failed email should never undo a claimed activation code. Also: the return value of `sendEmail` is currently ignored.

**Files:**
- Modify: `src/app/api/checkout/webhook/route.ts:54-88`

**Step 1: Restructure the try/catch**

The fulfillment (claim code + save to DB) stays inside the try/catch with rollback.
The email moves AFTER, outside the try/catch, with its own error handling:

```typescript
    // === FULFILLMENT (retryable via Stripe) ===
    let code: string;
    let paymentIntentId: string;
    try {
      paymentIntentId = session.payment_intent as string;
      code = await claimActivationCode(paymentIntentId || order.id, order.email);

      const now = new Date().toISOString();
      await updateOrder(order.id, {
        status: 'fulfilled',
        activationCode: code,
        stripePaymentIntentId: paymentIntentId,
        paidAt: now,
        fulfilledAt: now,
      });

      audit({ type: 'order_fulfilled', orderId: order.id, activationCode: code });
      console.log(`[Webhook] Order fulfilled: ${order.id}, code: ${code}`);
    } catch (err) {
      // Rollback: restore to pending so Stripe can retry
      await updateOrder(order.id, { status: 'pending' });
      audit({ type: 'order_fulfillment_failed', orderId: order.id, error: String(err) });
      console.error('[Webhook] Fulfillment failed, rolled back to pending:', err);
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }

    // === NOTIFICATION (best-effort, never rolls back fulfillment) ===
    try {
      const orderDate = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).replace(/-/g, '/');
      const emailParams = purchaseConfirmationEmail({
        to: order.email,
        name: order.name || order.email,
        activationCode: code,
        orderDate,
        orderId: paymentIntentId || session.id,
        email: order.email,
      });
      const emailSent = await sendEmail(emailParams);
      if (!emailSent) {
        console.error(`[Webhook] Email failed for order ${order.id} — customer must use on-screen code`);
      }
    } catch (emailErr) {
      console.error(`[Webhook] Email error for order ${order.id}:`, emailErr);
    }
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/api/checkout/webhook/route.ts
git commit -m "fix: decouple email from fulfillment — email failure no longer rolls back order"
```

---

### Task 3: Fix `sendEmail` silent success when API key is missing

**Why:** `sendEmail` currently returns `true` when `SENDGRID_API_KEY` is unset, masking the fact that no email was sent. In production this hides a configuration error.

**Files:**
- Modify: `src/lib/email.ts:13-18`

**Step 1: Change the no-API-key branch**

```typescript
// REPLACE (lines 14-18):
  if (!SENDGRID_API_KEY) {
    console.log(`[Email] Would send to ${to}: "${subject}"`);
    console.log(`[Email] Body: ${html.substring(0, 200)}...`);
    return true;
  }

// WITH:
  if (!SENDGRID_API_KEY) {
    console.warn(`[Email] SENDGRID_API_KEY not set — email NOT sent to ${to}: "${subject}"`);
    audit({ type: 'email_failed', to, template: subject, error: 'SENDGRID_API_KEY not configured' });
    return false;
  }
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "fix: sendEmail returns false when API key missing instead of pretending success"
```

---

### Task 4: Return page — poll for fulfillment + show activation code on screen

**Why:** This is the core safety net. The return page currently says "check your email" but never shows the code. If we display the code directly, email becomes a backup, not the critical path. Polling handles the timing gap between Stripe redirect and webhook processing.

**Files:**
- Modify: `src/app/(public)/checkout/[webinarId]/return/page.tsx`

**Step 1: Rewrite the return page**

Add three new states beyond the current `loading | success | error`:
- `fulfilled` — order fulfilled, activation code available → show code on screen
- `processing` — payment complete but webhook still working → show spinner with message
- `timeout` — payment complete but fulfillment didn't complete in 30s → show customer service contact

Polling logic:
- On mount, check `session-status` every 2 seconds
- If `orderStatus === 'fulfilled'` and `activationCode` exists → stop polling, show code
- If 30 seconds pass without fulfillment → stop polling, show timeout/support message
- Track GA4 `purchase` event on first `complete` status (same as current)

New state type:
```typescript
type PageStatus = 'loading' | 'fulfilled' | 'processing' | 'timeout' | 'error';
```

New state variables:
```typescript
const [activationCode, setActivationCode] = useState('');
```

The `fulfilled` view displays:
- Success checkmark icon (existing)
- "恭喜你，迈出了最重要的一步！" heading (existing)
- **Activation code in gold-bordered box** (new — matches email template style)
- "我们也已将序号发送至 {email}" note
- Next steps: 前往 CMoney 平台兑换 → 开始学习课程

The `processing` view displays:
- Spinner
- "订单处理中，请稍候..."
- (auto-transitions to `fulfilled` or `timeout`)

The `timeout` view displays:
- Warning icon
- "订单正在处理中"
- "您的商品启用序号将通过邮件发送至 {email}"
- "如 10 分钟内未收到，请联系客服："
- "CMoney_overseas@cmoney.com.tw" (as a mailto link)

The `error` view remains unchanged (payment itself failed).

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Manual test**

- Complete a test Stripe payment
- Verify activation code appears on return page
- Verify email is also sent (secondary)

**Step 4: Commit**

```bash
git add "src/app/(public)/checkout/[webinarId]/return/page.tsx"
git commit -m "feat: show activation code on return page with polling + customer service fallback"
```

---

### Task 5: Update customer service email in purchase confirmation template

**Why:** The email template currently references `service@cmoneyedu.com`. The correct support email is `CMoney_overseas@cmoney.com.tw`.

**Files:**
- Modify: `src/lib/email.ts:120-121`

**Step 1: Update the email**

```typescript
// REPLACE:
  const serviceEmail = 'service@cmoneyedu.com';

// WITH:
  const serviceEmail = 'CMoney_overseas@cmoney.com.tw';
```

**Step 2: Commit**

```bash
git add src/lib/email.ts
git commit -m "fix: update customer service email to CMoney_overseas@cmoney.com.tw"
```

---

### Task 6: Update documentation

**Files:**
- Modify: `docs/architecture.md` — remove mention of activation-codes.ts fallback
- Modify: `docs/decisions.md` — append new decision entry
- Modify: `CLAUDE.md` — update `activation-codes.ts` reference in Key Files if present

**Step 1: Update `docs/architecture.md`**

Find the activation codes section and update to reflect that Google Sheets is the only source, no fallback.

**Step 2: Append to `docs/decisions.md`**

```markdown
### 2026-03-13 — Remove fake activation code fallback, harden purchase fulfillment

**Decision:** Removed random activation code generator (`activation-codes.ts`). Google Sheets is now the only source. If unavailable, webhook fails and Stripe retries. Decoupled email from fulfillment — email failure no longer rolls back the order. Return page now displays the activation code directly with polling, making email a backup channel.

**Why:** Fake codes can't be redeemed on CMoney — worse than an error. Silent email failure left customers with no code and no recourse. Showing the code on-screen eliminates single-point-of-failure on email delivery.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md CLAUDE.md
git commit -m "docs: document purchase fulfillment hardening decisions"
```
