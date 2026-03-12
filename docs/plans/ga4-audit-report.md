# GA4 Analytics Audit Report — Comprehensive Assessment

**Date:** 2026-03-06
**Project:** Webinar MVP (pseudo-live webinar platform)
**Audited by:** Agent Team (Current State Analyzer, Gap Analyst, GA4 Technical Expert)

---

## Table of Contents

1. [Current State Inventory](#1-current-state-inventory)
2. [Gap Analysis Matrix](#2-gap-analysis-matrix)
3. [Technical Issues & Blind Spots](#3-technical-issues--blind-spots)
4. [Implementation Design Document](#4-implementation-design-document)

---

## 1. Current State Inventory

### 1.1 GA4 Installation

| Item | Status | Details |
|------|--------|---------|
| GA4 package | Installed | `@next/third-parties/google` in `package.json` |
| Root layout integration | Correct | `src/app/layout.tsx:38-40` — `<GoogleAnalytics>` gated on `NEXT_PUBLIC_GA_ID` env var |
| Dev/prod isolation | Correct | GA4 only loads when `NEXT_PUBLIC_GA_ID` is set |
| gclid/UTM preservation | Implemented | `src/components/analytics/GclidPreserver.tsx` stores in sessionStorage |
| GTM | Not used | Direct gtag.js only — no double-loading risk |

### 1.2 Tracking Architecture

The codebase has **two tracking layers**:

1. **`src/lib/analytics.ts`** — Thin GA4 wrapper using `sendGAEvent` from `@next/third-parties/google`. Type-safe event map with 8 defined events.

2. **`src/lib/tracking.ts`** — Dual-destination tracker: sends to both server-side (`/api/track` → `data/events.json`) AND GA4 (via mapping). Only 4 of 8 GA4 events have mappings here.

**Call pattern:**
- `track('event_name', props)` → sends to server + GA4 (if mapping exists)
- `trackGA4('event_name', props)` → sends to GA4 only

### 1.3 Currently Implemented Events

| GA4 Event | Call Site | Trigger | Parameters |
|-----------|----------|---------|------------|
| `sign_up` | `useRegistrationForm.ts:53` | Registration form submit | `method: "webinar_registration"`, `webinar_id` |
| `join_group` | `live/page.tsx:202` via `track('webinar_join')` | Live page mount | `group_id: webinarId` |
| `c_video_progress` | `live/page.tsx:215` via `track('video_progress')` | 25/50/75/100% milestones | `webinar_id`, `percent` |
| `c_cta_click` | `live/page.tsx:316` via `track('cta_click')` | User clicks CTA overlay | `webinar_id`, `cta_type`, `cta_url`, `video_time_sec` |
| `c_webinar_complete` | `end/page.tsx:32` | End page mount | `webinar_id` |
| `purchase` | `checkout/return/page.tsx:36` | Stripe session confirmed complete | `transaction_id`, `value: 997.00`, `currency: "USD"`, `items[]` |

**Server-only events (NOT sent to GA4 — missing GA4 mapping):**

| Internal Event | Call Site | Note |
|----------------|----------|------|
| `webinar_leave` | `live/page.tsx:228` | No GA4 mapping in `tracking.ts` |
| `cta_view` | `live/page.tsx:460,470` | No GA4 mapping in `tracking.ts` |
| `webinar_join` | `live/page.tsx:202` | Has GA4 mapping → `join_group` |

---

## 2. Gap Analysis Matrix

### Legend
- **Implemented** — Event exists and fires correctly to GA4
- **Partial** — Event exists but has issues (wrong params, missing attribution, etc.)
- **Server-only** — Tracked to `data/events.json` but NOT to GA4
- **MISSING** — Not implemented at all

### A. Landing Page (`src/app/(public)/page.tsx`)

| Required Event | Status | Issue | Priority |
|---------------|--------|-------|----------|
| `page_view` | **Auto** | GA4 auto-tracks page views via `GoogleAnalytics` component. However, no explicit tracking for page path filtering. | Low |
| `scroll` | **MISSING** | No scroll depth listeners. GA4 Enhanced Measurement has a basic scroll event (90% threshold), but custom 25/50/75/100% milestones not implemented. | Medium |
| `sign_up_button_click_1` (hero CTA) | **MISSING** | Line 195: `onClick={openModal}` — no tracking. Button text: "观看讲座" | **HIGH** |
| `sign_up_button_click_2` (footer CTA) | **MISSING** | Line 337: `onClick={openModal}` — no tracking. Button text: "锁定名额，观看讲座" | **HIGH** |
| `submit_sign_up_1` / `submit_sign_up_2` | **Partial** | `sign_up` event fires but **does not include which button** opened the modal. Source attribution is lost because `openModal()` takes no parameter. | **HIGH** |

**Agent Debate Note (C challenges B):** Agent C raises that GA4 Enhanced Measurement auto-tracks `scroll` at 90% depth. However, this is insufficient for a landing page where drop-off at 25/50/75% is the real diagnostic signal. Custom scroll tracking is still needed.

### B. Lobby/Waiting Room (`src/app/(public)/webinar/[id]/lobby/page.tsx`)

| Required Event | Status | Issue | Priority |
|---------------|--------|-------|----------|
| `add_to_calendar_google` | **MISSING** | Google Calendar link exists (line ~325) with `target="_blank"` but no `onClick` tracking | **HIGH** |
| `add_to_calendar_ical` | **MISSING** | iCal download button exists with `onClick={handleDownloadICS}` but no tracking | **HIGH** |
| `enter_live_room` (from lobby) | **MISSING** | Auto-redirect when countdown ends (line ~93) — no explicit tracking of lobby→live transition | Medium |

**Agent Debate Note (C challenges B):** The `join_group` event fires on live page mount, which effectively captures "enter live room." However, it doesn't capture the lobby-specific context (time spent waiting, countdown completion). If the user navigates directly to `/live` (bypassing lobby), the same event fires — we can't distinguish the two paths.

### C. Live Room (`src/app/(public)/webinar/[id]/live/page.tsx`)

| Required Event | Status | Issue | Priority |
|---------------|--------|-------|----------|
| `enter_live_room` | **Implemented** | `track('webinar_join')` → GA4 `join_group` at line 202 | OK |
| `video_progress` | **Implemented** | 25/50/75/100% milestones tracked at line 212-216 | OK |
| `chat_message_send` | **MISSING** | `handleSendMessage` (line 239-256) sends to API but has NO tracking call. Note: `c_chat_message` is defined in `analytics.ts` and mapped in `tracking.ts`, but **never called anywhere**. | **HIGH** |
| CTA overlay click | **Implemented** | `track('cta_click')` at line 316 with `buttonText`, `url` | OK |
| CTA overlay view (impression) | **Server-only** | `track('cta_view')` at line 460/470 — sends to server but **no GA4 mapping** in `tracking.ts` | Medium |

**Agent Debate Note (B challenges A):** The `c_chat_message` mapping exists in both `analytics.ts` (type definition) and `tracking.ts` (GA4 handler), but it's never actually invoked. This is a "ghost event" — defined but dead code. Needs a single `track('chat_message', { webinarId })` line in `handleSendMessage`.

**Agent Debate Note (C on CTA tracking):** CTAs are admin-configurable (variable count per webinar). Current implementation correctly passes `buttonText` and `url` as event parameters, which uniquely identifies each CTA. However:
- `buttonText` may exceed GA4's 100-char parameter value limit if admin enters long text
- No `cta_index` or `cta_id` parameter to distinguish CTAs when buttonText is identical
- Recommendation: Add `cta_id` (or index) and truncate `buttonText` to 100 chars

### D. Checkout Flow

| Required Event | Status | Issue | Priority |
|---------------|--------|-------|----------|
| `begin_checkout` | **MISSING** | End page CTA (line 101-117) navigates to `/checkout/` with NO tracking. Live room CTA uses `window.open()` — also no begin_checkout event. The `begin_checkout` type exists in `analytics.ts` but is **never called**. | **CRITICAL** |
| `purchase` | **Implemented** | `checkout/return/page.tsx:36` fires after Stripe session confirmation | OK (with issues) |
| Checkout error | **MISSING** | Error state exists (line 70-84) but no tracking | Medium |

**Agent Debate — Critical Issue (C flags):**
The `purchase` event has **hardcoded values**:
```tsx
value: 997.00,        // Hardcoded — should come from Stripe session
currency: 'USD',      // Hardcoded — should come from Stripe session
item_name: 'Webinar Course'  // Generic — should be actual product name
```
This means:
1. If the price changes, GA4 reports wrong revenue
2. If a different currency is used, ROAS calculations break
3. Multiple products can't be distinguished

**Fix:** The Stripe session-status API should return `amount_total` and `currency` from the Stripe session object, and pass them to the tracking call.

### E. End Page (`src/app/(public)/webinar/[id]/end/page.tsx`)

| Required Event | Status | Issue | Priority |
|---------------|--------|-------|----------|
| `webinar_end_page_view` | **Partial** | `c_webinar_complete` fires on mount (line 32), which serves a similar purpose. But the event name doesn't match GA4 conventions. | Low |
| `post_end_purchase_click` | **MISSING** | CTA button (line 97-122) navigates to checkout but has NO click tracking | **HIGH** |

### F. Cross-Cutting Concerns

| Required Event | Status | Issue | Priority |
|---------------|--------|-------|----------|
| `page_view` on SPA navigation | **Auto** | `@next/third-parties/google` GoogleAnalytics component handles this for Next.js App Router | OK |
| gclid preservation | **Implemented** | `GclidPreserver.tsx` stores in sessionStorage | OK |
| UTM preservation | **Implemented** | Stores `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` | OK |
| Referral exclusion (Stripe) | **NOT CONFIGURED** | Must be done in GA4 Admin, not code. But worth noting. | **HIGH** (GA4 Admin) |

---

## 3. Technical Issues & Blind Spots

### 3.1 Critical Technical Bugs

#### Bug 1: Ghost Events — Defined But Never Called
- `begin_checkout` — Type defined in `analytics.ts:6`, never invoked anywhere
- `c_chat_message` — Type defined in `analytics.ts:10`, handler in `tracking.ts:16-18`, **never invoked**
- **Impact:** These create false confidence that tracking is complete

#### Bug 2: Missing GA4 Mappings in `tracking.ts`
Events fired via `track()` that have NO GA4 mapping:
- `webinar_leave` — tracked server-side only, GA4 never sees it
- `cta_view` — tracked server-side only, GA4 never sees it

**Impact:** These events appear in `data/events.json` but NOT in GA4 reports.

#### Bug 3: Hardcoded Purchase Values
`checkout/return/page.tsx:38-39` — `value: 997.00` and `currency: 'USD'` are hardcoded.
**Impact:** Revenue reporting will be wrong if price or currency changes.

#### Bug 4: `webinar_join` Fires Without Deduplication
`live/page.tsx:202` fires `track('webinar_join')` in a `useEffect` with `[webinarId]` dependency. If the component remounts (e.g., React Strict Mode in dev), it fires twice. Unlike `purchase` (which uses a `useRef` guard), `webinar_join` has no deduplication.
**Impact:** Inflated join counts in both GA4 and server-side tracking.

### 3.2 CRITICAL: Attribution Chain Is Broken (Agent C Discovery)

**This is the highest-severity finding in the audit.**

The `GclidPreserver.tsx` correctly stores `gclid` and UTM parameters in sessionStorage on landing. However, **these values are NEVER read or attached to any GA4 conversion event.**

- `sign_up` event: No gclid/UTM params attached
- `purchase` event: No gclid/UTM params attached
- `begin_checkout`: Not even called (see Bug 1)

**Impact:** Google Ads conversion attribution will fail. Google Ads needs the gclid to flow through to the conversion event. Without it, ad spend cannot be attributed to conversions, ROAS is unmeasurable, and Smart Bidding has no signal.

**Fix:** Create `src/lib/attribution.ts`:
```tsx
export function getAttributionParams() {
  if (typeof window === 'undefined') return {}
  return {
    ...(sessionStorage.getItem('gclid') && { gclid: sessionStorage.getItem('gclid') }),
    ...(sessionStorage.getItem('utm_source') && { utm_source: sessionStorage.getItem('utm_source') }),
    ...(sessionStorage.getItem('utm_medium') && { utm_medium: sessionStorage.getItem('utm_medium') }),
    ...(sessionStorage.getItem('utm_campaign') && { utm_campaign: sessionStorage.getItem('utm_campaign') }),
  }
}
```
Then attach to every conversion event (`sign_up`, `begin_checkout`, `purchase`).

### 3.3 Data Quality Concerns

#### Concern 1: Attribution Loss Between Layers
- `sign_up` fires via `trackGA4()` directly (bypassing `tracking.ts`)
- All live room events fire via `track()` (goes through `tracking.ts`)
- `c_webinar_complete` fires via `trackGA4()` directly
- **Issue:** Inconsistent call patterns make it hard to reason about what goes where

#### Concern 2: No `webinar_id` on `join_group`
The `join_group` event only sends `group_id` (mapped from `webinarId`). It doesn't send `webinar_id` as a separate parameter. This makes it harder to filter in GA4 reports alongside other events that use `webinar_id`.

#### Concern 3: CTA Button Source Lost on Registration
The landing page has 2 different CTA buttons, but both call the same `openModal()`. The registration form doesn't know which button opened it, so `sign_up` can't include source attribution.

#### Concern 4: Enhanced Conversions Not Implemented
The `purchase` event doesn't include `email` or `phone_number` for enhanced conversions. Given cookie restrictions, this means 5-15% of conversions may be lost for Google Ads attribution.

#### Concern 5: `video_time_sec` Never Passed to CTA Click (Agent C)
The `c_cta_click` GA4 event type defines `video_time_sec` as optional parameter, and the mapping in `tracking.ts` looks for `p.videoTime`. But the actual `track('cta_click', ...)` call in `live/page.tsx:316` does NOT pass `videoTime`. This means you can't correlate CTA clicks with video position.

#### Concern 6: `watch_duration_sec` Never Computed (Agent C)
The `c_webinar_complete` type defines `watch_duration_sec` as optional, but it's never calculated or passed. When video ends, `webinar_leave` fires but doesn't compute duration. The end page fires `c_webinar_complete` but has no access to watch time.

#### Concern 7: Console Logging in Production
`tracking.ts:29` logs `console.log('[Track]', event, properties)` on every event in all environments. Should be gated behind `NODE_ENV !== 'production'`.

### 3.3 Logical Flow Gaps (Funnel Breaks)

```
Landing Page    →    Registration    →    Lobby    →    Live Room    →    End Page    →    Checkout
page_view(auto)      sign_up              ???           join_group        c_webinar_     ???
scroll(MISSING)      (no source)                        video_progress    complete       purchase
button_click                                            cta_click
(MISSING)                                               cta_view(no GA4)
                                                        chat_msg(MISSING)
```

**Funnel blind spots:**
1. Landing → Registration: Can't tell which button drove the signup
2. Lobby → Live: No explicit transition event (only `join_group` on live mount)
3. Live → Checkout: No `begin_checkout` event — can't measure CTA→checkout drop-off
4. End → Checkout: No click tracking on end page CTA — can't measure end→checkout drop-off

---

## 4. Implementation Design Document

### 4.1 Event Naming Convention (Final)

Following GA4 recommended events where applicable, custom events prefixed with `c_`:

| Event Name | Type | GA4 Category |
|-----------|------|-------------|
| `page_view` | Auto | Automatic (Enhanced Measurement) |
| `scroll` | Custom | Enhanced Measurement + custom thresholds |
| `c_signup_button_click` | Custom | Landing page interaction |
| `sign_up` | Recommended | Registration |
| `c_add_to_calendar` | Custom | Lobby engagement |
| `join_group` | Recommended | Live room entry |
| `c_video_progress` | Custom | Video engagement |
| `c_chat_message` | Custom | Chat engagement |
| `c_cta_click` | Custom | CTA interaction |
| `c_cta_view` | Custom | CTA impression |
| `begin_checkout` | Recommended | Checkout funnel |
| `purchase` | Recommended | Conversion |
| `c_webinar_complete` | Custom | Webinar completion |
| `c_end_page_cta_click` | Custom | End page interaction |

### 4.2 Implementation Tasks

#### Task 1: Add CTA Source Attribution to Landing Page (HIGH)

**Files:** `src/app/(public)/page.tsx`, `src/components/registration/RegistrationModal.tsx`, `src/components/registration/useRegistrationForm.ts`

**Changes:**
1. Add `source` parameter to `openModal()`:
   - Hero button: `openModal('hero')`
   - Footer button: `openModal('footer')`
2. Track button clicks before opening modal:
   ```tsx
   const openModal = (source: 'hero' | 'footer') => {
     trackGA4Event('c_signup_button_click', { button_position: source, webinar_id: '1' })
     setModalSource(source) // pass to modal via state
     setShowModal(true)
   }
   ```
3. Pass source through to `useRegistrationForm` so `sign_up` includes it:
   ```tsx
   trackGA4('sign_up', {
     method: `webinar_registration_${source}`, // "webinar_registration_hero" or "_footer"
     webinar_id: String(webinarId),
   })
   ```

#### Task 2: Add Calendar Button Tracking to Lobby (HIGH)

**File:** `src/app/(public)/webinar/[id]/lobby/page.tsx`

**Changes:**
Add `onClick` handlers to both calendar buttons:
```tsx
// Google Calendar link
onClick={() => trackGA4Event('c_add_to_calendar', { method: 'google', webinar_id: webinarId })}

// iCal download button
const handleDownloadICS = () => {
  trackGA4Event('c_add_to_calendar', { method: 'ical', webinar_id: webinarId })
  // ... existing ICS download logic
}
```

#### Task 3: Add Chat Message Tracking (HIGH)

**File:** `src/app/(public)/webinar/[id]/live/page.tsx`

**Changes:**
Add tracking call in `handleSendMessage`:
```tsx
const handleSendMessage = useCallback(async (msg: ChatMessage) => {
  track('chat_message', { webinarId })  // <-- ADD THIS LINE
  try {
    await fetch(...)
  }
}, [webinarId])
```

This already has a GA4 mapping in `tracking.ts:16-18` — it will just work.

#### Task 4: Add `begin_checkout` Event (CRITICAL)

**Files:** `src/app/(public)/webinar/[id]/end/page.tsx`, `src/app/(public)/webinar/[id]/live/page.tsx`

**Changes:**
1. End page CTA button (line 101):
   ```tsx
   onClick={() => {
     trackGA4('begin_checkout', {
       currency: 'USD',
       value: 997.00,
       items: [{ item_id: `webinar_${webinarId}`, item_name: webinar.title, price: 997.00, quantity: 1 }]
     })
     router.push(`/checkout/${webinarId}?...`)
   }}
   ```
2. Live room CTA click (line 316) — add `begin_checkout` alongside existing `cta_click` when the CTA URL points to checkout

#### Task 5: Add End Page CTA Click Tracking (HIGH)

**File:** `src/app/(public)/webinar/[id]/end/page.tsx`

**Changes:**
Add tracking to the CTA button `onClick` handler:
```tsx
trackGA4Event('c_end_page_cta_click', {
  webinar_id: String(webinarId),
  button_text: webinar.endPageCtaText || firstCTA?.buttonText || '了解更多'
})
```

#### Task 6: Add Missing GA4 Mappings in `tracking.ts` (Medium)

**File:** `src/lib/tracking.ts`

**Changes:**
Add mappings for events that currently only go to server:
```tsx
const GA4_EVENT_MAP = {
  // ... existing mappings ...
  webinar_leave: (p) => trackGA4('c_webinar_complete', {
    webinar_id: String(p.webinarId || ''),
    watch_duration_sec: typeof p.watchDuration === 'number' ? p.watchDuration : undefined,
  }),
  cta_view: (p) => trackGA4('c_cta_click', {  // reuse c_cta_click type or add c_cta_view
    webinar_id: String(p.webinarId || ''),
    cta_type: String(p.buttonText || ''),
    cta_url: '',
  }),
}
```

Also add `c_cta_view` as a new event type in `analytics.ts`:
```tsx
c_cta_view: { webinar_id: string; cta_type: string }
```

#### Task 7: Fix Purchase Event — Dynamic Values (CRITICAL)

**File:** `src/app/api/checkout/session-status/route.ts`, `src/app/(public)/checkout/[webinarId]/return/page.tsx`

**Changes:**
1. API should return `amount_total` and `currency` from Stripe session
2. Purchase event should use dynamic values:
   ```tsx
   trackGA4('purchase', {
     transaction_id: sessionId,
     value: data.amountTotal / 100,  // Stripe returns cents
     currency: data.currency.toUpperCase(),
     items: [{ item_id: `webinar_${webinarId}`, item_name: data.productName, price: data.amountTotal / 100, quantity: 1 }]
   })
   ```

#### Task 8: Add `webinar_join` Deduplication (Medium)

**File:** `src/app/(public)/webinar/[id]/live/page.tsx`

**Changes:**
Add a ref guard like `purchase` has:
```tsx
const joinTracked = useRef(false)
useEffect(() => {
  if (!joinTracked.current) {
    joinTracked.current = true
    track('webinar_join', { webinarId })
  }
}, [webinarId])
```

#### Task 9: Add Scroll Depth Tracking to Landing Page (Medium)

**File:** `src/app/(public)/page.tsx` or create a reusable `useScrollDepth` hook

**Changes:**
Track 25/50/75/100% scroll depth milestones using IntersectionObserver or scroll event listener:
```tsx
useEffect(() => {
  const milestones = new Set<number>()
  const handleScroll = () => {
    const scrollPct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
    ;[25, 50, 75, 100].forEach(m => {
      if (scrollPct >= m && !milestones.has(m)) {
        milestones.add(m)
        trackGA4Event('c_scroll_depth', { percent: m, page: 'landing' })
      }
    })
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

#### Task 10: Add Enhanced Conversion Data to Purchase (Medium)

**File:** `src/app/(public)/checkout/[webinarId]/return/page.tsx`

**Changes:**
Include hashed user data for enhanced conversions:
```tsx
trackGA4('purchase', {
  // ... existing params ...
  // Enhanced conversion data (auto-hashed by gtag)
  email: data.customerEmail,
  phone_number: data.customerPhone,
})
```

### 4.3 New Events to Add to `analytics.ts` Type Map

```typescript
type GA4EventMap = {
  // Existing
  sign_up: { method: string; webinar_id: string }
  join_group: { group_id: string; webinar_id?: string }
  begin_checkout: { currency: string; value: number; items: Array<...> }
  purchase: { transaction_id: string; value: number; currency: string; items: Array<...>; email?: string; phone_number?: string }
  c_cta_click: { webinar_id: string; cta_type: string; cta_url: string; cta_id?: string; video_time_sec?: number }
  c_webinar_complete: { webinar_id: string; watch_duration_sec?: number }
  c_chat_message: { webinar_id: string }
  c_video_progress: { webinar_id: string; percent: number }

  // NEW
  c_signup_button_click: { button_position: 'hero' | 'footer'; webinar_id: string }
  c_add_to_calendar: { method: 'google' | 'ical'; webinar_id: string }
  c_cta_view: { webinar_id: string; cta_type: string; cta_id?: string }
  c_end_page_cta_click: { webinar_id: string; button_text: string }
  c_scroll_depth: { percent: number; page: string }
  c_checkout_error: { webinar_id: string; error_type: string }
}
```

### 4.4 GA4 Admin Configuration Checklist (Non-Code)

These must be configured in the GA4 Admin console:

- [ ] Data retention → 14 months (Admin > Data Settings > Data Retention)
- [ ] Referral exclusion → `checkout.stripe.com`, `stripe.com` (Admin > Data Streams > Configure tag settings)
- [ ] Internal traffic filter → Add office/home IPs (Admin > Data Streams > Define internal traffic)
- [ ] Mark key events → `sign_up`, `purchase`, `begin_checkout` (Admin > Events > Mark as key event)
- [ ] Google Ads link → Link GA4 property (Admin > Product Links > Google Ads)
- [ ] Import key events to Google Ads → `sign_up`, `purchase` as Primary (Google Ads > Goals > Import)
- [ ] Enhanced conversions → Enable in Google Ads (Goals > Conversions > Settings)
- [ ] Separate dev GA4 property → Use different `NEXT_PUBLIC_GA_ID` in `.env.local` vs `.env.production`

#### Task 11: Fix Attribution Chain — Attach gclid/UTM to Conversion Events (CRITICAL)

**Files:** New file `src/lib/attribution.ts`, then update `useRegistrationForm.ts`, `checkout/return/page.tsx`, and any `begin_checkout` call sites.

**Changes:**
1. Create `src/lib/attribution.ts` utility (see Section 3.2)
2. In `sign_up` event: spread `getAttributionParams()` into params
3. In `purchase` event: spread `getAttributionParams()` into params
4. In `begin_checkout` event: spread `getAttributionParams()` into params

#### Task 12: Pass `video_time_sec` to CTA Click + Compute `watch_duration_sec` (Medium)

**Files:** `src/app/(public)/webinar/[id]/live/page.tsx`

**Changes:**
1. Add `videoTime: currentTime` to `track('cta_click', ...)` call at line 316
2. When video ends (line 226-233), compute watch duration from `event.currentTime` and pass it via URL param or localStorage to the end page for `c_webinar_complete`

#### Task 13: Gate Console Logging Behind Environment (Tiny)

**File:** `src/lib/tracking.ts`

**Changes:**
```tsx
if (process.env.NODE_ENV !== 'production') {
  console.log('[Track]', event, properties)
}
```

### 4.5 Implementation Priority Order

| Priority | Task | Effort | Impact |
|----------|------|--------|--------|
| **1** | **Task 11: Fix attribution chain (gclid/UTM to conversion events)** | **Small** | **Google Ads attribution completely broken without this** |
| 2 | Task 7: Fix purchase hardcoded values | Small | Revenue data accuracy |
| 3 | Task 4: Add `begin_checkout` | Small | Checkout funnel visibility |
| 4 | Task 3: Chat message tracking | Tiny | 1 line of code |
| 5 | Task 1: Landing page CTA attribution | Medium | Registration source attribution |
| 6 | Task 5: End page CTA click | Small | End-page funnel visibility |
| 7 | Task 2: Calendar button tracking | Small | Lobby engagement metrics |
| 8 | Task 6: GA4 mappings for server-only events | Small | Data completeness |
| 9 | Task 8: Join deduplication | Tiny | Data accuracy |
| 10 | Task 12: video_time_sec + watch_duration_sec | Medium | Engagement depth metrics |
| 11 | Task 10: Enhanced conversions | Small | Google Ads attribution recovery |
| 12 | Task 9: Scroll depth | Medium | Landing page optimization |
| 13 | Task 13: Console logging gate | Tiny | Clean production logs |

### 4.6 Verification Plan

After implementation:
1. Enable `?debug_mode=true` and verify each event in GA4 DebugView
2. Walk through full funnel: Landing → Register → Lobby → Live → End → Checkout → Purchase
3. Verify each event fires **exactly once** per action
4. Verify `purchase` event shows correct dynamic value/currency
5. Verify CTA source attribution flows through `sign_up` event
6. Check Real-Time report in GA4 shows live traffic
7. After 48h, build Funnel Exploration report to confirm data flows

---

## Summary

| Category | Implemented | Partial | Missing | Total |
|----------|------------|---------|---------|-------|
| Landing Page | 1 (auto page_view) | 1 (sign_up no source) | 3 (scroll, button clicks) | 5 |
| Lobby | 0 | 0 | 3 (calendar, transition) | 3 |
| Live Room | 3 (join, progress, cta_click) | 1 (cta_view server-only) | 1 (chat_message) | 5 |
| Checkout | 1 (purchase) | 0 | 2 (begin_checkout, error) | 3 |
| End Page | 1 (c_webinar_complete) | 0 | 1 (CTA click) | 2 |
| **Total** | **6** | **2** | **10** | **18** |

**Coverage: ~33% fully implemented, ~44% missing entirely.**

The most critical gaps are:
1. **Broken attribution chain** (Agent C discovery) — gclid/UTM stored in sessionStorage but NEVER attached to conversion events. Google Ads cannot attribute any conversions.
2. **`begin_checkout`** — defined in code but never called (checkout funnel invisible)
3. **Purchase hardcoded values** — revenue data will be wrong ($997 USD regardless of actual amount)
4. **Landing page CTA attribution** — can't optimize which button converts better
5. **Chat message tracking** — defined, mapped, but the actual call is missing (1 line fix)
6. **`cta_view` not mapped to GA4** — CTA impressions tracked server-side only, can't calculate CTA conversion rate
