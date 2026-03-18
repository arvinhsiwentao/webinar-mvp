# Inline Fulfillment Fallback Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure customers receive their activation code even when the Stripe webhook doesn't fire — by adding fulfillment logic to the session-status polling route as a fallback.

**Architecture:** Extract the fulfillment logic (claim activation code from Google Sheets → update order → send email) into a shared `fulfillOrder()` function. Call it from both the webhook handler (primary) and the session-status polling route (fallback). The existing atomic lock (`updateOrderStatus: pending → paid`) prevents double fulfillment — only one caller wins the race. The return page already polls session-status every 2s, so fulfillment happens automatically without user action.

**Tech Stack:** Next.js App Router, Supabase, Stripe, Google Sheets API, SendGrid

---

### Task 1: Extract shared fulfillment function

**Why:** The webhook and session-status routes need identical fulfillment logic. Duplicating it would violate DRY and create divergence risk. Extract once, call from both.

**Files:**
- Create: `src/lib/fulfillment.ts`
- Modify: `src/app/api/checkout/webhook/route.ts`

**Step 1: Create `src/lib/fulfillment.ts`**

```typescript
import { getOrderBySessionId, updateOrder, updateOrderStatus } from '@/lib/db';
import { claimActivationCode } from '@/lib/google-sheets';
import { sendEmail, purchaseConfirmationEmail } from '@/lib/email';
import { audit } from '@/lib/audit';
import type { Order } from '@/lib/types';

export interface FulfillmentResult {
  status: 'fulfilled' | 'already_fulfilled' | 'already_processing' | 'no_order' | 'failed';
  activationCode?: string;
  error?: string;
}

/**
 * Fulfill an order: claim activation code, update DB, send email.
 * Safe to call from multiple paths — atomic lock prevents double fulfillment.
 *
 * @param stripeSessionId - The Stripe checkout session ID
 * @param paymentIntentId - The Stripe payment intent ID (from webhook or session retrieval)
 */
export async function fulfillOrder(
  stripeSessionId: string,
  paymentIntentId?: string | null
): Promise<FulfillmentResult> {
  const order = await getOrderBySessionId(stripeSessionId);

  if (!order) {
    console.error('[Fulfillment] No order found for session:', stripeSessionId);
    return { status: 'no_order' };
  }

  // Already fulfilled — return existing code
  if (order.status === 'fulfilled') {
    return { status: 'already_fulfilled', activationCode: order.activationCode };
  }

  // Atomic lock: pending → paid (only one caller wins)
  const locked = await updateOrderStatus(order.id, 'pending', 'paid');
  if (!locked) {
    return { status: 'already_processing' };
  }

  // === FULFILLMENT ===
  let code: string;
  const resolvedPaymentIntentId = paymentIntentId || '';
  try {
    code = await claimActivationCode(resolvedPaymentIntentId || order.id, order.email);

    const now = new Date().toISOString();
    await updateOrder(order.id, {
      status: 'fulfilled',
      activationCode: code,
      stripePaymentIntentId: resolvedPaymentIntentId,
      paidAt: now,
      fulfilledAt: now,
    });

    audit({ type: 'order_fulfilled', orderId: order.id, activationCode: code });
    console.log(`[Fulfillment] Order fulfilled: ${order.id}, code: ${code}`);
  } catch (err) {
    // Rollback to pending so webhook retry or next poll can try again
    await updateOrder(order.id, { status: 'pending' });
    audit({ type: 'order_fulfillment_failed', orderId: order.id, error: String(err) });
    console.error('[Fulfillment] Failed, rolled back to pending:', err);
    return { status: 'failed', error: String(err) };
  }

  // === NOTIFICATION (best-effort) ===
  try {
    const orderDate = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).replace(/-/g, '/');
    const emailParams = purchaseConfirmationEmail({
      to: order.email,
      name: order.name || order.email,
      activationCode: code,
      orderDate,
      orderId: resolvedPaymentIntentId || stripeSessionId,
      email: order.email,
    });
    const emailSent = await sendEmail(emailParams);
    if (!emailSent) {
      console.error(`[Fulfillment] Email failed for order ${order.id} — customer must use on-screen code`);
    }
  } catch (emailErr) {
    console.error(`[Fulfillment] Email error for order ${order.id}:`, emailErr);
  }

  return { status: 'fulfilled', activationCode: code };
}
```

**Step 2: Refactor webhook to use `fulfillOrder`**

Replace the inline fulfillment logic in `src/app/api/checkout/webhook/route.ts` with a call to the shared function:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { fulfillOrder } from '@/lib/fulfillment';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  let event: Stripe.Event;

  try {
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
    const paymentIntentId = session.payment_intent as string;

    const result = await fulfillOrder(session.id, paymentIntentId);

    if (result.status === 'failed') {
      // Return 500 so Stripe retries the webhook
      return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
    }

    console.log(`[Webhook] fulfillOrder result: ${result.status}`);
  }

  return NextResponse.json({ received: true });
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/lib/fulfillment.ts src/app/api/checkout/webhook/route.ts
git commit -m "refactor: extract fulfillOrder into shared module, simplify webhook handler"
```

---

### Task 2: Add inline fulfillment to session-status route

**Why:** This is the core fix. When the return page polls session-status and the Stripe session is `complete` but the order is still `pending`, the route triggers fulfillment directly. The atomic lock prevents double fulfillment with the webhook.

**Files:**
- Modify: `src/app/api/checkout/session-status/route.ts`

**Step 1: Add fulfillment call**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId } from '@/lib/db';
import { fulfillOrder } from '@/lib/fulfillment';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status === 'complete') {
      let order = await getOrderBySessionId(sessionId);

      // Inline fulfillment fallback: if payment complete but order not yet fulfilled,
      // attempt fulfillment directly (safe — atomic lock prevents doubles)
      if (order && order.status === 'pending') {
        const paymentIntentId = session.payment_intent as string;
        const result = await fulfillOrder(sessionId, paymentIntentId);

        if (result.status === 'fulfilled') {
          // Re-read order to get the activation code
          order = await getOrderBySessionId(sessionId);
        }
        // If failed or already_processing, return current state — next poll will retry
      }

      if (order) {
        return NextResponse.json({
          status: session.status,
          orderStatus: order.status,
          activationCode: order.status === 'fulfilled' ? order.activationCode : undefined,
          customerEmail: session.customer_details?.email || session.customer_email,
          amountTotal: session.amount_total,
          currency: session.currency,
          productName: session.metadata?.webinar_title || 'Webinar Course',
        });
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

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/app/api/checkout/session-status/route.ts
git commit -m "feat: add inline fulfillment fallback to session-status polling route"
```

---

### Task 3: Backfill stuck pending orders

**Why:** There are 3 existing orders stuck at `pending` in the database. These customers paid but never received activation codes. We need to check if their Stripe sessions actually completed and fulfill them.

**Files:**
- No code changes — this is a one-time operational task using Supabase SQL + Stripe Dashboard

**Step 1: Check Stripe session status for each stuck order**

For each of the 3 pending orders, verify in Stripe Dashboard (or via `stripe` CLI) whether the checkout session was actually paid:

```bash
stripe checkout sessions retrieve cs_test_a1UIPCLbw5zeF06NS3yXamVmFMeAwGlknXFn4Z8Ku6jQWy6k4zDvW5dGwM
stripe checkout sessions retrieve cs_test_a1tD3ZuVxGhDpRnyqW63ZTyeaK4hPI7ucW7isHtU42f2TtgIgT3D3yDdAL
stripe checkout sessions retrieve cs_test_a1ZRgUrmMvQdh8d030UGl5y2JyZlJSyswYptopqpzEWCEPaQCmOvdNcAXp
```

**Step 2: For completed sessions, trigger fulfillment**

If any session shows `status: complete`, call the session-status endpoint to trigger the inline fulfillment:

```bash
curl "http://localhost:3000/api/checkout/session-status?session_id=cs_test_..."
```

Or manually update via Supabase if the Google Sheets codes need to be claimed directly.

**Step 3: Document results**

Record which orders were backfilled and which were abandoned (incomplete payment).

---

### Task 4: Update documentation

**Files:**
- Modify: `docs/architecture.md` — add note about dual fulfillment paths
- Modify: `docs/decisions.md` — append decision entry

**Step 1: Append to `docs/decisions.md`**

```markdown
### 2026-03-13 — Add inline fulfillment fallback to session-status route

**Decision:** Extracted fulfillment logic into shared `src/lib/fulfillment.ts`. Both the Stripe webhook and the session-status polling route can now trigger fulfillment. Atomic lock (`updateOrderStatus: pending → paid`) prevents double fulfillment.

**Why:** The webhook is the only fulfillment path, creating a single point of failure. If webhook doesn't fire (local dev without `stripe listen`, deployment misconfiguration, Stripe retry exhaustion), orders stay stuck at `pending` forever. The session-status route is already polled by the return page every 2s — adding fulfillment there gives customers their activation code immediately, even without the webhook.
```

**Step 2: Update `docs/architecture.md`**

In the checkout/payment section, note the dual fulfillment pattern:

```markdown
#### Purchase Fulfillment

Two fulfillment paths (shared `src/lib/fulfillment.ts`):
1. **Stripe webhook** (`/api/checkout/webhook`) — primary, triggered by Stripe on payment
2. **Session-status polling** (`/api/checkout/session-status`) — fallback, triggered by return page polling

Both use `updateOrderStatus(id, 'pending', 'paid')` as an atomic lock — only one caller wins the race. Safe against double fulfillment.
```

**Step 3: Commit**

```bash
git add docs/decisions.md docs/architecture.md
git commit -m "docs: document dual fulfillment paths and inline fallback decision"
```
