# Stripe Integration Setup Guide

> Beginner-friendly guide for setting up Stripe payments in this project.
> Last updated: 2026-03-05

---

## Overview

Stripe has two sides: a **Dashboard** (web interface to manage your account) and an **API** (code connecting your website to Stripe). You need to set up both.

We use **Stripe Embedded Checkout** — Stripe's pre-built payment form that renders directly on our checkout page. Card details go straight to Stripe and never touch our server (PCI compliant).

---

## Step 1: Create a Stripe Account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) and click "Start now"
2. Enter email, full name, create a password
3. Verify your email

You do NOT need to activate your account or provide business details yet. **Test mode works immediately** — you can build and test the entire integration before providing any business info.

---

## Step 2: Test Mode vs Live Mode

Stripe has two completely separate environments:

| | Test Mode | Live Mode |
|---|---|---|
| **Purpose** | Development & testing | Real payments |
| **Money** | No real money moves | Real charges |
| **API Keys** | Start with `sk_test_` / `pk_test_` | Start with `sk_live_` / `pk_live_` |
| **Card numbers** | Use fake test cards (e.g. `4242...`) | Real credit cards only |
| **Dashboard** | Shows test transactions | Shows real transactions |

Toggle between modes using the account picker in the Dashboard (top-left). Keep "Test mode" ON while developing.

---

## Step 3: Get Your API Keys

API keys are passwords that let your code talk to Stripe. You need two:

| Key | Starts with | Where used | Visibility |
|-----|-------------|------------|------------|
| **Publishable Key** | `pk_test_` | Frontend (browser) | Safe to expose — can only load Stripe.js |
| **Secret Key** | `sk_test_` | Backend (server only) | **NEVER expose** — can charge cards, refund, etc. |

### How to find them

1. Log into [dashboard.stripe.com](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in top-left)
3. Go to **Developers** > **API keys**
4. Copy both keys into `.env.local` in the project root:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

### Why the `NEXT_PUBLIC_` prefix?

Next.js only exposes environment variables to the browser if they start with `NEXT_PUBLIC_`. The secret key must NEVER have this prefix — it stays server-side only.

---

## Step 4: Create Your Product & Price

Before charging anyone, Stripe needs to know what you're selling and how much it costs.

### In the Dashboard

1. Go to **More** > **Product catalog**
2. Click **+ Add product**
3. Fill in:
   - **Name:** e.g. `MIKE是麥克 美股投资课程 Bundle`
   - **Description:** (optional)
   - **Image:** (optional)
4. Under **Pricing:**
   - Select **One time** (not recurring)
   - Enter the price (e.g. `540` for US$540, or `17250` for NT$17,250)
   - Select currency (`USD` or `TWD`)
5. Click **Add product**

### Get the Price ID

After creating, you'll see a **Price ID** like `price_1Abc123DEF456`. Copy it:

```bash
# Add to .env.local
STRIPE_PRICE_ID=price_1Abc123DEF456
```

### Currency decision

Since the target audience is North American Chinese (paying in USD), consider setting the price in `USD`. Stripe displays whatever currency you configure here.

---

## Step 5: Install Stripe CLI

The Stripe CLI lets you test webhooks locally. Without it, Stripe can't reach `localhost:3000`.

### Windows installation

**Option A — Scoop (recommended):**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Option B — Direct download:**
1. Go to [github.com/stripe/stripe-cli/releases/latest](https://github.com/stripe/stripe-cli/releases/latest)
2. Download `stripe_X.X.X_windows_x86_64.zip`
3. Extract the zip
4. Add the folder containing `stripe.exe` to your system PATH

> Windows antivirus may flag it — this is a false positive.

### Login

```bash
stripe login
```

Opens your browser for authentication. Or use your API key directly:

```bash
stripe login --api-key sk_test_xxxxxxxxxxxxx
```

---

## Step 6: Set Up Local Webhook Forwarding

### What are webhooks?

Webhooks are Stripe's way of telling your server "someone just paid!" Without webhooks, your server would never know a payment succeeded and would never send the activation code email.

### How it works

```
User pays → Stripe processes → Stripe sends webhook → Your server handles it
                                    |
                         Production: directly to your public URL
                         Development: via Stripe CLI forwarding to localhost
```

### Start forwarding

```bash
stripe listen --forward-to localhost:3000/api/checkout/webhook
```

Output:
```
> Ready! Your webhook signing secret is whsec_1234567890abcdef...
```

Copy that `whsec_...` value:

```bash
# Add to .env.local
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef
```

**Keep this terminal running while developing.** It bridges Stripe to your localhost.

---

## Step 7: Understand the Payment Flow

What happens when a user clicks "Buy":

```
1. USER clicks CTA button
        |
2. FRONTEND calls: POST /api/checkout/create-session
        |
3. YOUR API calls Stripe: stripe.checkout.sessions.create()
   - Sends: price ID, customer email, return URL
   - Receives: client_secret
        |
4. API returns client_secret to frontend
        |
5. FRONTEND renders <EmbeddedCheckout /> with client_secret
   - Stripe's payment form appears on your page
   - Card details go DIRECTLY to Stripe (never touch your server)
        |
6. USER submits → Stripe processes payment
        |
7. Stripe redirects to: /checkout/[webinarId]/return?session_id=cs_xxx
        |
8. MEANWHILE (async): Stripe sends webhook to your server
   POST /api/checkout/webhook (event: checkout.session.completed)
        |
9. WEBHOOK HANDLER:
   - Verifies signature (security)
   - Creates order record
   - Generates activation code
   - Sends email with code
```

Steps 7 and 8 happen almost simultaneously but independently. The return page shows "check your email" while the webhook handler sends the email.

---

## Step 8: Test Cards

Stripe provides fake card numbers for testing:

| Scenario | Card Number |
|----------|-------------|
| Successful payment | `4242 4242 4242 4242` |
| Card declined | `4000 0000 0000 9995` |
| 3D Secure auth required | `4000 0025 0000 3155` |
| Insufficient funds | `4000 0000 0000 9995` |

For all test cards use:
- **Expiry:** Any future date (e.g. `12/34`)
- **CVC:** Any 3 digits (e.g. `123`)
- **ZIP:** Any 5 digits (e.g. `12345`)

**Never use real card numbers in test mode.** Stripe's terms prohibit it.

### Verify in Dashboard

After a test payment, check **Payments** in the Dashboard to confirm it appeared.

---

## Step 9: Production Webhook Setup (Later)

When deploying to production:

1. Deploy site to a public URL (e.g. `https://yoursite.com`)
2. In Dashboard → **Developers** → **Webhooks**
3. Click **Add endpoint**
4. URL: `https://yoursite.com/api/checkout/webhook`
5. Events: select `checkout.session.completed` and `checkout.session.expired`
6. Stripe gives a new `whsec_...` signing secret for production
7. Add to production environment variables

---

## Step 10: Go-Live Checklist

Before accepting real money:

- [ ] Activate Stripe account — provide business details + bank account for payouts
- [ ] Swap API keys — replace `sk_test_`/`pk_test_` with `sk_live_`/`pk_live_`
- [ ] Create product/price in Live mode (test mode products don't carry over)
- [ ] Set up production webhook endpoint in Dashboard
- [ ] Rotate API keys — generate fresh live keys right before launch
- [ ] Never commit API keys to git — use environment variables only
- [ ] Test with a real small purchase and refund it immediately
- [ ] Verify error handling — declined cards, invalid input, duplicate submissions

---

## Complete .env.local Reference

```bash
# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_...                      # Dashboard > Developers > API Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...     # Dashboard > Developers > API Keys
STRIPE_WEBHOOK_SECRET=whsec_...                    # From `stripe listen` command
STRIPE_PRICE_ID=price_...                          # Dashboard > Product Catalog > your product

# App
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Email (for sending activation codes)
SENDGRID_API_KEY=SG....
```

---

## Quick Action Checklist

| Step | Action | Time | Where |
|------|--------|------|-------|
| 1 | Create Stripe account | 2 min | [dashboard.stripe.com](https://dashboard.stripe.com) |
| 2 | Copy test API keys | 1 min | Dashboard > Developers > API Keys |
| 3 | Create Product + Price | 3 min | Dashboard > Product Catalog |
| 4 | Install Stripe CLI | 5 min | Terminal (scoop or download) |
| 5 | Run `stripe login` | 1 min | Terminal |
| 6 | Add keys to `.env.local` | 1 min | Code editor |

**Total prep time: ~15 minutes.**

---

## Key Security Rules

1. **Secret key (`sk_test_`/`sk_live_`)** — server-side only, never in frontend code, never in git
2. **Webhook signature verification** — always verify with `stripe.webhooks.constructEvent()`, use raw body (`request.text()` not `request.json()`)
3. **Price integrity** — never accept price/amount from the client; use `STRIPE_PRICE_ID` server-side
4. **Idempotent webhooks** — Stripe may send the same event multiple times; always check if order is already fulfilled before processing
5. **Raw body for webhooks** — JSON parsing alters the string and breaks signature verification

---

## NPM Packages Used

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

| Package | Purpose | Runtime |
|---------|---------|---------|
| `stripe` | Server-side SDK (API calls, webhook verification) | Server only |
| `@stripe/stripe-js` | Client-side Stripe.js loader (`loadStripe()`) | Client only |
| `@stripe/react-stripe-js` | React components (`EmbeddedCheckoutProvider`, `EmbeddedCheckout`) | Client only |

---

## Stripe Documentation Links

- [Embedded Checkout Quickstart](https://docs.stripe.com/checkout/embedded/quickstart)
- [Checkout Sessions API](https://docs.stripe.com/api/checkout/sessions)
- [Webhooks Guide](https://docs.stripe.com/webhooks)
- [Testing Guide](https://docs.stripe.com/testing)
- [Stripe CLI Install](https://docs.stripe.com/stripe-cli/install)
- [Go-Live Checklist](https://docs.stripe.com/get-started/checklist/go-live)
- [Product Catalog](https://docs.stripe.com/products-prices/manage-prices)
