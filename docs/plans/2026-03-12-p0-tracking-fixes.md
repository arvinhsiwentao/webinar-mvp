# P0 Tracking Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the three P0 analytics bugs: broken GCLID/UTM attribution chain, hardcoded begin_checkout value, and join_group duplicate firing.

**Architecture:** All fixes are client-side only. We upgrade `GclidPreserver` to persist GCLID in a 90-day first-party cookie (not just sessionStorage). We modify `trackGA4()` to auto-attach stored attribution params to conversion events. We add a sessionStorage guard for `join_group` deduplication. We extract the hardcoded price `599` into a shared constant.

**Tech Stack:** React 19, Next.js 16, TypeScript, GA4 via GTM dataLayer

---

### Task 1: Upgrade GclidPreserver to use first-party cookies

**Why:** sessionStorage dies when the browser closes. Users who register today and return 3 days later to watch lose their GCLID. A 90-day first-party cookie survives across sessions, matching Google Ads' attribution window.

**Files:**
- Modify: `src/components/analytics/GclidPreserver.tsx`

**Step 1: Add cookie helper and upgrade storage**

Replace the full content of `src/components/analytics/GclidPreserver.tsx` with:

```tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const COOKIE_MAX_AGE = 90 * 24 * 60 * 60 // 90 days in seconds

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`
}

// Preserves gclid and UTM parameters in both cookie (90-day, survives
// browser close) and sessionStorage (fast reads within the session).
// Google Ads attribution window is 30-90 days, so sessionStorage alone
// is insufficient — it dies when the browser closes.
export function GclidPreserver() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const gclid = searchParams.get('gclid')
    const utmSource = searchParams.get('utm_source')

    if (gclid) {
      sessionStorage.setItem('gclid', gclid)
      setCookie('gclid', gclid)
    }
    if (utmSource) {
      const utmMedium = searchParams.get('utm_medium') || ''
      const utmCampaign = searchParams.get('utm_campaign') || ''
      const utmContent = searchParams.get('utm_content') || ''

      sessionStorage.setItem('utm_source', utmSource)
      sessionStorage.setItem('utm_medium', utmMedium)
      sessionStorage.setItem('utm_campaign', utmCampaign)
      sessionStorage.setItem('utm_content', utmContent)

      setCookie('utm_source', utmSource)
      setCookie('utm_medium', utmMedium)
      setCookie('utm_campaign', utmCampaign)
      setCookie('utm_content', utmContent)
    }
  }, [searchParams])

  return null
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/analytics/GclidPreserver.tsx
git commit -m "fix: persist gclid/utm in 90-day first-party cookies

sessionStorage dies on browser close, breaking attribution for users
who register and return days later. Cookies survive across sessions,
matching Google Ads' 30-90 day attribution window."
```

---

### Task 2: Auto-attach attribution params to conversion events in trackGA4

**Why:** GCLID and UTM are stored but never sent with conversion events. Google Ads can't attribute conversions back to clicks. This is the single highest-impact fix.

**Files:**
- Modify: `src/lib/analytics.ts`

**Step 1: Add attribution helper and modify trackGA4**

The key insight: only conversion events need attribution params (sign_up, begin_checkout, purchase, join_group, c_enter_live). We define a set of conversion event names and auto-enrich them.

Replace the full content of `src/lib/analytics.ts` with:

```typescript
type GA4Item = { item_id: string; item_name: string; price: number; quantity: number }

type GA4EventMap = {
  // GA4 Recommended events
  sign_up: { method: string; webinar_id: string }
  join_group: { group_id: string; webinar_id?: string }
  begin_checkout: { currency: string; value: number; items: GA4Item[]; cta_id?: string; video_time_sec?: number; source?: string }
  purchase: { transaction_id: string; value: number; currency: string; items: GA4Item[] }

  // Custom events (c_ prefix)
  c_scroll_depth: { percent: number; page: string }
  c_signup_button_click: { button_position: string; webinar_id: string }
  c_add_to_calendar: { method: string; webinar_id: string }
  c_enter_live: { webinar_id: string; entry_method: 'button' | 'countdown_auto' | 'redirect_live' }
  c_video_heartbeat: { webinar_id: string; current_time_sec: number; watch_duration_sec: number }
  c_video_progress: { webinar_id: string; percent: number }
  c_chat_message: { webinar_id: string; video_time_sec: number }
  c_cta_view: { webinar_id: string; cta_id: string; cta_type: string; video_time_sec: number }
  c_cta_dismiss: { webinar_id: string; cta_id: string; cta_type: string; video_time_sec: number }
  c_webinar_complete: { webinar_id: string; watch_duration_sec?: number }
  c_end_page_cta_click: { webinar_id: string; button_text: string }
  c_share_click: { webinar_id: string; platform: 'facebook' | 'twitter' }
}

type GA4EventName = keyof GA4EventMap

// Events that represent conversions — these get attribution params auto-attached
const CONVERSION_EVENTS: ReadonlySet<string> = new Set([
  'sign_up',
  'join_group',
  'begin_checkout',
  'purchase',
  'c_enter_live',
  'c_webinar_complete',
  'c_end_page_cta_click',
])

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** Read attribution params from sessionStorage (fast) with cookie fallback (persistent). */
function getAttribution(): Record<string, string> {
  const attrs: Record<string, string> = {}
  const keys = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content']

  for (const key of keys) {
    const value = sessionStorage.getItem(key) || getCookie(key)
    if (value) attrs[key] = value
  }
  return attrs
}

export function trackGA4<T extends GA4EventName>(
  eventName: T,
  params: GA4EventMap[T]
) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') {
    console.log('[GA4]', eventName, params)
  }
  try {
    window.dataLayer = window.dataLayer || []

    let enrichedParams: Record<string, unknown> = { ...params }

    // Auto-attach gclid/utm to conversion events
    if (CONVERSION_EVENTS.has(eventName)) {
      const attribution = getAttribution()
      enrichedParams = { ...enrichedParams, ...attribution }
    }

    window.dataLayer.push({ event: eventName, ...enrichedParams })
  } catch {
    // GTM not loaded — silently ignore
  }
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/analytics.ts
git commit -m "fix: auto-attach gclid/utm attribution to conversion events

Conversion events (sign_up, purchase, begin_checkout, etc.) now
auto-read stored gclid/utm from sessionStorage with cookie fallback
and include them in the dataLayer push. This closes the attribution
gap that prevented Google Ads from matching conversions to clicks."
```

---

### Task 3: Fix join_group duplicate firing

**Why:** The current `useRef` guard prevents re-fire within the same component lifecycle, but page refresh resets the ref, causing duplicate `join_group` events. This inflates "attendance" metrics.

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx` (lines 225-230)

**Step 1: Add sessionStorage deduplication**

Find this code block (around line 225-230):

```typescript
  useEffect(() => {
    if (!joinTracked.current) {
      joinTracked.current = true;
      trackGA4('join_group', { group_id: webinarId, webinar_id: webinarId });
    }
  }, [webinarId]);
```

Replace with:

```typescript
  useEffect(() => {
    const storageKey = `join_group_fired_${webinarId}`;
    if (!joinTracked.current && !sessionStorage.getItem(storageKey)) {
      joinTracked.current = true;
      try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
      trackGA4('join_group', { group_id: webinarId, webinar_id: webinarId });
    }
  }, [webinarId]);
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/(public)/webinar/[id]/live/page.tsx
git commit -m "fix: prevent join_group duplicate firing on page refresh

Added sessionStorage guard alongside existing useRef. The ref prevents
re-fire within the component lifecycle; the sessionStorage key survives
page refreshes within the same browser session."
```

---

### Task 4: Extract hardcoded begin_checkout price to shared constant

**Why:** The price `599` is hardcoded in 3 places (live CTA click, end page CTA click, and as purchase fallback). If the price changes, all 3 must be updated manually. A single constant eliminates drift risk.

**Files:**
- Modify: `src/lib/analytics.ts` — add exported constant
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx` — use constant (line 377-378)
- Modify: `src/app/(public)/webinar/[id]/end/page.tsx` — use constant (lines 115-116)
- Modify: `src/app/(public)/checkout/[webinarId]/return/page.tsx` — use constant (line 36)

**Step 1: Add constant to analytics.ts**

At the top of `src/lib/analytics.ts`, after the type definitions, add:

```typescript
/** Default product price in USD. Used as begin_checkout value and purchase fallback. */
export const DEFAULT_PRODUCT_PRICE = 599
```

**Step 2: Update live/page.tsx**

Find (around line 375-378):
```typescript
    trackGA4('begin_checkout', {
      currency: 'USD',
      value: 599,
      items: [{ item_id: `webinar_${webinarId}`, item_name: cta.buttonText, price: 599, quantity: 1 }],
```

Replace with:
```typescript
    trackGA4('begin_checkout', {
      currency: 'USD',
      value: DEFAULT_PRODUCT_PRICE,
      items: [{ item_id: `webinar_${webinarId}`, item_name: cta.buttonText, price: DEFAULT_PRODUCT_PRICE, quantity: 1 }],
```

Update the import at the top of the file:
```typescript
import { trackGA4, DEFAULT_PRODUCT_PRICE } from '@/lib/analytics';
```

**Step 3: Update end/page.tsx**

Find (around line 113-116):
```typescript
                trackGA4('begin_checkout', {
                  currency: 'USD',
                  value: 599,
                  items: [{ item_id: `webinar_${webinarId}`, item_name: webinar.title, price: 599, quantity: 1 }],
```

Replace with:
```typescript
                trackGA4('begin_checkout', {
                  currency: 'USD',
                  value: DEFAULT_PRODUCT_PRICE,
                  items: [{ item_id: `webinar_${webinarId}`, item_name: webinar.title, price: DEFAULT_PRODUCT_PRICE, quantity: 1 }],
```

Update the import at the top of the file:
```typescript
import { trackGA4, DEFAULT_PRODUCT_PRICE } from '@/lib/analytics';
```

**Step 4: Update checkout return page**

Find (around line 36):
```typescript
            const purchaseValue = data.amountTotal ? data.amountTotal / 100 : 599;
```

Replace with:
```typescript
            const purchaseValue = data.amountTotal ? data.amountTotal / 100 : DEFAULT_PRODUCT_PRICE;
```

Update the import at the top of the file:
```typescript
import { trackGA4, DEFAULT_PRODUCT_PRICE } from '@/lib/analytics';
```

**Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/lib/analytics.ts src/app/(public)/webinar/[id]/live/page.tsx src/app/(public)/webinar/[id]/end/page.tsx src/app/(public)/checkout/[webinarId]/return/page.tsx
git commit -m "refactor: extract hardcoded price 599 to DEFAULT_PRODUCT_PRICE constant

Eliminates 3 duplicate hardcoded values. If price changes, only one
place needs updating. Purchase event already reads dynamic value from
Stripe; the constant is used as begin_checkout value and fallback."
```

---

### Task 5: Final verification

**Step 1: Full type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Dev server smoke test**

Run: `npm run dev`

Open browser devtools console, navigate through:
1. Landing page with `?gclid=test123&utm_source=google&utm_medium=cpc` — verify console shows `[GA4] c_signup_button_click` when clicking register button
2. Check `document.cookie` contains `gclid=test123` with path=/
3. Register → Lobby → Live room — verify console shows `[GA4] join_group` with `gclid` and `utm_source` attached
4. Refresh live room page — verify `join_group` does NOT fire again
5. Click CTA — verify `[GA4] begin_checkout` shows `value: 599` and has `gclid`/`utm_source` attached

**Step 3: Commit (if any fixes needed)**

Only if adjustments were made during smoke testing.
