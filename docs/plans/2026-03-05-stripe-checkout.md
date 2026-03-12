# Stripe Checkout Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an internal Stripe Embedded Checkout page so users pay without leaving the webinar platform, receiving activation codes via email after payment.

**Architecture:** New `/checkout/[webinarId]` route with two-column layout (marketing copy + Stripe Embedded Checkout form). Three API routes handle session creation, status checking, and webhook fulfillment. Orders stored in `data/orders.json`. Activation codes generated server-side on confirmed payment, delivered via SendGrid email.

**Tech Stack:** Stripe SDK (`stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js`), Next.js App Router API routes, existing JSON file DB layer, existing SendGrid email service.

**Source spec:** `docs/plans/stripe-checkout-plan.md`

---

## Task 1: Install Stripe Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install packages**

Run:
```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

Expected: packages added to `dependencies` in `package.json`

**Step 2: Verify installation**

Run:
```bash
node -e "require('stripe'); require('@stripe/stripe-js'); console.log('OK')"
```

Expected: `OK`

**Step 3: Create `.env.local` template**

Add these env vars to `.env.local` (DO NOT commit this file):

```
STRIPE_SECRET_KEY=sk_test_REPLACE_ME
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REPLACE_ME
STRIPE_WEBHOOK_SECRET=whsec_REPLACE_ME
STRIPE_PRICE_ID=price_REPLACE_ME
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add stripe dependencies"
```

---

## Task 2: Add Order Type + Activation Code Generator

**Files:**
- Modify: `src/lib/types.ts` (add `Order`, `OrderStatus` after line 129)
- Create: `src/lib/activation-codes.ts`

**Step 1: Add Order types to `src/lib/types.ts`**

Append after the existing `ChatMessageData` interface (after line 129):

```typescript
export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'refunded' | 'expired';

export interface Order {
  id: string;
  webinarId: string;
  email: string;
  name: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  activationCode?: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  createdAt: string;
  paidAt?: string;
  fulfilledAt?: string;
}
```

**Step 2: Create `src/lib/activation-codes.ts`**

```typescript
// Characters excluding ambiguous ones: 0/O, 1/I/L
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateActivationCode(): string {
  const segments: string[] = [];
  for (let s = 0; s < 3; s++) {
    let segment = '';
    for (let i = 0; i < 4; i++) {
      const randomBytes = new Uint8Array(1);
      crypto.getRandomValues(randomBytes);
      segment += CHARSET[randomBytes[0] % CHARSET.length];
    }
    segments.push(segment);
  }
  return segments.join('-');
}
```

**Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/activation-codes.ts
git commit -m "feat: add Order type and activation code generator"
```

---

## Task 3: Add Order CRUD to Database Layer

**Files:**
- Modify: `src/lib/db.ts` (add order functions after line 162)
- Create: `data/orders.json` (empty array)

**Step 1: Initialize `data/orders.json`**

Create file with content: `[]`

**Step 2: Add order CRUD functions to `src/lib/db.ts`**

First, add `Order` to the import at line 4:

```typescript
import { Webinar, Registration, ChatMessageData, Order } from './types';
```

Then append after the `appendEvent` function (after line 162):

```typescript
// Order operations
export function getAllOrders(): Order[] {
  return readJsonFile<Order[]>('orders.json', []);
}

export function getOrderBySessionId(stripeSessionId: string): Order | null {
  return getAllOrders().find(o => o.stripeSessionId === stripeSessionId) || null;
}

export function getOrdersByEmail(email: string, webinarId: string): Order[] {
  return getAllOrders().filter(o => o.email === email && o.webinarId === webinarId);
}

export function createOrder(order: Omit<Order, 'id' | 'createdAt'>): Order {
  const orders = getAllOrders();
  const newOrder: Order = {
    ...order,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  orders.push(newOrder);
  writeJsonFile('orders.json', orders);
  return newOrder;
}

export function updateOrder(id: string, updates: Partial<Order>): Order | null {
  const orders = getAllOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return null;
  orders[idx] = { ...orders[idx], ...updates };
  writeJsonFile('orders.json', orders);
  return orders[idx];
}

export function getOrderByActivationCode(code: string): Order | null {
  return getAllOrders().find(o => o.activationCode === code) || null;
}
```

**Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/db.ts data/orders.json
git commit -m "feat: add order CRUD to database layer"
```

---

## Task 4: Stripe Client Singleton + Purchase Email Template

**Files:**
- Create: `src/lib/stripe.ts`
- Modify: `src/lib/email.ts` (add purchase confirmation template)

**Step 1: Create `src/lib/stripe.ts`**

```typescript
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set — Stripe calls will fail');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  typescript: true,
});
```

**Step 2: Add purchase confirmation email to `src/lib/email.ts`**

Append after the `followUpEmail` function (after line 93):

```typescript
export function purchaseConfirmationEmail(
  to: string,
  name: string,
  activationCode: string,
): EmailParams {
  return {
    to,
    subject: '恭喜你成功购买！你的课程激活码',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1A1A1A;">
        <h2>Hi ${name}，恭喜你成功购买！</h2>
        <p>你的课程激活码：</p>
        <div style="background: #FAFAF7; border: 2px solid #B8953F; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #B8953F;">${activationCode}</span>
        </div>
        <h3>兑换步骤：</h3>
        <ol style="line-height: 2;">
          <li>前往 CMoney 平台</li>
          <li>登入/注册帐号</li>
          <li>输入激活码完成兑换</li>
          <li>开始学习课程</li>
        </ol>
        <p style="color: #6B6B6B; margin-top: 24px;">如有问题请联系客服</p>
      </div>
    `,
  };
}
```

**Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/stripe.ts src/lib/email.ts
git commit -m "feat: add Stripe client singleton and purchase email template"
```

---

## Task 5: API Route — Create Checkout Session

**Files:**
- Create: `src/app/api/checkout/create-session/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getWebinarById, getOrdersByEmail, createOrder } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { webinarId, email, name, source } = body;

    if (!webinarId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check for existing purchase
    const existingOrders = getOrdersByEmail(email, webinarId);
    const alreadyPurchased = existingOrders.find(
      o => o.status === 'paid' || o.status === 'fulfilled'
    );
    if (alreadyPurchased) {
      return NextResponse.json(
        { error: 'already_purchased', message: '你已购买过此课程' },
        { status: 409 }
      );
    }

    // Verify webinar exists
    const webinar = getWebinarById(webinarId);
    if (!webinar) {
      return NextResponse.json({ error: 'Webinar not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session in embedded mode
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'payment',
      return_url: `${baseUrl}/checkout/${webinarId}/return?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: email,
      metadata: {
        webinarId,
        email,
        name: name || '',
        source: source || 'direct',
      },
    });

    // Create pending order
    createOrder({
      webinarId,
      email,
      name: name || '',
      stripeSessionId: session.id,
      status: 'pending',
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      metadata: { source: source || 'direct' },
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('[Checkout] Session creation failed:', err);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/checkout/create-session/route.ts
git commit -m "feat: add POST /api/checkout/create-session"
```

---

## Task 6: API Route — Session Status

**Files:**
- Create: `src/app/api/checkout/session-status/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId, updateOrder, getOrderByActivationCode } from '@/lib/db';
import { generateActivationCode } from '@/lib/activation-codes';
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
      const order = getOrderBySessionId(sessionId);
      if (order && order.status !== 'fulfilled') {
        // Generate unique activation code
        let code = generateActivationCode();
        while (getOrderByActivationCode(code)) {
          code = generateActivationCode();
        }

        const now = new Date().toISOString();
        updateOrder(order.id, {
          status: 'fulfilled',
          activationCode: code,
          stripePaymentIntentId: session.payment_intent as string,
          paidAt: now,
          fulfilledAt: now,
        });

        // Send email
        const emailParams = purchaseConfirmationEmail(
          order.email,
          order.name || order.email,
          code,
        );
        await sendEmail(emailParams);
      }
    }

    return NextResponse.json({
      status: session.status,
      customerEmail: session.customer_details?.email || session.customer_email,
    });
  } catch (err) {
    console.error('[Checkout] Session status check failed:', err);
    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/checkout/session-status/route.ts
git commit -m "feat: add GET /api/checkout/session-status"
```

---

## Task 7: API Route — Stripe Webhook

**Files:**
- Create: `src/app/api/checkout/webhook/route.ts`

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getOrderBySessionId, updateOrder, getOrderByActivationCode } from '@/lib/db';
import { generateActivationCode } from '@/lib/activation-codes';
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
    const order = getOrderBySessionId(session.id);

    if (!order) {
      console.error('[Webhook] No order found for session:', session.id);
      return NextResponse.json({ received: true });
    }

    // Idempotency: skip if already fulfilled
    if (order.status === 'fulfilled') {
      console.log('[Webhook] Order already fulfilled:', order.id);
      return NextResponse.json({ received: true });
    }

    // Generate unique activation code
    let code = generateActivationCode();
    while (getOrderByActivationCode(code)) {
      code = generateActivationCode();
    }

    const now = new Date().toISOString();
    updateOrder(order.id, {
      status: 'fulfilled',
      activationCode: code,
      stripePaymentIntentId: session.payment_intent as string,
      paidAt: now,
      fulfilledAt: now,
    });

    // Send purchase confirmation email
    const emailParams = purchaseConfirmationEmail(
      order.email,
      order.name || order.email,
      code,
    );
    await sendEmail(emailParams);

    console.log(`[Webhook] Order fulfilled: ${order.id}, code: ${code}`);
  }

  return NextResponse.json({ received: true });
}
```

**Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/checkout/webhook/route.ts
git commit -m "feat: add POST /api/checkout/webhook"
```

---

## Task 8: Checkout Page (Marketing + Embedded Stripe)

**Files:**
- Create: `src/app/(public)/checkout/[webinarId]/page.tsx`

This is the main checkout page with two-column layout: marketing copy on the left, Stripe Embedded Checkout on the right.

**Step 1: Create the checkout page**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

const appearance = {
  theme: 'flat' as const,
  variables: {
    colorPrimary: '#B8953F',
    colorBackground: '#FFFFFF',
    colorText: '#1A1A1A',
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    borderRadius: '4px',
  },
  rules: {
    '.Input': { border: '1px solid #E8E5DE' },
    '.Input:focus': {
      border: '1px solid #B8953F',
      boxShadow: '0 0 0 2px rgba(184,149,63,0.15)',
    },
  },
};

function ValueItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-neutral-700">
      <span className="text-[#B8953F] mt-0.5 shrink-0">&#10003;</span>
      <span>{text}</span>
    </li>
  );
}

function CountdownTimer({ initialSeconds }: { initialSeconds: number }) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  if (remaining <= 0) {
    return (
      <div className="bg-[#1A1A1A] text-white text-center py-3 px-4 rounded-md text-sm font-medium">
        限时优惠
      </div>
    );
  }

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="bg-[#1A1A1A] text-white text-center py-3 px-4 rounded-md">
      <span className="text-sm">限时优惠倒计时 </span>
      <span className="text-[#B8953F] font-mono font-bold text-lg">
        {hours > 0 ? `${pad(hours)}:` : ''}{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const webinarId = params.webinarId as string;

  const email = searchParams.get('email') || '';
  const source = searchParams.get('source') || 'direct';
  const countdownSeconds = parseInt(searchParams.get('t') || '0', 10);
  const name = searchParams.get('name') || '';

  const [error, setError] = useState('');
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch('/api/checkout/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webinarId, email, name, source }),
    });

    if (!res.ok) {
      const data = await res.json();
      if (data.error === 'already_purchased') {
        setAlreadyPurchased(true);
        throw new Error(data.message);
      }
      throw new Error(data.error || 'Failed to create session');
    }

    const data = await res.json();
    return data.clientSecret;
  }, [webinarId, email, name, source]);

  if (alreadyPurchased) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">&#10004;</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">你已购买过此课程</h1>
          <p className="text-neutral-500">
            激活码已发送至 {email}，请检查你的邮箱（包括垃圾邮件文件夹）。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* Header */}
      <header className="border-b border-[#E8E5DE] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            &larr; 返回
          </button>
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            安全结账
          </div>
        </div>
      </header>

      {/* Countdown banner */}
      {countdownSeconds > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <CountdownTimer initialSeconds={countdownSeconds} />
        </div>
      )}

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12">
          {/* Left column — Marketing */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-6">
            {/* Headline */}
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-neutral-900 mb-2">
                你离财务自由，只差一个决定
              </h1>
              <p className="text-neutral-500 text-sm">
                加入 2,000+ 学员，跟着 Mike 用美股抄底存股双策略打造被动收入
              </p>
            </div>

            {/* Product summary card */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">课程套餐内容</h3>
              <ul className="space-y-3">
                <ValueItem text="美股抄底实战课程 (价值 NT$16,000)" />
                <ValueItem text="存股被动收入课程 (价值 NT$16,000)" />
                <ValueItem text="MIKE是麥克 APP 完整权限 (年费价值 NT$12,000)" />
                <ValueItem text="2,000+ 人美股操作社群 (价值 NT$6,000)" />
                <ValueItem text="Mike 亲自录制选股逻辑教学 (独家内容)" />
              </ul>
            </div>

            {/* Price display */}
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-neutral-400 line-through text-lg">NT$32,000</span>
                <span className="text-3xl font-bold text-neutral-900">NT$17,250</span>
              </div>
              <div className="inline-block bg-[rgba(184,149,63,0.08)] text-[#B8953F] text-sm font-medium px-3 py-1 rounded-md">
                立省 NT$14,750 (46% OFF)
              </div>
            </div>

            {/* Testimonial */}
            <div className="border-l-4 border-[#B8953F] bg-white rounded-r-lg p-5">
              <p className="text-sm text-neutral-600 italic mb-2">
                "跟着 Mike 学了三个月，现在每个月被动收入已经超过生活费了。课程内容非常实用！"
              </p>
              <p className="text-xs text-neutral-400">— 学员 Jason T.</p>
            </div>

            {/* Guarantee */}
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>30 天无理由退款保证</span>
            </div>
          </div>

          {/* Right column — Stripe Checkout */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-[#E8E5DE] p-1 min-h-[400px]">
              {error ? (
                <div className="p-6 text-center">
                  <p className="text-red-600 mb-4">{error}</p>
                  <button
                    onClick={() => { setError(''); window.location.reload(); }}
                    className="text-[#B8953F] underline text-sm"
                  >
                    重新结账
                  </button>
                </div>
              ) : (
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ fetchClientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              )}
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 text-xs text-neutral-400 py-2">
              <div className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                SSL 加密
              </div>
              <div className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Stripe 安全支付
              </div>
              <div className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                30天退款
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

**Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add "src/app/(public)/checkout/[webinarId]/page.tsx"
git commit -m "feat: add checkout page with embedded Stripe form"
```

---

## Task 9: Return / Success Page

**Files:**
- Create: `src/app/(public)/checkout/[webinarId]/return/page.tsx`

**Step 1: Create the return page**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CheckoutReturnPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [customerEmail, setCustomerEmail] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch(
          `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId!)}`
        );
        if (!res.ok) throw new Error('Failed to check status');
        const data = await res.json();

        if (data.status === 'complete') {
          setStatus('success');
          setCustomerEmail(data.customerEmail || '');
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }

    checkStatus();
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#B8953F] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">确认支付中...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-neutral-900 mb-3">结账页面已过期</h1>
          <p className="text-neutral-500 mb-6">请返回重新结账</p>
          <button
            onClick={() => window.history.back()}
            className="bg-[#B8953F] text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-[#A6842F] transition-colors"
          >
            重新结账
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Success animation */}
        <div className="w-20 h-20 rounded-full bg-[rgba(184,149,63,0.08)] flex items-center justify-center mx-auto mb-6">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#B8953F" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-3">
          恭喜你，迈出了最重要的一步！
        </h1>
        <p className="text-neutral-500 text-lg mb-2">
          你的课程激活码和详细设置步骤正在飞往你的邮箱
        </p>
        <p className="text-neutral-400 text-sm mb-8">
          请查收 <span className="font-medium text-neutral-600">{customerEmail}</span> 的收件箱（也检查垃圾邮件文件夹）
        </p>

        <div className="bg-white rounded-lg border border-[#E8E5DE] p-6 text-left text-sm text-neutral-500 space-y-2">
          <p className="font-medium text-neutral-700">接下来：</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>查收邮件中的激活码</li>
            <li>前往 CMoney 平台兑换</li>
            <li>开始学习课程</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add "src/app/(public)/checkout/[webinarId]/return/page.tsx"
git commit -m "feat: add checkout return/success page"
```

---

## Task 10: Store Email in localStorage at Registration

**Files:**
- Modify: `src/app/(public)/page.tsx` (lines 27-36, the `onSuccess` callback)

**Step 1: Add email to localStorage sticky**

In `src/app/(public)/page.tsx`, the `onSuccess` callback (lines 27-41) currently sets `parsed.registered = true` but does not store the email. Modify the `try` block inside `onSuccess` to also store the email:

Find this code (around line 32-34):

```typescript
        const parsed = JSON.parse(sticky);
        parsed.registered = true;
        localStorage.setItem(`webinar-${DEFAULT_WEBINAR_ID}-evergreen`, JSON.stringify(parsed));
```

Replace with:

```typescript
        const parsed = JSON.parse(sticky);
        parsed.registered = true;
        parsed.email = form.email;
        localStorage.setItem(`webinar-${DEFAULT_WEBINAR_ID}-evergreen`, JSON.stringify(parsed));
```

Note: `form` is the object returned by `useRegistrationForm()` (line 24). It exposes `form.email` which contains the current email value.

**Step 2: Verify the page compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit**

```bash
git add "src/app/(public)/page.tsx"
git commit -m "feat: store email in localStorage at registration"
```

---

## Task 11: Update Live Page CTA Handler

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx` (lines 315-318, the `handleCTAClick` function)

**Step 1: Rewrite `handleCTAClick`**

The current handler at line 315-318 only logs and tracks. Replace it with:

```typescript
  const handleCTAClick = useCallback((cta: CTAEvent) => {
    track('cta_click', { webinarId, buttonText: cta.buttonText, url: cta.url });

    // Read email from localStorage sticky
    let email = '';
    let userName = '';
    try {
      const sticky = localStorage.getItem(`webinar-${webinarId}-evergreen`);
      if (sticky) {
        const parsed = JSON.parse(sticky);
        email = parsed.email || '';
      }
    } catch { /* ignore */ }

    // Get name from URL search params
    userName = searchParams.get('name') || '';

    const params = new URLSearchParams();
    if (email) params.set('email', email);
    if (userName) params.set('name', userName);
    params.set('source', 'live');

    // Pass remaining countdown time if CTA has countdown
    if (cta.showCountdown && cta.hideAtSec) {
      const currentTime = playerRef.current?.currentTime?.() || 0;
      const remaining = Math.max(0, Math.round(cta.hideAtSec - currentTime));
      if (remaining > 0) params.set('t', remaining.toString());
    }

    // Open checkout in new tab (preserves livestream)
    window.open(`/checkout/${webinarId}?${params.toString()}`, '_blank');
  }, [webinarId, searchParams]);
```

Note: Verify that `searchParams` and `playerRef` are available in scope. `searchParams` comes from `useSearchParams()` (should be near the top of the component). `playerRef` is the ref to the Video.js player instance.

**Step 2: Verify `searchParams` is in scope**

Check the top of the component for `useSearchParams()`. It should already exist since the component reads `name` from URL params. If it reads params differently, adapt accordingly.

**Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add "src/app/(public)/webinar/[id]/live/page.tsx"
git commit -m "feat: CTA click opens internal checkout in new tab"
```

---

## Task 12: Update End Page CTA to Internal Checkout

**Files:**
- Modify: `src/app/(public)/webinar/[id]/end/page.tsx` (lines 89-102)

**Step 1: Add `useRouter` import and hook**

At line 4, add `useRouter` to the import:

```typescript
import { useParams, useSearchParams, useRouter } from 'next/navigation';
```

Inside the component, add after line 17 (`setCurrentUrl` line):

```typescript
  const router = useRouter();
```

**Step 2: Replace the CTA section**

Replace the CTA `<a>` tag block (lines 92-101) with:

```tsx
        {(webinar.endPageCtaText || firstCTA) && (
          <div className="mb-10">
            <Button
              variant="gold"
              size="lg"
              className="w-full"
              onClick={() => {
                // Read email from localStorage
                let email = '';
                try {
                  const sticky = localStorage.getItem(`webinar-${webinarId}-evergreen`);
                  if (sticky) {
                    const parsed = JSON.parse(sticky);
                    email = parsed.email || '';
                  }
                } catch { /* ignore */ }

                const params = new URLSearchParams();
                if (email) params.set('email', email);
                if (userName !== '观众') params.set('name', userName);
                params.set('source', 'end');

                router.push(`/checkout/${webinarId}?${params.toString()}`);
              }}
            >
              {webinar.endPageCtaText || firstCTA?.buttonText || '了解更多'}
            </Button>
          </div>
        )}
```

Note: This replaces the `<a target="_blank">` with an `onClick` + `router.push()` for same-tab navigation.

**Step 3: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit**

```bash
git add "src/app/(public)/webinar/[id]/end/page.tsx"
git commit -m "feat: end page CTA navigates to internal checkout"
```

---

## Task 13: Update Documentation

**Files:**
- Modify: `docs/architecture.md` — add checkout routes, Order data model, Stripe integration
- Modify: `docs/decisions.md` — append decision entry

**Step 1: Update `docs/architecture.md`**

Add a new section for checkout/payments covering:
- New routes: `/checkout/[webinarId]`, `/checkout/[webinarId]/return`
- New API routes: `/api/checkout/create-session`, `/api/checkout/session-status`, `/api/checkout/webhook`
- Order data model
- Stripe Embedded Checkout integration
- Webhook fulfillment flow

**Step 2: Append to `docs/decisions.md`**

```markdown
### 2026-03-05 — Stripe Embedded Checkout over Hosted/Custom

Chose Stripe Embedded Checkout (`ui_mode: 'embedded'`) over hosted redirect (loses user context) and custom Payment Element (more PCI scope). Embedded mode keeps users on our domain while Stripe handles PCI compliance. Activation codes generated server-side via webhook, delivered by email — return page only confirms payment, doesn't show codes.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: add checkout/payment architecture and decisions"
```

---

## Task 14: Build Verification + Manual Test

**Step 1: Verify full build**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Start dev server and verify pages load**

Run:
```bash
npm run dev
```

Then manually verify:
1. Visit `http://localhost:3000/checkout/1` — page should load with marketing copy on left. Stripe form will fail without valid env vars, but page structure should render.
2. Visit `http://localhost:3000/checkout/1/return?session_id=test` — should show error/expired state (expected with fake session ID).

**Step 3: (When Stripe keys are configured) Full integration test**

1. Install Stripe CLI: `stripe login`
2. Forward webhooks: `stripe listen --forward-to localhost:3000/api/checkout/webhook`
3. Copy the webhook signing secret to `.env.local` as `STRIPE_WEBHOOK_SECRET`
4. Create a Price in Stripe Dashboard, copy price ID to `STRIPE_PRICE_ID`
5. Go through checkout with test card `4242 4242 4242 4242`
6. Verify: order created in `data/orders.json`, activation code generated, email sent (or console logged)
7. Test decline with `4000 0000 0000 9995`

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Stripe checkout integration"
```

---

## Task Dependency Graph

```
T1 (install) ─┬─> T2 (types + activation codes) ──> T3 (order CRUD)
               └─> T4 (stripe.ts + email) ──────────> T5 (create-session API)
                                                      T6 (session-status API)
                                                      T7 (webhook API)
                                                         │
T8 (checkout page) ──────────────────────────────────────┘
T9 (return page)
T10 (localStorage email) ──> T11 (live CTA) ──> T12 (end CTA)
T13 (docs) — after all code tasks
T14 (verification) — after everything
```

**Parallelizable groups:**
- T2 + T4 can run in parallel (no shared files)
- T5, T6, T7 can run in parallel (separate API route files)
- T8 + T9 can run in parallel (separate page files)
- T10, T11, T12 must be sequential (T10 first, then T11 and T12 can be parallel)
