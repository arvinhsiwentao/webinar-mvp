# Stripe Checkout Integration — Unified Implementation Plan

> Synthesized from 4 agent team reports: Technical Architect, UI Designer, Marketing Strategist, UX Lead
> Date: 2026-03-05
> Revised: 2026-03-05 — incorporated gap analysis findings

---

## Executive Summary

Add an internal Stripe checkout page to the webinar platform, replacing external CTA links. Users click the CTA during/after the livestream, land on a two-column checkout page (marketing copy + Stripe embedded form), pay, and receive an activation code + setup instructions via email.

**Key decisions:**
- **Stripe Embedded Checkout** (not hosted redirect, not custom Payment Element)
- **Same-tab navigation** from end page (`router.push`); **new tab** from live CTA (`window.open`) — preserves livestream
- **Email pre-filled** from localStorage (stored at registration)
- **Webhook-driven fulfillment** — activation code generated only after confirmed payment
- **Hardcoded zh-CN strings** — no i18n required for checkout pages
- **Return page is minimal** — just confirmation + "check your email"; email carries activation code + full setup instructions

---

## 1. Architecture Overview

### New Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/checkout/[webinarId]` | Page | Two-column checkout: marketing left + Stripe right |
| `/checkout/[webinarId]/return` | Page | Post-payment success/confirmation |
| `/api/checkout/create-session` | POST | Creates Stripe Checkout Session (embedded mode) |
| `/api/checkout/session-status` | GET | Checks session result for return page |
| `/api/checkout/webhook` | POST | Stripe webhook handler |

### New Files

```
src/
  app/
    (public)/
      checkout/
        [webinarId]/
          page.tsx                    # Checkout page (marketing + embedded Stripe)
          return/
            page.tsx                  # Success/confirmation page
    api/
      checkout/
        create-session/route.ts      # POST — create Stripe Checkout Session
        session-status/route.ts      # GET — verify session for return page
        webhook/route.ts             # POST — Stripe webhook
  lib/
    stripe.ts                        # Stripe client singleton
    activation-codes.ts              # Code generation (XXXX-XXXX-XXXX)
  components/
    checkout/
      ProductSummaryCard.tsx          # Bundle contents + image
      PriceDisplay.tsx               # Anchored pricing (original/sale/savings)
      CountdownBanner.tsx            # Urgency timer (carried from CTA)
      TrustBadges.tsx                # SSL + Stripe + refund badges
      GuaranteeBadge.tsx             # 30-day money-back guarantee
      TestimonialCard.tsx            # Student quote card
      CheckoutHeader.tsx             # Back nav + security indicator
data/
  orders.json                        # New data file (empty array init)
```

### NPM Dependencies

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

### Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 2. Data Model

### New `Order` interface (add to `src/lib/types.ts`)

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
  amount: number;             // cents
  currency: string;           // 'usd'
  metadata?: Record<string, string>;
  createdAt: string;
  paidAt?: string;
  fulfilledAt?: string;
}
```

### Activation Code Format

`XXXX-XXXX-XXXX` — 12 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no ambiguous 0/O/1/I/L). ~59.6 bits entropy.

---

## 3. User Flow

### Path A: CTA During Livestream (new tab)

```
Live Room → CTA overlay appears → User clicks CTA
  → handleCTAClick constructs internal URL (ignores cta.url)
  → window.open('/checkout/{webinarId}?email={email}&source=live&t={remainingSec}')
  → Checkout page loads with email pre-filled, countdown timer active
  → Stripe Embedded Checkout → Payment
  → Redirect to /checkout/{webinarId}/return?session_id={cs_xxx}
  → Success page shows: confirmation + "check your email"
```

Livestream continues playing in the original tab.

**Implementation note:** The current `handleCTAClick` (`live/page.tsx:315`) only logs/tracks.
It must be changed to construct the internal checkout URL and call `window.open()`.
The `cta.url` field is ignored — the checkout route is always `/checkout/{webinarId}`.

### Path B: CTA on End Page (same tab)

```
End Page → User clicks CTA
  → router.push('/checkout/{webinarId}?email={email}&source=end')
  → Same checkout flow as above
```

**Implementation note:** The current end page (`end/page.tsx:92-101`) uses an `<a target="_blank">`
tag pointing to `webinar.endPageCtaUrl`. This must be replaced with a Next.js `router.push()`
call to the internal checkout route for same-tab navigation.

### Path C: Email/Direct Link

```
Email link → /checkout/{webinarId}?email={email}&source=email
  → If no email param, show email input field
  → Same checkout flow
```

### Webhook Flow (async, server-side)

```
Stripe payment succeeds
  → POST /api/checkout/webhook (checkout.session.completed)
  → Verify signature
  → Look up order by stripeSessionId
  → Check idempotency (skip if already fulfilled)
  → Generate activation code
  → Update order: status='fulfilled', set activationCode, paidAt, fulfilledAt
  → Send email via SendGrid with activation code + step-by-step setup instructions
```

**Email is the primary delivery channel** for activation codes. The email includes:
- The activation code (XXXX-XXXX-XXXX)
- Step-by-step CMoney platform redemption instructions
- Direct links to the redemption page
- This is necessary because the signup/setup process is multi-step and needs a reference the user can return to

The return page does NOT show the activation code — it only confirms payment
succeeded and directs the user to check their email.

---

## 4. State Management

```
Registration (server) → localStorage (client) → URL params → Stripe metadata → Webhook

Registration:
  Stores: name, email, phone, webinarId, registrationId

localStorage (webinar-{id}-evergreen):
  ADD: email field at registration time (currently missing)
  Used to: pre-fill checkout email

URL query params (checkout page):
  ?email=xxx&source=live|end|email&t=120 (countdown seconds)

Stripe Session metadata:
  webinarId, email, registrationId, source

Webhook:
  Reads metadata to connect payment → order → email delivery
```

**Key change needed:** Store `email` in the existing localStorage evergreen sticky object during registration.

**Implementation note:** The localStorage sticky is initially set during slot fetch (`page.tsx:86-92`)
with fields `visitorId`, `assignedSlot`, `expiresAt`, `registered`, `registrationId` — but no `email`.
The `email` must be added in the `onSuccess` callback (`page.tsx:27-41`) where `registered` is set to `true`.
The `form` object from `useRegistrationForm` provides access to the email value at that point.

---

## 5. Checkout Page Design

### Desktop Layout (>=1024px)

Two-column grid: `grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12`

**Left column (sticky, marketing):**
1. ProductSummaryCard — course image + bundle contents checklist
2. PriceDisplay — original NT$32,000 → sale NT$17,250 (savings badge)
3. TestimonialCard — student quote with gold left border
4. GuaranteeBadge — 30-day money-back shield icon

**Right column (Stripe form):**
1. Order summary line (amount)
2. Stripe `<EmbeddedCheckout />` component
3. TrustBadges — SSL + Stripe + refund (horizontal row)

### Mobile Layout (<1024px)

Stacked: condensed marketing → Stripe form → trust badges

### Design Token Usage

| Element | Token |
|---------|-------|
| Page bg | `#FAFAF7` (--color-bg) |
| Cards | `#FFFFFF` (--color-surface) |
| Borders | `#E8E5DE` (--color-border) |
| CTA/accents | `#B8953F` (--color-gold) |
| Savings badge bg | `rgba(184,149,63,0.08)` (--color-gold-dim) |
| Countdown banner | `#1A1A1A` bg, `#B8953F` timer text |

### Stripe Appearance Theme

```typescript
const appearance = {
  theme: 'flat',
  variables: {
    colorPrimary: '#B8953F',
    colorBackground: '#FFFFFF',
    colorText: '#1A1A1A',
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
    borderRadius: '4px',
  },
  rules: {
    '.Input': { border: '1px solid #E8E5DE' },
    '.Input:focus': { border: '1px solid #B8953F', boxShadow: '0 0 0 2px rgba(184,149,63,0.15)' },
  },
};
```

---

## 6. Marketing Copy (zh-CN)

### Headline
> **你离财务自由，只差一个决定**
> 加入 2,000+ 学员，跟着 Mike 用美股抄底存股双策略打造被动收入

### Value Stack
```
✅ 美股抄底实战课程 (价值 NT$16,000)
✅ 存股被动收入课程 (价值 NT$16,000)
✅ MIKE是麥克 APP 完整权限 (年费价值 NT$12,000)
✅ 2,000+ 人美股操作社群 (价值 NT$6,000)
✅ Mike 亲自录制选股逻辑教学 (独家内容)
━━━━━━━━━
总价值: NT$50,000+ → 今日限时: NT$17,250
```

### CTA Button
> 立即加入，开启财务自由之路
> 🔒 30天无理由退款保证

### Success/Return Page (minimal — directs to email)
> 🎉 恭喜你，迈出了最重要的一步！
> 你的课程激活码和详细设置步骤正在飞往你的邮箱
> 请查收 {email} 的收件箱（也检查垃圾邮件文件夹）

Note: The return page does NOT display the activation code or setup steps.
The email is the authoritative delivery channel because the CMoney redemption
process is multi-step and users need a persistent reference they can revisit.

### Purchase Confirmation Email (primary delivery)
The email template must include:
> 🎉 恭喜你成功购买！
> 你的课程激活码: **XXXX-XXXX-XXXX**
>
> 📋 兑换步骤:
> 1. 前往 CMoney 平台
> 2. 登入/注册帐号
> 3. 输入激活码完成兑换
> 4. 开始学习课程
>
> 如有问题请联系客服

---

## 7. Edge Cases

| Edge Case | Handling |
|-----------|---------|
| Already purchased (same email) | Check orders.json before creating session. Show "你已购买过此课程" with resend option. |
| Payment fails | Stripe handles retry UI within embedded checkout. |
| Tab closed during payment | Session persists 24h. User can return to checkout page. |
| Session expired | Show "结账页面已过期" with "重新结账" button. |
| Webhook fails | Return page session-status endpoint triggers fulfillment as backup (generates code + sends email if not already fulfilled). |
| localStorage cleared | Email field shows empty — user types it manually. |
| Countdown expires on checkout | Show "限时优惠" badge without timer. Don't actually raise price. |

---

## 8. Security Checklist

- [ ] Webhook signature verification via `stripe.webhooks.constructEvent()`
- [ ] Raw body parsing (`request.text()` not `request.json()`) for webhook
- [ ] Price set server-side only (STRIPE_PRICE_ID) — never from client
- [ ] Idempotent webhook handler (check `status !== 'fulfilled'` before processing)
- [ ] STRIPE_SECRET_KEY never exposed to client (no NEXT_PUBLIC_ prefix)
- [ ] Activation code uniqueness check before storing
- [ ] Duplicate purchase check by email + webinarId

---

## 9. Files Modified (Existing)

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `Order`, `OrderStatus` interfaces |
| `src/lib/db.ts` | Add order CRUD functions + `data/orders.json` init |
| `src/lib/email.ts` | Add `purchaseConfirmationEmail()` template |
| `src/app/(public)/page.tsx` | Store `email` in localStorage at registration |
| `src/app/(public)/webinar/[id]/live/page.tsx` | Rewrite `handleCTAClick` (line 315): construct internal `/checkout/{webinarId}` URL with email/source/t params, call `window.open()` |
| `src/app/(public)/webinar/[id]/end/page.tsx` | Replace `<a target="_blank">` CTA (lines 92-101) with `router.push('/checkout/{webinarId}')` for same-tab navigation |
| `package.json` | Add stripe dependencies |
| `next.config.ts` | No changes needed |

---

## 10. Implementation Order (Recommended)

### Phase 1: Foundation (no UI yet)
1. `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`
2. Create `src/lib/stripe.ts` — Stripe client singleton
3. Create `src/lib/activation-codes.ts` — code generation
4. Add `Order` type to `src/lib/types.ts`
5. Add order CRUD to `src/lib/db.ts` + init `data/orders.json`
6. Add email template to `src/lib/email.ts`

### Phase 2: API Routes
7. Create `POST /api/checkout/create-session`
8. Create `GET /api/checkout/session-status`
9. Create `POST /api/checkout/webhook`

### Phase 3: Checkout Pages
10. Create `/checkout/[webinarId]/page.tsx` — checkout page with embedded Stripe
11. Create `/checkout/[webinarId]/return/page.tsx` — success page
12. Create checkout components (ProductSummaryCard, PriceDisplay, etc.)

### Phase 4: Integration
13. Store email in localStorage at registration
14. Update live page CTA handler to open checkout in new tab
15. Update end page CTA to link to internal checkout
16. Update `docs/architecture.md`

### Phase 5: Testing
17. Install Stripe CLI, forward webhooks to localhost
18. Test with `4242 4242 4242 4242` (success) and `4000 0000 0000 9995` (decline)
19. Verify full flow: CTA click → checkout → payment → webhook → email

---

## 11. Known Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| JSON file race condition on `orders.json` (webhook + session-status writing simultaneously) | Low | Idempotency check (`status !== 'fulfilled'`) prevents double-processing. Acceptable for MVP; PostgreSQL migration eliminates this. |
| `webinarId` format mismatch (URL uses `1`, DB generates `1741234567890-abc1234`) | Medium | `getWebinarById()` already handles both formats (numeric index fallback). Checkout routes inherit this behavior. |
| SendGrid not configured in dev | Low | Email service degrades to `console.log`. Activation code is still generated and stored in `orders.json` — can be retrieved from admin or server logs. |
| CountdownBanner timer drift (snapshot `?t=` param doesn't sync with live room) | Low | Timer is cosmetic urgency only. When it expires, show static "限时优惠" badge. Price never changes. |
| No admin UI for orders | Low | Defer to Phase 2. Orders are viewable in `data/orders.json` directly for MVP. |
