# GA4 Analytics Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add GA4 analytics tracking to the webinar MVP, covering the full funnel from landing page to purchase, with Google Ads integration support.

**Architecture:** Enhance the existing `track()` function in `src/lib/tracking.ts` to dual-fire events — both to the existing `/api/track` server endpoint AND to GA4 via `gtag()`. This means all 6+ existing tracking calls automatically get GA4 coverage with zero changes to call sites. Add `GoogleAnalytics` component to root layout, gated on env var. Store gclid/UTM params on first load.

**Tech Stack:** `@next/third-parties/google`, GA4 gtag.js, Next.js 16 App Router

**Note:** No test framework is configured. Verify each task via `npm run build` (type checking) and browser DebugView (`?debug_mode=true`) after all tasks are complete.

---

### Task 1: Install @next/third-parties/google

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run:
```bash
npm install @next/third-parties/google
```

**Step 2: Verify installation**

Run: `npm ls @next/third-parties`
Expected: Shows `@next/third-parties` in dependency tree

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @next/third-parties/google for GA4"
```

---

### Task 2: Add GoogleAnalytics component to root layout

**Files:**
- Modify: `src/app/layout.tsx` (lines 1-34)
- Modify: `.env.local` (add placeholder)

**Step 1: Add env var placeholder**

Append to `.env.local`:
```
NEXT_PUBLIC_GA_ID=
```

This stays empty until the user creates their GA4 property. The `GoogleAnalytics` component won't render when the env var is empty.

**Step 2: Modify root layout**

In `src/app/layout.tsx`:

Add import at top:
```tsx
import { GoogleAnalytics } from '@next/third-parties/google'
```

Add component inside the `<html>` tag, after `<body>`:
```tsx
{process.env.NEXT_PUBLIC_GA_ID && (
  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
)}
```

The `GoogleAnalytics` component:
- Loads gtag.js asynchronously (non-blocking)
- Automatically tracks `page_view` on client-side route changes
- Only renders when `NEXT_PUBLIC_GA_ID` is set

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Commit**

```bash
git add src/app/layout.tsx .env.local
git commit -m "feat: add GoogleAnalytics component to root layout"
```

---

### Task 3: Create typed GA4 analytics helper

**Files:**
- Create: `src/lib/analytics.ts`

**Step 1: Create the analytics helper**

Create `src/lib/analytics.ts`:

```typescript
import { sendGAEvent } from '@next/third-parties/google'

// GA4 event name mapping: internal event name → GA4 event name + params
// Uses GA4 recommended event names where possible, custom c_ prefix otherwise
type GA4EventMap = {
  sign_up: { method: string; webinar_id: string }
  join_group: { group_id: string }
  begin_checkout: { currency: string; value: number; items: Array<{ item_id: string; item_name: string; price: number; quantity: number }> }
  purchase: { transaction_id: string; value: number; currency: string; items: Array<{ item_id: string; item_name: string; price: number; quantity: number }> }
  c_cta_click: { webinar_id: string; cta_type: string; cta_url: string; video_time_sec?: number }
  c_webinar_complete: { webinar_id: string; watch_duration_sec?: number }
  c_chat_message: { webinar_id: string }
  c_video_progress: { webinar_id: string; percent: number }
}

type GA4EventName = keyof GA4EventMap

export function trackGA4<T extends GA4EventName>(
  eventName: T,
  params: GA4EventMap[T]
) {
  if (typeof window === 'undefined') return
  try {
    sendGAEvent('event', eventName, params)
  } catch {
    // GA4 not loaded (no measurement ID) — silently ignore
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/lib/analytics.ts
git commit -m "feat: add typed GA4 analytics helper"
```

---

### Task 4: Enhance existing track() to dual-fire GA4 events

**Files:**
- Modify: `src/lib/tracking.ts` (all 17 lines)

**Step 1: Add GA4 mapping to track()**

The existing `track()` function fires to `/api/track`. Enhance it to also fire the corresponding GA4 event. This gives GA4 coverage to all existing tracking calls (webinar_join, cta_click, video_progress, etc.) without changing any call sites.

Replace `src/lib/tracking.ts` content with:

```typescript
import { trackGA4 } from './analytics'

// Map internal event names to GA4 events
const GA4_EVENT_MAP: Record<string, (props: Record<string, unknown>) => void> = {
  webinar_join: (p) => trackGA4('join_group', { group_id: String(p.webinarId || '') }),
  cta_click: (p) => trackGA4('c_cta_click', {
    webinar_id: String(p.webinarId || ''),
    cta_type: String(p.buttonText || ''),
    cta_url: String(p.url || ''),
    video_time_sec: typeof p.videoTime === 'number' ? p.videoTime : undefined,
  }),
  video_progress: (p) => trackGA4('c_video_progress', {
    webinar_id: String(p.webinarId || ''),
    percent: typeof p.percent === 'number' ? p.percent : 0,
  }),
  chat_message: (p) => trackGA4('c_chat_message', {
    webinar_id: String(p.webinarId || ''),
  }),
}

export function track(event: string, properties?: Record<string, unknown>) {
  const payload = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    console.log('[Track]', event, properties)

    // Fire to server-side tracking
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})

    // Fire to GA4 if mapping exists
    const ga4Handler = GA4_EVENT_MAP[event]
    if (ga4Handler) {
      ga4Handler(properties || {})
    }
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. All existing `track()` call sites still work unchanged.

**Step 3: Commit**

```bash
git add src/lib/tracking.ts
git commit -m "feat: enhance track() to dual-fire GA4 events"
```

---

### Task 5: Add sign_up event on registration

**Files:**
- Modify: `src/components/registration/useRegistrationForm.ts` (line ~51)

**Step 1: Add GA4 sign_up event**

In `src/components/registration/useRegistrationForm.ts`, add import at top:
```typescript
import { trackGA4 } from '@/lib/analytics'
```

After the `onFormSubmit?.()` call (around line 51), add:
```typescript
trackGA4('sign_up', {
  method: 'webinar_registration',
  webinar_id: String(webinarId),
})
```

This fires alongside the existing registration logic. The `sign_up` event is a GA4 recommended event — it gets automatic reporting in GA4's built-in reports.

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/registration/useRegistrationForm.ts
git commit -m "feat: fire GA4 sign_up event on registration"
```

---

### Task 6: Add purchase event on checkout success

**Files:**
- Modify: `src/app/(public)/checkout/[webinarId]/return/page.tsx` (around line 27-29)

**Step 1: Add GA4 purchase event**

In `src/app/(public)/checkout/[webinarId]/return/page.tsx`, add import at top:
```typescript
import { trackGA4 } from '@/lib/analytics'
```

Inside the success check block (where `setStatus('success')` is called), add:
```typescript
trackGA4('purchase', {
  transaction_id: sessionId || `session_${Date.now()}`,
  value: 997.00,
  currency: 'USD',
  items: [{
    item_id: `webinar_${webinarId}`,
    item_name: 'Webinar Course',
    price: 997.00,
    quantity: 1,
  }],
})
```

Note: The value is hardcoded for MVP. In production, pull from the Stripe session response. All three required params (`transaction_id`, `value`, `currency`) are included — without them, revenue shows as $0 in GA4.

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(public)/checkout/[webinarId]/return/page.tsx
git commit -m "feat: fire GA4 purchase event on checkout success"
```

---

### Task 7: Add webinar_complete event on end page

**Files:**
- Modify: `src/app/(public)/webinar/[id]/end/page.tsx` (around line 30-35)

**Step 1: Add GA4 webinar_complete event**

In `src/app/(public)/webinar/[id]/end/page.tsx`, add import at top:
```typescript
import { trackGA4 } from '@/lib/analytics'
```

In the useEffect where webinar data loads successfully (after `setWebinar(data.webinar)`), add:
```typescript
trackGA4('c_webinar_complete', {
  webinar_id: String(id),
})
```

**Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/(public)/webinar/[id]/end/page.tsx
git commit -m "feat: fire GA4 c_webinar_complete event on end page"
```

---

### Task 8: Preserve gclid and UTM params across navigation

**Files:**
- Create: `src/components/analytics/GclidPreserver.tsx`
- Modify: `src/app/layout.tsx` (add component)

**Step 1: Create GclidPreserver component**

Create `src/components/analytics/GclidPreserver.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Preserves gclid and UTM parameters in sessionStorage
// so Google Ads attribution survives client-side navigation.
// Without this, SPAs strip query params on route change and
// Google Ads can't attribute the conversion.
export function GclidPreserver() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const gclid = searchParams.get('gclid')
    const utmSource = searchParams.get('utm_source')

    if (gclid) {
      sessionStorage.setItem('gclid', gclid)
    }
    if (utmSource) {
      sessionStorage.setItem('utm_source', utmSource)
      sessionStorage.setItem('utm_medium', searchParams.get('utm_medium') || '')
      sessionStorage.setItem('utm_campaign', searchParams.get('utm_campaign') || '')
      sessionStorage.setItem('utm_content', searchParams.get('utm_content') || '')
    }
  }, [searchParams])

  return null
}
```

**Step 2: Add to root layout**

In `src/app/layout.tsx`, add import:
```tsx
import { Suspense } from 'react'
import { GclidPreserver } from '@/components/analytics/GclidPreserver'
```

Add inside `<body>`, before or after `{children}`:
```tsx
<Suspense fallback={null}>
  <GclidPreserver />
</Suspense>
```

The `Suspense` wrapper is required because `useSearchParams()` requires it in Next.js App Router.

**Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/analytics/GclidPreserver.tsx src/app/layout.tsx
git commit -m "feat: preserve gclid and UTM params in sessionStorage"
```

---

### Task 9: Final build verification and docs update

**Files:**
- Modify: `docs/architecture.md` (add GA4 section)

**Step 1: Full build check**

Run: `npm run build`
Expected: Build succeeds with zero errors

Run: `npm run lint`
Expected: No new lint errors

**Step 2: Update architecture docs**

Add a section to `docs/architecture.md` under an appropriate heading:

```markdown
### Analytics (GA4)

GA4 is integrated via `@next/third-parties/google` with the `GoogleAnalytics` component in the root layout, gated on `NEXT_PUBLIC_GA_ID` env var.

**Dual-fire tracking:** The existing `track()` function in `src/lib/tracking.ts` sends events to both `/api/track` (server-side JSON storage) and GA4 (client-side gtag). Internal event names are mapped to GA4 recommended event names where possible.

**Event mapping:**
| Internal Event | GA4 Event | Trigger |
|---|---|---|
| (automatic) | `page_view` | Every route change |
| registration submit | `sign_up` | `useRegistrationForm.ts` |
| `webinar_join` | `join_group` | Live page mount |
| `cta_click` | `c_cta_click` | CTA overlay click |
| `video_progress` | `c_video_progress` | 25/50/75/100% marks |
| checkout success | `purchase` | Checkout return page |
| end page mount | `c_webinar_complete` | End page |

**gclid preservation:** `GclidPreserver` component stores gclid/UTM params in sessionStorage on first page load so Google Ads attribution survives client-side navigation.

**Files:** `src/lib/analytics.ts` (typed GA4 helper), `src/lib/tracking.ts` (dual-fire), `src/components/analytics/GclidPreserver.tsx`
```

**Step 3: Commit**

```bash
git add docs/architecture.md
git commit -m "docs: add GA4 analytics section to architecture"
```

---

## Post-Implementation: User Action Items

These require the GA4 admin UI (not code changes):

1. **Create GA4 property** at [analytics.google.com](https://analytics.google.com) → Admin → Create Property
2. **Get Measurement ID** (starts with `G-`) → Set as `NEXT_PUBLIC_GA_ID` in `.env.local` and production env
3. **Change data retention** → Admin → Data Settings → Data Retention → 14 months
4. **Add referral exclusions** → Admin → Data Streams → Configure tag settings → `checkout.stripe.com`
5. **Mark key events** → Admin → Events → Toggle "Mark as key event" for `sign_up` and `purchase`
6. **Link Google Ads** → Admin → Product Links → Google Ads Links → Link your account
7. **Import conversions to Google Ads** → Google Ads → Goals → Conversions → Import → GA4
8. **Verify with DebugView** → Visit site with `?debug_mode=true` → Check GA4 Admin → DebugView
