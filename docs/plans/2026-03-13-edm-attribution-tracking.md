# EDM Attribution Tracking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Preserve original ad campaign attribution (utm/gclid) through the email link journey, so EDM-returning users can be traced back to their original campaign.

**Architecture:** At registration time, capture the user's current UTM/gclid params from the frontend and persist them on the `registrations` table. When generating email links (confirmation, reminder), append both EDM-specific UTM params and the original campaign params (prefixed `orig_`). On the frontend, `GclidPreserver` parses `orig_*` params and stores them. GA4 conversion events attach `original_*` custom dimensions alongside the standard attribution.

**Tech Stack:** Supabase migration (SQL), Next.js API routes, React hooks, GA4 dataLayer

---

### Task 1: Add attribution columns to registrations table

**Files:**
- Create: `supabase/migrations/00003_add_registration_attribution.sql`

**Step 1: Write the migration**

```sql
-- Add attribution columns to preserve original campaign source at registration time
alter table registrations add column if not exists utm_source text;
alter table registrations add column if not exists utm_medium text;
alter table registrations add column if not exists utm_campaign text;
alter table registrations add column if not exists utm_content text;
alter table registrations add column if not exists gclid text;
```

**Step 2: Apply the migration**

Run via Supabase MCP `apply_migration` or:
```bash
# If using supabase CLI locally:
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/00003_add_registration_attribution.sql
git commit -m "feat(db): add utm/gclid attribution columns to registrations"
```

---

### Task 2: Update Registration type and API to accept attribution

**Files:**
- Modify: `src/lib/types.ts:95-105` (Registration interface)
- Modify: `src/lib/types.ts:177-183` (RegisterRequest interface)
- Modify: `src/app/api/register/route.ts:56-61` (registration data construction)

**Step 1: Add attribution fields to Registration interface**

In `src/lib/types.ts`, add to `Registration` interface (before the closing `}`):

```typescript
export interface Registration {
  id: string;
  webinarId: string;
  assignedSlot?: string;
  slotExpiresAt?: string;
  reassignedFrom?: string;
  name: string;
  email: string;
  phone?: string;
  registeredAt: string;
  // Attribution (captured at registration time)
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  gclid?: string;
}
```

**Step 2: Add attribution fields to RegisterRequest**

```typescript
export interface RegisterRequest {
  webinarId: string;
  assignedSlot?: string;
  name: string;
  email: string;
  phone?: string;
  // Attribution params from client
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  gclid?: string;
}
```

**Step 3: Pass attribution through in register API route**

In `src/app/api/register/route.ts`, update the `registrationData` construction (around line 56):

```typescript
const registrationData: Record<string, unknown> = {
  webinarId: resolvedWebinarId,
  name: body.name,
  email: body.email,
  phone: body.phone,
  utmSource: body.utmSource,
  utmMedium: body.utmMedium,
  utmCampaign: body.utmCampaign,
  utmContent: body.utmContent,
  gclid: body.gclid,
};
```

Note: `camelToSnake` in `db.ts` will automatically convert `utmSource` → `utm_source` for the DB insert.

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/types.ts src/app/api/register/route.ts
git commit -m "feat(register): accept and store utm/gclid attribution params"
```

---

### Task 3: Send attribution from frontend registration form

**Files:**
- Modify: `src/components/registration/useRegistrationForm.ts:38-48` (fetch body)

**Step 1: Read attribution from cookies/sessionStorage and include in request body**

In `useRegistrationForm.ts`, update the fetch body inside the submit handler. Add a helper to read attribution (or import from a shared util). The simplest approach — read inline before the fetch:

```typescript
// Inside the submit handler, before the fetch call:
const getAttr = (key: string) => {
  try {
    return sessionStorage.getItem(key) || getCookieValue(key) || undefined;
  } catch { return undefined; }
};

const getCookieValue = (name: string) => {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const res = await fetch('/api/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    webinarId,
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim() || undefined,
    assignedSlot: assignedSlot || undefined,
    utmSource: getAttr('utm_source'),
    utmMedium: getAttr('utm_medium'),
    utmCampaign: getAttr('utm_campaign'),
    utmContent: getAttr('utm_content'),
    gclid: getAttr('gclid'),
  }),
});
```

Note: `GclidPreserver` already stores these in both sessionStorage and cookies, so we just read them.

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/registration/useRegistrationForm.ts
git commit -m "feat(registration): send utm/gclid attribution with registration request"
```

---

### Task 4: Append original attribution to email links

**Files:**
- Modify: `src/app/api/register/route.ts:90-92` (confirmation email URL)
- Modify: `src/app/api/cron/reminders/route.ts:26-27` (reminder email URL)

**Step 1: Create a shared URL helper**

Add to `src/lib/utils.ts`:

```typescript
/**
 * Build an email link URL with EDM utm params and original campaign attribution.
 * EDM gets its own utm_source/medium/campaign so GA4 tracks the email touchpoint.
 * Original campaign params are preserved as orig_* for cross-session attribution.
 */
export function buildEmailLink(
  baseUrl: string,
  path: string,
  params: Record<string, string>,
  emailType: string,
  attribution?: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; gclid?: string }
): string {
  const url = new URL(path, baseUrl);

  // Base params (name, slot, etc.)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  // EDM-specific UTM (so GA4 attributes this session to email)
  url.searchParams.set('utm_source', 'edm');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', emailType);

  // Original campaign attribution (preserved from registration)
  if (attribution?.utmSource) url.searchParams.set('orig_source', attribution.utmSource);
  if (attribution?.utmMedium) url.searchParams.set('orig_medium', attribution.utmMedium);
  if (attribution?.utmCampaign) url.searchParams.set('orig_campaign', attribution.utmCampaign);
  if (attribution?.utmContent) url.searchParams.set('orig_content', attribution.utmContent);
  if (attribution?.gclid) url.searchParams.set('orig_gclid', attribution.gclid);

  return url.toString();
}
```

**Step 2: Update confirmation email URL in register route**

In `src/app/api/register/route.ts`, replace the liveUrl construction (lines 90-92):

```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
const liveUrl = buildEmailLink(
  baseUrl,
  `/webinar/${resolvedWebinarId}/lobby`,
  {
    name: body.name,
    ...(body.assignedSlot ? { slot: body.assignedSlot } : {}),
  },
  'confirmation',
  { utmSource: body.utmSource, utmMedium: body.utmMedium, utmCampaign: body.utmCampaign, utmContent: body.utmContent, gclid: body.gclid }
);
```

Add import: `import { buildEmailLink } from '@/lib/utils';`

**Step 3: Update reminder email URL in cron route**

In `src/app/api/cron/reminders/route.ts`, replace the liveUrl construction (lines 26-27).
Need to read registration attribution from DB — the `reg` object already comes from DB query and will now include attribution fields:

```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const liveUrl = buildEmailLink(
  baseUrl,
  `/webinar/${webinar.id}/lobby`,
  { name: reg.name, slot: reg.assignedSlot },
  type === '24h' ? 'reminder_24h' : 'reminder_1h',
  { utmSource: reg.utmSource, utmMedium: reg.utmMedium, utmCampaign: reg.utmCampaign, utmContent: reg.utmContent, gclid: reg.gclid }
);
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/utils.ts src/app/api/register/route.ts src/app/api/cron/reminders/route.ts
git commit -m "feat(email): append original campaign attribution to EDM links"
```

---

### Task 5: Parse orig_* params on frontend and attach to GA4 events

**Files:**
- Modify: `src/components/analytics/GclidPreserver.tsx:19-42` (parse orig_* params)
- Modify: `src/lib/analytics.ts:49-58` (getAttribution reads orig_*)
- Modify: `src/lib/analytics.ts:70-82` (attach original_* to conversion events)

**Step 1: Extend GclidPreserver to capture orig_* params**

In `GclidPreserver.tsx`, add after the existing UTM handling (after line 41, before the `}, [searchParams]`):

```typescript
// Preserve original campaign attribution from EDM links
const origSource = searchParams.get('orig_source');
if (origSource) {
  const origMedium = searchParams.get('orig_medium') || '';
  const origCampaign = searchParams.get('orig_campaign') || '';
  const origContent = searchParams.get('orig_content') || '';
  const origGclid = searchParams.get('orig_gclid') || '';

  sessionStorage.setItem('orig_source', origSource);
  sessionStorage.setItem('orig_medium', origMedium);
  sessionStorage.setItem('orig_campaign', origCampaign);
  sessionStorage.setItem('orig_content', origContent);
  if (origGclid) {
    sessionStorage.setItem('orig_gclid', origGclid);
    setCookie('gclid', origGclid); // Restore original gclid to cookie too
  }
}
```

**Step 2: Update getAttribution in analytics.ts to include original_* params**

Replace the `getAttribution` function:

```typescript
/** Read attribution params from sessionStorage (fast) with cookie fallback (persistent). */
function getAttribution(): Record<string, string> {
  const attrs: Record<string, string> = {}

  // Current session attribution
  const keys = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
  for (const key of keys) {
    const value = sessionStorage.getItem(key) || getCookie(key)
    if (value) attrs[key] = value
  }

  // Original campaign attribution (from EDM links — survives cross-session)
  const origKeys = ['orig_source', 'orig_medium', 'orig_campaign', 'orig_content', 'orig_gclid']
  for (const key of origKeys) {
    const value = sessionStorage.getItem(key)
    if (value) attrs[`original_${key.replace('orig_', '')}`] = value
  }

  return attrs
}
```

This means conversion events will now automatically include params like `original_source`, `original_medium`, `original_campaign` etc. alongside the standard `utm_source`, `utm_medium`, `utm_campaign`.

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Manual test plan**

1. Visit landing page with `?utm_source=facebook&utm_campaign=campaignA`
2. Register → check Supabase `registrations` table has utm columns filled
3. Check confirmation email link has `utm_source=edm&utm_medium=email&utm_campaign=confirmation&orig_source=facebook&orig_campaign=campaignA`
4. Click EDM link → check browser console for GA4 events with `original_source=facebook`, `original_campaign=campaignA`

**Step 5: Commit**

```bash
git add src/components/analytics/GclidPreserver.tsx src/lib/analytics.ts
git commit -m "feat(tracking): attach original campaign attribution to GA4 conversion events"
```

---

### Task 6: Update docs

**Files:**
- Modify: `docs/architecture.md` (add attribution tracking section)
- Modify: `docs/decisions.md` (record the design decision)

**Step 1: Add to architecture.md**

Add a section under an appropriate heading:

```markdown
### Attribution Tracking (Cross-Session)

Registration captures the user's current UTM/gclid parameters and stores them on the `registrations` table. When generating EDM links (confirmation, reminder emails), the system appends:
- `utm_source=edm&utm_medium=email&utm_campaign={email_type}` — for GA4 to track the email touchpoint
- `orig_source`, `orig_medium`, `orig_campaign`, `orig_content`, `orig_gclid` — original campaign attribution preserved from registration

`GclidPreserver` parses both standard `utm_*` and `orig_*` params. GA4 conversion events automatically attach `original_*` custom dimensions via `getAttribution()` in `analytics.ts`.
```

**Step 2: Add decision to decisions.md**

```markdown
### 2026-03-13: EDM links preserve original campaign attribution via orig_* params

**Decision:** Store utm/gclid at registration time in DB. EDM links carry both edm-specific utm (for GA4 last-click) and orig_* params (for original campaign analysis).

**Why:** Without this, users returning via EDM lose their original ad campaign attribution, making it impossible to measure which campaign drove the eventual conversion. Alternative was to not set EDM utm at all (preserving original via cookies), but that prevents measuring EDM effectiveness separately.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: add attribution tracking architecture and decision"
```
