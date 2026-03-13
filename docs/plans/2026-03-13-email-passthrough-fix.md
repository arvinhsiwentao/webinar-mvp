# Email Passthrough Fix — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure the user's email is available at checkout regardless of entry point (registration, email link, calendar link, shared URL).

**Architecture:** Thread `email` as a URL search param through the entire page chain (email/calendar → lobby → live → checkout). Use localStorage as primary source, URL param as fallback, and an inline email input as last resort on the checkout page.

**Tech Stack:** Next.js App Router, React, URLSearchParams, localStorage

---

## Entry Points Analysis

| Entry Point | Email Available? | Fix |
|---|---|---|
| Register → Lobby → Live | localStorage (fragile) | Add email to lobby→live URL |
| Email link → Lobby → Live | **NO** | Add email to buildEmailLink params |
| Calendar (ICS/Google) → Lobby → Live | **NO** | Add email to getLobbyUrlWithUtm |
| Direct/shared link → Live | **NO** | Checkout fallback UI |

## Data Flow (After Fix)

```
Registration API → buildEmailLink(email) → Lobby URL has ?email=
Lobby reads ?email= → passes to Live URL → passes to Checkout URL
Live/End read email: localStorage first, then ?email= fallback
Checkout: URL param → if missing, show inline email input
```

---

### Task 1: Add `email` to email links (server-side)

**Files:**
- Modify: `src/app/api/register/route.ts:96-105`
- Modify: `src/app/api/cron/reminders/route.ts:28-34`

**Step 1: Add email to confirmation email link params**

In `register/route.ts`, add `email: body.email` to the params object passed to `buildEmailLink`:

```typescript
const liveUrl = buildEmailLink(
  baseUrl,
  `/webinar/${resolvedWebinarId}/lobby`,
  {
    name: body.name,
    email: body.email,
    ...(body.assignedSlot ? { slot: body.assignedSlot } : {}),
  },
  'confirmation',
  { utmSource: body.utmSource, utmMedium: body.utmMedium, utmCampaign: body.utmCampaign, utmContent: body.utmContent, gclid: body.gclid }
);
```

**Step 2: Add email to reminder email link params**

In `cron/reminders/route.ts`, add `email: reg.email` to the params:

```typescript
const liveUrl = buildEmailLink(
  baseUrl,
  `/webinar/${webinar.id}/lobby`,
  { name: reg.name, email: reg.email, slot: reg.assignedSlot },
  type === '24h' ? 'reminder_24h' : 'reminder_1h',
  { utmSource: reg.utmSource, utmMedium: reg.utmMedium, utmCampaign: reg.utmCampaign, utmContent: reg.utmContent, gclid: reg.gclid }
);
```

**Step 3: Verify** — `npm run build` passes.

**Step 4: Commit**

---

### Task 2: Thread `email` through Lobby page (lobby → live, lobby → end, calendar links)

**Files:**
- Modify: `src/app/(public)/webinar/[id]/lobby/page.tsx`

**Step 1: Read email from searchParams**

After line 18 (`const slotTime = ...`), add:

```typescript
const userEmail = searchParams.get('email') || '';
```

**Step 2: Add email to `buildLiveUrl`**

Update `buildLiveUrl` (line 137-140) to include email:

```typescript
const buildLiveUrl = useCallback(() => {
  const slotParam = resolvedSlot ? `&slot=${encodeURIComponent(resolvedSlot)}` : '';
  const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
  return `/webinar/${webinarId}/live?name=${encodeURIComponent(userName)}${slotParam}${emailParam}`;
}, [webinarId, userName, resolvedSlot, userEmail]);
```

**Step 3: Add email to lobby→live redirect (line 107)**

```typescript
router.push(`/webinar/${webinarId}/live?name=${encodeURIComponent(userName)}${slotParam}&email=${encodeURIComponent(userEmail)}`);
```

Actually, cleaner: just use the same pattern but ensure email is included. Update the redirect at line 104-108:

```typescript
const slotParam = `&slot=${encodeURIComponent(effectiveSlot)}`;
const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
router.push(`/webinar/${webinarId}/live?name=${encodeURIComponent(userName)}${slotParam}${emailParam}`);
```

**Step 4: Add email to lobby→end redirect (line 292)**

```typescript
const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : '';
router.replace(`/webinar/${webinarId}/end?name=${encodeURIComponent(userName)}${emailParam}`);
```

**Step 5: Add email to `getLobbyUrlWithUtm` for calendar links (line 209-235)**

After `if (userName && userName !== '观众') url.searchParams.set('name', userName);` (line 212), add:

```typescript
if (userEmail) url.searchParams.set('email', userEmail);
```

**Step 6: Verify** — `npm run build` passes.

**Step 7: Commit**

---

### Task 3: Live page — read email from URL param as fallback

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx:259-286`

**Step 1: Update `handleCTAClick` to use URL email as fallback**

Replace the email-reading block (lines 259-268) in `handleCTAClick`:

```typescript
// Read email: localStorage first, URL param fallback
let email = '';
let userName = '';
try {
  const sticky = localStorage.getItem(`webinar-${webinarId}-evergreen`);
  if (sticky) {
    const parsed = JSON.parse(sticky);
    email = parsed.email || '';
  }
} catch { /* ignore */ }

// Fallback to URL search param (email link / calendar entry flow)
if (!email) {
  email = searchParams.get('email') || '';
}

// Get name from URL search params
userName = searchParams.get('name') || '';
```

**Step 2: Verify** — `npm run build` passes.

**Step 3: Commit**

---

### Task 4: End page — read email from URL param as fallback

**Files:**
- Modify: `src/app/(public)/webinar/[id]/end/page.tsx:120-135`

**Step 1: Read email from URL param**

Add after line 14 (`const userName = ...`):

```typescript
const userEmail = searchParams.get('email') || '';
```

**Step 2: Update CTA click handler to use URL email as fallback**

Replace the email-reading block (lines 120-128):

```typescript
// Read email: localStorage first, URL param fallback
let email = '';
try {
  const sticky = localStorage.getItem(`webinar-${webinarId}-evergreen`);
  if (sticky) {
    const parsed = JSON.parse(sticky);
    email = parsed.email || '';
  }
} catch { /* ignore */ }

if (!email) {
  email = userEmail;
}
```

**Step 3: Verify** — `npm run build` passes.

**Step 4: Commit**

---

### Task 5: Checkout page — graceful email fallback UI

**Files:**
- Modify: `src/app/(public)/checkout/[webinarId]/page.tsx`

**Step 1: Add email input state when email is missing**

Replace the simple email extraction (line 69) with stateful email handling:

```typescript
const urlEmail = searchParams.get('email') || '';
const source = searchParams.get('source') || 'direct';
const countdownSeconds = parseInt(searchParams.get('t') || '0', 10);
const name = searchParams.get('name') || '';

const [email, setEmail] = useState(urlEmail);
const [emailSubmitted, setEmailSubmitted] = useState(!!urlEmail);
const [error, setError] = useState('');
const [alreadyPurchased, setAlreadyPurchased] = useState(false);
```

**Step 2: Guard fetchClientSecret — only call when email is present**

Update `fetchClientSecret` to use the stateful `email`:

```typescript
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
```

**Step 3: Add email collection UI before Stripe checkout**

When `!emailSubmitted`, render an email input form instead of the Stripe embed. Add this before the Stripe checkout section:

```tsx
// If no email, show collection form before Stripe checkout
if (!emailSubmitted) {
  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      {/* Same header */}
      <header className="border-b border-[#E8E5DE] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            安全结账
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-16">
        <div className="bg-white rounded-lg border border-[#E8E5DE] p-8 text-center">
          <h2 className="text-xl font-bold text-neutral-900 mb-2">请输入邮箱以继续</h2>
          <p className="text-sm text-neutral-500 mb-6">我们需要你的邮箱来处理订单和发送课程信息</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const trimmed = email.trim();
            if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
              setError('请输入有效的邮箱地址');
              return;
            }
            setError('');
            setEmail(trimmed);
            setEmailSubmitted(true);
          }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-[#E8E5DE] rounded-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#B8953F] focus:ring-1 focus:ring-[#B8953F] mb-3"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <button
              type="submit"
              className="w-full bg-[#B8953F] hover:bg-[#A6842F] text-white font-medium py-3 rounded-lg transition-colors"
            >
              继续结账
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
```

**Step 4: Verify** — `npm run build` passes.

**Step 5: Commit**

---

### Task 6: Build verification and cleanup

**Step 1:** Run `npm run build` to verify no TypeScript/build errors.

**Step 2:** Manual smoke test:
- Open `/checkout/{webinarId}?name=test&source=live` (no email) → should show email input
- Enter email → should proceed to Stripe checkout
- Open `/checkout/{webinarId}?name=test&email=test@test.com&source=live` → should go straight to Stripe

**Step 3:** Final commit with all changes if any remain.
