# Database Integrity Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix data integrity gaps in the checkout fulfillment pipeline, registration error handling, database schema management, and legacy cleanup.

**Architecture:** Seven independent tasks ordered by business impact. Tasks 1-3 fix real data-loss or revenue-loss risks. Tasks 4-5 add operational visibility. Task 6 sets up schema versioning. Task 7 removes dead code and files.

**Tech Stack:** Next.js API routes (TypeScript), Supabase (Postgres), Stripe webhooks, Google Sheets API

**No test framework configured** — this project has no tests. Steps that say "verify" mean manual verification via `npm run build` + runtime check, not automated tests.

---

### Task 1: Make checkout fulfillment idempotent and single-path

**Problem:** Two routes run the same fulfillment logic (webhook + session-status poll). If both fire at once, `claimActivationCode()` runs twice — consuming two codes for one order. Also, if code claim succeeds but `updateOrder()` fails, the code is consumed but order stays pending forever.

**Files:**
- Modify: `src/app/api/checkout/webhook/route.ts`
- Modify: `src/app/api/checkout/session-status/route.ts`

**Step 1: Add optimistic lock to webhook fulfillment**

In `src/app/api/checkout/webhook/route.ts`, replace the current check-then-update pattern with an atomic status transition. Before claiming the code, atomically set status to `'paid'` (only if currently `'pending'`). This prevents the session-status route from also fulfilling.

Replace lines 39-55 with:

```typescript
// Idempotency: skip if already fulfilled
if (order.status === 'fulfilled') {
  console.log('[Webhook] Order already fulfilled:', order.id);
  return NextResponse.json({ received: true });
}

// Atomic lock: set status to 'paid' only if still 'pending'
// This prevents the session-status backup from also fulfilling
const locked = await updateOrderStatus(order.id, 'pending', 'paid');
if (!locked) {
  console.log('[Webhook] Order already being processed:', order.id);
  return NextResponse.json({ received: true });
}

try {
  const paymentIntentId = session.payment_intent as string;
  const code = await claimActivationCode(paymentIntentId || order.id, order.email);

  const now = new Date().toISOString();
  await updateOrder(order.id, {
    status: 'fulfilled',
    activationCode: code,
    stripePaymentIntentId: paymentIntentId,
    paidAt: now,
    fulfilledAt: now,
  });
} catch (err) {
  // Rollback: restore to pending so it can be retried
  await updateOrder(order.id, { status: 'pending' });
  console.error('[Webhook] Fulfillment failed, rolled back to pending:', err);
  // Return 500 so Stripe retries this webhook
  return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 });
}
```

**Step 2: Add `updateOrderStatus` to db.ts**

Add a new function to `src/lib/db.ts` that atomically updates status only if the current status matches:

```typescript
export async function updateOrderStatus(
  id: string,
  fromStatus: string,
  toStatus: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status: toStatus })
    .eq('id', id)
    .eq('status', fromStatus)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
```

Update the import in webhook/route.ts to include `updateOrderStatus`.

**Step 3: Remove fulfillment logic from session-status route**

In `src/app/api/checkout/session-status/route.ts`, remove lines 17-43 (the entire fulfillment block). Replace with a read-only status check:

```typescript
if (session.status === 'complete') {
  const order = await getOrderBySessionId(sessionId);
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
```

Remove the unused imports: `claimActivationCode`, `sendEmail`, `purchaseConfirmationEmail`, `updateOrder`.

**Step 4: Verify build**

Run: `npm run build`
Expected: Clean build, no type errors.

**Step 5: Commit**

```bash
git add src/lib/db.ts src/app/api/checkout/webhook/route.ts src/app/api/checkout/session-status/route.ts
git commit -m "fix: make checkout fulfillment idempotent with atomic status lock

Remove duplicate fulfillment from session-status route.
Webhook is now the single fulfillment path with rollback on failure."
```

---

### Task 2: Handle duplicate registration constraint gracefully

**Problem:** If two requests for the same email arrive simultaneously, the DB unique constraint fires but the app returns a generic 500 instead of a friendly 409.

**Files:**
- Modify: `src/app/api/register/route.ts`

**Step 1: Catch the unique constraint violation**

In `src/app/api/register/route.ts`, wrap the `createRegistration` call (line 71) in a try/catch that handles Supabase's unique violation error code `23505`:

```typescript
let registration;
try {
  registration = await createRegistration(registrationData as Parameters<typeof createRegistration>[0]);
} catch (err: unknown) {
  // Supabase returns code '23505' for unique constraint violations
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
    const existingReg = await getRegistrationByEmail(resolvedWebinarId, body.email);
    return NextResponse.json(
      { error: 'This email is already registered for this webinar', registration: existingReg },
      { status: 409 }
    );
  }
  throw err; // Re-throw other errors
}
```

This replaces the current line 71:
```typescript
const registration = await createRegistration(registrationData as Parameters<typeof createRegistration>[0]);
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/app/api/register/route.ts
git commit -m "fix: return 409 on duplicate registration constraint violation

Catches Postgres unique constraint error (23505) and returns
a user-friendly 409 instead of a generic 500."
```

---

### Task 3: Add missing database indexes

**Problem:** Frequently queried columns lack indexes. Won't cause issues now but will at scale.

**Files:**
- Create: `scripts/add-indexes.sql`

**Step 1: Write the migration SQL**

```sql
-- Performance indexes for frequently queried columns
-- Safe to run multiple times (IF NOT EXISTS)

-- Registration lookups by email (duplicate checks, search)
create index if not exists idx_registrations_email on registrations(email);

-- Activation code lookups during fulfillment verification
create index if not exists idx_orders_activation_code on orders(activation_code);

-- Chat messages ordered by creation time (SSE streaming)
create index if not exists idx_chat_messages_created_at on chat_messages(created_at);

-- Video files ordered by upload time (admin library listing)
create index if not exists idx_video_files_uploaded_at on video_files(uploaded_at);
```

**Step 2: Apply via Supabase MCP**

Run the SQL using `mcp__supabase__execute_sql` against the project.

**Step 3: Commit**

```bash
git add scripts/add-indexes.sql
git commit -m "perf: add missing indexes on registrations, orders, chat_messages, video_files"
```

---

### Task 4: Repurpose events table as server-side audit log

**Problem:** No server-side record of business events. If GA4 fails, data is lost. The `events` table already exists but nothing writes to it.

**Files:**
- Create: `src/lib/audit.ts`
- Modify: `src/app/api/register/route.ts`
- Modify: `src/app/api/checkout/webhook/route.ts`

**Step 1: Create the audit log utility**

Create `src/lib/audit.ts`:

```typescript
import { supabase } from './supabase';

type AuditEvent =
  | { type: 'registration_created'; webinarId: string; email: string; registrationId: string }
  | { type: 'order_created'; webinarId: string; email: string; orderId: string; amount: number }
  | { type: 'order_fulfilled'; orderId: string; activationCode: string }
  | { type: 'order_fulfillment_failed'; orderId: string; error: string }
  | { type: 'email_sent'; to: string; template: string }
  | { type: 'email_failed'; to: string; template: string; error: string }
  | { type: 'webhook_sent'; url: string; status: number }
  | { type: 'webhook_failed'; url: string; error: string };

export function audit(event: AuditEvent): void {
  // Fire and forget — audit logging should never block the request
  supabase
    .from('events')
    .insert({ data: event })
    .then(({ error }) => {
      if (error) console.error('[audit] Failed to log event:', error);
    });
}
```

**Step 2: Add audit calls to register route**

In `src/app/api/register/route.ts`, add `import { audit } from '@/lib/audit';` and insert after successful registration (after line 71):

```typescript
audit({ type: 'registration_created', webinarId: resolvedWebinarId, email: body.email, registrationId: registration.id });
```

Replace the webhook fire-and-forget block (lines 84-98) to log success/failure:

```typescript
if (webinar.webhookUrl) {
  fetch(webinar.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'registration',
      webinar: { id: webinar.id, title: webinar.title },
      registration: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        registeredAt: new Date().toISOString(),
      },
    }),
  })
    .then(res => audit({ type: 'webhook_sent', url: webinar.webhookUrl!, status: res.status }))
    .catch(err => audit({ type: 'webhook_failed', url: webinar.webhookUrl!, error: String(err) }));
}
```

**Step 3: Add audit calls to webhook route**

In `src/app/api/checkout/webhook/route.ts`, add `import { audit } from '@/lib/audit';` and:

After successful fulfillment (after `updateOrder`):
```typescript
audit({ type: 'order_fulfilled', orderId: order.id, activationCode: code });
```

In the catch block (after rollback):
```typescript
audit({ type: 'order_fulfillment_failed', orderId: order.id, error: String(err) });
```

**Step 4: Verify build**

Run: `npm run build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add src/lib/audit.ts src/app/api/register/route.ts src/app/api/checkout/webhook/route.ts
git commit -m "feat: add server-side audit logging for business events

Repurposes the existing events table. Logs registration,
fulfillment, webhook delivery, and email send outcomes."
```

---

### Task 5: Add audit logging for email sends

**Problem:** Email sends are fire-and-forget with no record of success or failure.

**Files:**
- Modify: `src/lib/email.ts`

**Step 1: Add audit logging to sendEmail**

In `src/lib/email.ts`, import audit and wrap the send call to log outcomes. Find the `sendEmail` function and add audit calls after the fetch response:

```typescript
import { audit } from './audit';
```

After a successful send (HTTP 2xx response from SendGrid), add:
```typescript
audit({ type: 'email_sent', to: params.to, template: params.subject });
```

After a failed send (non-2xx or fetch error), add:
```typescript
audit({ type: 'email_failed', to: params.to, template: params.subject, error: `HTTP ${response.status}` });
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: add audit logging for email send success/failure"
```

---

### Task 6: Set up Supabase migration management

**Problem:** Schema changes are manual. No version-controlled migration history.

**Files:**
- Create: `supabase/migrations/00001_initial_schema.sql`

**Step 1: Create the migrations directory and initial migration**

Copy `scripts/supabase-schema.sql` to `supabase/migrations/00001_initial_schema.sql`. This establishes a baseline so future changes can be tracked as numbered migrations.

**Step 2: Add a README note**

Add a comment at the top of the migration file:

```sql
-- Initial schema baseline (copied from scripts/supabase-schema.sql)
-- This migration was already applied manually. It exists here as a baseline
-- for version-controlled schema management going forward.
--
-- Future migrations: create new files as 00002_description.sql, 00003_description.sql, etc.
-- Apply via: mcp__supabase__apply_migration or psql
```

**Step 3: Create the indexes migration**

Create `supabase/migrations/00002_add_performance_indexes.sql` with the content from Task 3's SQL.

**Step 4: Commit**

```bash
git add supabase/
git commit -m "chore: set up versioned migration directory with baseline + indexes"
```

---

### Task 7: Clean up legacy artifacts

**Problem:** Dead files in `data/` and an empty API route folder add confusion.

**Files:**
- Delete: `data/events.json`
- Delete: `data/orders.json`
- Delete: `data/chat-messages.json`
- Delete: `data/registrations.json`
- Delete: `data/webinars.json.tmp`
- Delete: `src/app/api/track/` (empty folder)

**Keep:** `data/webinars.json` (seed data reference for webinar ID 1 structure), `data/subtitle-generation.ndjson` (active diagnostic logs).

**Step 1: Delete dead files**

```bash
rm data/events.json data/orders.json data/chat-messages.json data/registrations.json data/webinars.json.tmp
rm -rf src/app/api/track/
```

**Step 2: Verify no runtime references**

Run: `grep -r "events.json\|orders.json\|chat-messages.json\|registrations.json" src/`
Expected: No matches (only `scripts/migrate-to-supabase.ts` should reference these, which is fine).

**Step 3: Verify build**

Run: `npm run build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove legacy JSON data files and empty /api/track folder

These files were artifacts from the pre-Supabase migration.
No runtime code references them."
```

---

## Out of Scope (noted, not planned)

- **RLS policies:** Not needed while all access is server-side via service role key. Becomes critical if client-side Supabase SDK is ever introduced.
- **Soft-delete for webinars:** Would preserve order history after deletion. Not urgent since cascade delete is intentional and admin panel has in-use check for videos.
- **Chat message moderation:** No delete endpoint exists. Add when spam becomes a real issue.
