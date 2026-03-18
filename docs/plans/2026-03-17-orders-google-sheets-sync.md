# Orders → Google Sheets Daily Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically sync all orders from Supabase to a Google Sheet daily, so the team can view order data without database access.

**Architecture:** New API route `/api/cron/orders-sync` queries all orders via existing `getAllOrders()`, then writes them to a dedicated Google Sheet using the Sheets API v4. Protected by a `CRON_SECRET` bearer token. Triggered daily by an external HTTP cron service (cron-job.org). The same CRON_SECRET protection is also retrofitted onto the existing `/api/cron/reminders` endpoint.

**Tech Stack:** Next.js API route, `googleapis` (already installed), Supabase via `db.ts`, Google Sheets API v4 with existing service account.

---

### Task 1: Add CRON_SECRET verification helper

**Files:**
- Create: `src/lib/cron-auth.ts`

**Context:** Currently `/api/cron/reminders` has zero authentication — anyone with the URL can trigger it. We need a shared helper that both cron endpoints will use.

**Step 1: Create the helper**

```typescript
// src/lib/cron-auth.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify that a cron request carries a valid Bearer token matching CRON_SECRET.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function verifyCronSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron-auth] CRON_SECRET env var is not configured');
    return NextResponse.json(
      { error: 'Cron secret not configured' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null; // valid
}
```

**Step 2: Commit**

```bash
git add src/lib/cron-auth.ts
git commit -m "feat: add CRON_SECRET bearer token verification helper"
```

---

### Task 2: Secure existing reminders cron endpoint

**Files:**
- Modify: `src/app/api/cron/reminders/route.ts`

**Context:** Retrofit CRON_SECRET auth onto the existing unprotected reminders endpoint. The function signature changes from `GET()` to `GET(request: NextRequest)`.

**Step 1: Update the route**

Add import and auth check at the top of the GET handler:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getAllWebinars, getRegistrationsByWebinar } from '@/lib/db';
import { sendEmail, reminderEmail } from '@/lib/email';
import { buildEmailLink } from '@/lib/utils';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  // ... rest of existing logic unchanged ...
}
```

**Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/cron/reminders/route.ts
git commit -m "fix(security): add CRON_SECRET auth to reminders cron endpoint"
```

---

### Task 3: Add syncOrdersToSheet function

**Files:**
- Modify: `src/lib/google-sheets.ts`

**Context:** The file already has `getAuth()`, `formatDate()`, and the `claimActivationCode()` function. We add a new export `syncOrdersToSheet()` that writes all orders to a **separate** Google Sheet (different spreadsheet ID from the activation codes sheet). Following the existing pattern, the spreadsheet ID is hardcoded as a constant (same as `SPREADSHEET_ID` for activation codes).

The sheet columns will be:
`ID | Webinar ID | Email | Name | Status | Amount | Currency | Activation Code | Created At | Paid At | Fulfilled At`

**Step 1: Add the sync function to google-sheets.ts**

Append to `src/lib/google-sheets.ts`:

```typescript
const ORDERS_SPREADSHEET_ID = '1sba5HDJav8aUO5L59-JmkeV2QXp8F6gpR4PUOLXMqD8';
const ORDERS_SHEET_RANGE = 'Orders!A:K';

/**
 * Sync all orders to a Google Sheet.
 * Clears existing data (except header) and writes fresh rows.
 * Returns the number of rows written.
 */
export async function syncOrdersToSheet(
  orders: Order[]
): Promise<number> {
  const auth = getAuth();
  if (!auth) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not configured — cannot sync orders'
    );
  }

  const spreadsheetId = ORDERS_SPREADSHEET_ID;

  const sheets = google.sheets({ version: 'v4', auth });

  // Header row
  const header = [
    'ID', 'Webinar ID', 'Email', 'Name', 'Status',
    'Amount', 'Currency', 'Activation Code',
    'Created At', 'Paid At', 'Fulfilled At',
  ];

  // Map orders to row arrays
  const dataRows = orders.map(order => [
    order.id,
    order.webinarId,
    order.email,
    order.name,
    order.status,
    order.amount,
    order.currency,
    order.activationCode ?? '',
    order.createdAt,
    order.paidAt ?? '',
    order.fulfilledAt ?? '',
  ]);

  const allRows = [header, ...dataRows];

  // Clear existing data in the sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: ORDERS_SHEET_RANGE,
  });

  // Write all rows
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: ORDERS_SHEET_RANGE,
    valueInputOption: 'RAW',
    requestBody: {
      values: allRows,
    },
  });

  return dataRows.length;
}
```

Also add the import at the top of the file:

```typescript
import { Order } from './types';
```

**Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/google-sheets.ts
git commit -m "feat: add syncOrdersToSheet function for orders → Google Sheets export"
```

---

### Task 4: Create the orders-sync cron API route

**Files:**
- Create: `src/app/api/cron/orders-sync/route.ts`

**Context:** Follows the exact same pattern as `/api/cron/reminders/route.ts` — a GET endpoint protected by CRON_SECRET that performs a batch operation and returns a count.

**Step 1: Create the route**

```typescript
// src/app/api/cron/orders-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAllOrders } from '@/lib/db';
import { syncOrdersToSheet } from '@/lib/google-sheets';
import { verifyCronSecret } from '@/lib/cron-auth';

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const orders = await getAllOrders();
    const synced = await syncOrdersToSheet(orders);

    console.log(`[orders-sync] Synced ${synced} orders to Google Sheets`);
    return NextResponse.json({ synced });
  } catch (error) {
    console.error('[orders-sync] Failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

**Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/cron/orders-sync/route.ts
git commit -m "feat: add /api/cron/orders-sync endpoint for daily order export"
```

---

### Task 5: Manual integration test

**Context:** Before configuring external cron, verify the endpoint works end-to-end locally.

**Step 1: Set up env vars**

Add to `.env.local`:
```
CRON_SECRET=test-secret-change-in-production
```

The orders spreadsheet ID is hardcoded in `google-sheets.ts` as `ORDERS_SPREADSHEET_ID`.

**Step 2: Prepare the Google Sheet**

1. Create a new Google Sheet (or use an existing one)
2. Name the first sheet tab "Orders"
3. Share the sheet with the service account email (found in `GOOGLE_SERVICE_ACCOUNT_KEY` JSON → `client_email` field) — give "Editor" access

**Step 3: Start dev server and test**

Run: `npm run dev`

Then in another terminal:
```bash
curl -H "Authorization: Bearer test-secret-change-in-production" http://localhost:3000/api/cron/orders-sync
```

Expected response: `{"synced": <number>}` where number matches your orders count.

**Step 4: Verify the Google Sheet**

Open the Google Sheet — it should have a header row and all order data populated.

**Step 5: Test auth rejection**

```bash
curl http://localhost:3000/api/cron/orders-sync
```

Expected: `{"error": "Unauthorized"}` with status 401.

---

### Task 6: Update documentation

**Files:**
- Modify: `docs/architecture.md` — add the new API route to the routes listing
- Modify: `docs/decisions.md` — record the sync approach decision

**Step 1: Update architecture.md**

Add to the API routes section:
```markdown
- `cron/orders-sync/route.ts` — GET (daily orders → Google Sheets sync, CRON_SECRET protected)
```

**Step 2: Update decisions.md**

Append:
```markdown
### 2026-03-17: Orders → Google Sheets sync approach

**Decision:** External HTTP cron (cron-job.org) calling `/api/cron/orders-sync` with CRON_SECRET bearer auth.
**Why:** Zeabur is containerized (not serverless) so no Vercel Cron available. External HTTP cron is simplest, follows existing reminders pattern, and is free. Also retrofitted CRON_SECRET onto existing `/api/cron/reminders` which had no auth.
**Alternatives rejected:** node-cron (process-internal, harder to debug), Supabase Edge Functions (separate Deno runtime), Google Apps Script (split codebase).
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: add orders-sync route and decision record"
```

---

### Task 7: Configure external cron service

**Context:** This is a manual setup step, not code. Use cron-job.org (free tier supports unlimited jobs with 1-minute minimum interval).

**Step 1: Set production env var in Zeabur dashboard**

- `CRON_SECRET` — generate a strong random string (e.g., `openssl rand -hex 32`)

**Step 2: Register on cron-job.org**

1. Go to https://cron-job.org and create a free account
2. Create a new cron job:
   - **URL:** `https://<your-domain>/api/cron/orders-sync`
   - **Schedule:** `0 8 * * *` (daily at 08:00 UTC — midnight PST / 3am EST)
   - **Request method:** GET
   - **Headers:** Add `Authorization: Bearer <your-CRON_SECRET>`
   - **Enable notifications** for failures (optional but recommended)

**Step 3: (Optional) Also configure the reminders cron**

Update the existing reminders cron job (if configured) to include the `Authorization: Bearer <CRON_SECRET>` header. Without it, the reminders endpoint will now return 401.

- **URL:** `https://<your-domain>/api/cron/reminders`
- **Schedule:** `0 */6 * * *` (every 6 hours, or your preferred interval)
- **Headers:** `Authorization: Bearer <your-CRON_SECRET>`

---

## Environment Variables Summary

| Variable | Where | Purpose |
|----------|-------|---------|
| `CRON_SECRET` | Zeabur + cron-job.org + `.env.local` | Bearer token for cron endpoint auth |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Already configured | Service account credentials (reused) |

## Files Changed Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/cron-auth.ts` | Create | CRON_SECRET bearer verification helper |
| `src/app/api/cron/reminders/route.ts` | Modify | Add CRON_SECRET auth (security fix) |
| `src/lib/google-sheets.ts` | Modify | Add `syncOrdersToSheet()` function |
| `src/app/api/cron/orders-sync/route.ts` | Create | New cron endpoint for daily sync |
| `docs/architecture.md` | Modify | Document new route |
| `docs/decisions.md` | Modify | Record approach decision |
