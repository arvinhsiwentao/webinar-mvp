# GA4 Tracking Audit Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 tracking gaps identified in the marketing funnel audit: remove redundant `join_group`, add lobby instrumentation, add purchase fallback logging, add thank-you page confirmation event, and update docs.

**Architecture:** All tracking uses client-side `trackGA4()` which pushes to `window.dataLayer` (GTM). No server-side GA4 endpoint exists. Lobby abandon tracking will use `trackGA4()` on `pagehide` (dataLayer.push is synchronous, processed before unload). New event types are added to the typed `GA4EventMap` in `analytics.ts`.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, GA4 via GTM dataLayer

**No test framework configured** — verify via `npx tsc --noEmit` and `npm run build`.

---

## Task 1: Remove `join_group` — keep only `c_enter_live`

**Why:** `join_group` fires on live page mount (too late), lacks entry_method context, and semantically mismatches GA4's "group" concept. `c_enter_live` fires at the decision point in lobby with 3 entry method variants. Having both double-counts conversions.

**Files:**
- Modify: `src/lib/analytics.ts:6,33`
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx:83,154-161`

**Step 1: Remove `join_group` from GA4EventMap type**

In `src/lib/analytics.ts`, delete line 6:
```typescript
  join_group: { group_id: string; webinar_id?: string }
```

**Step 2: Remove `join_group` from CONVERSION_EVENTS set**

In `src/lib/analytics.ts`, delete `'join_group',` from the Set on line 33.

**Step 3: Remove `join_group` useEffect from live page**

In `src/app/(public)/webinar/[id]/live/page.tsx`, delete the `joinTracked` ref (line 83) and the entire useEffect block (lines 154-161):
```typescript
// DELETE these lines:
  const joinTracked = useRef(false);

  useEffect(() => {
    const storageKey = `join_group_fired_${webinarId}`;
    if (!joinTracked.current && !sessionStorage.getItem(storageKey)) {
      joinTracked.current = true;
      try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
      trackGA4('join_group', { group_id: webinarId, webinar_id: webinarId });
    }
  }, [webinarId]);
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors (no other code references `join_group`)

**Step 5: Commit**

```bash
git add src/lib/analytics.ts src/app/\(public\)/webinar/\[id\]/live/page.tsx
git commit -m "fix(tracking): remove redundant join_group, keep c_enter_live

c_enter_live fires at lobby→live transition with entry_method context.
join_group fired too late (page mount) and lacked semantic fit for
webinar use case. Removing eliminates conversion double-counting.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Add lobby tracking events (entered, duration, abandon)

**Why:** The lobby is a black hole in the funnel — no visibility between registration and live entry. Can't measure lobby arrival rate, abandonment, or wait time.

**Files:**
- Modify: `src/lib/analytics.ts` (add 3 event types to GA4EventMap)
- Modify: `src/app/(public)/webinar/[id]/lobby/page.tsx` (add tracking hooks)

**Step 1: Add event types to GA4EventMap**

In `src/lib/analytics.ts`, add these 3 entries inside `GA4EventMap` after the `c_share_click` line (line 22):

```typescript
  c_lobby_entered: { webinar_id: string; webinar_state: string }
  c_lobby_abandon: { webinar_id: string; duration_sec: number; minutes_until_start: number }
  c_lobby_duration: { webinar_id: string; duration_sec: number; exit_type: 'enter_live' | 'abandon' }
```

**Step 2: Add `useRef` for tracking in lobby page**

In `src/app/(public)/webinar/[id]/lobby/page.tsx`, add `useRef` to the import on line 3:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
```

**Step 3: Add lobby entry tracking + duration/abandon tracking**

In `src/app/(public)/webinar/[id]/lobby/page.tsx`, add after line 24 (`const [registrationCount, setRegistrationCount] = useState(0);`):

```typescript
  const lobbyEntryTime = useRef(Date.now());
  const lobbyTracked = useRef(false);
  const exitTracked = useRef(false);
```

**Step 4: Add `c_lobby_entered` event**

In the `fetchWebinar` useEffect, after `setRegistrationCount(data.registrationCount || 0);` (line 36) and before the evergreen state check, add:

```typescript
        // Track lobby entry (once)
        if (!lobbyTracked.current) {
          lobbyTracked.current = true;
          trackGA4('c_lobby_entered', {
            webinar_id: webinarId,
            webinar_state: slotTime && data.webinar.evergreen?.enabled
              ? getEvergreenState(slotTime, getSlotExpiresAt(slotTime, data.webinar.evergreen.videoDurationMinutes), true)
              : 'standard',
          });
        }
```

**Step 5: Add exit tracking useEffect (duration + abandon)**

Add a new useEffect after the visibility handler useEffect (after line 108). This fires `c_lobby_abandon` on page hide and `c_lobby_duration` for all exits:

```typescript
  // Track lobby exit (abandon or enter_live)
  useEffect(() => {
    const handlePageHide = () => {
      if (exitTracked.current) return;
      exitTracked.current = true;
      const durationSec = Math.round((Date.now() - lobbyEntryTime.current) / 1000);
      const minutesUntilStart = countdownTarget
        ? (new Date(countdownTarget).getTime() - Date.now()) / 60000
        : 0;
      trackGA4('c_lobby_abandon', {
        webinar_id: webinarId,
        duration_sec: durationSec,
        minutes_until_start: Math.round(minutesUntilStart),
      });
      trackGA4('c_lobby_duration', {
        webinar_id: webinarId,
        duration_sec: durationSec,
        exit_type: 'abandon',
      });
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [webinarId, countdownTarget]);
```

**Step 6: Mark exit as "enter_live" instead of "abandon" on transition**

Modify the three `c_enter_live` call sites to also fire `c_lobby_duration` with `exit_type: 'enter_live'` and mark exit as tracked. Update these functions:

In `handleCountdownComplete` (line 82-85), replace with:
```typescript
  const handleCountdownComplete = useCallback(() => {
    if (!exitTracked.current) {
      exitTracked.current = true;
      const durationSec = Math.round((Date.now() - lobbyEntryTime.current) / 1000);
      trackGA4('c_lobby_duration', { webinar_id: webinarId, duration_sec: durationSec, exit_type: 'enter_live' });
    }
    trackGA4('c_enter_live', { webinar_id: webinarId, entry_method: 'countdown_auto' });
    router.push(buildLiveUrl());
  }, [router, buildLiveUrl, webinarId]);
```

In `handleEnterLive` (line 87-90), replace with:
```typescript
  const handleEnterLive = () => {
    if (!exitTracked.current) {
      exitTracked.current = true;
      const durationSec = Math.round((Date.now() - lobbyEntryTime.current) / 1000);
      trackGA4('c_lobby_duration', { webinar_id: webinarId, duration_sec: durationSec, exit_type: 'enter_live' });
    }
    trackGA4('c_enter_live', { webinar_id: webinarId, entry_method: 'button' });
    router.push(buildLiveUrl());
  };
```

In the visibility handler (line 100-102), add before the existing `trackGA4` call:
```typescript
      if (Date.now() >= startTime) {
        if (!exitTracked.current) {
          exitTracked.current = true;
          const durationSec = Math.round((Date.now() - lobbyEntryTime.current) / 1000);
          trackGA4('c_lobby_duration', { webinar_id: webinarId, duration_sec: durationSec, exit_type: 'enter_live' });
        }
        trackGA4('c_enter_live', { webinar_id: webinarId, entry_method: 'countdown_auto' });
        router.push(buildLiveUrl());
      }
```

**Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 8: Commit**

```bash
git add src/lib/analytics.ts src/app/\(public\)/webinar/\[id\]/lobby/page.tsx
git commit -m "feat(tracking): add lobby instrumentation (entered, duration, abandon)

Adds 3 new GA4 events to close the funnel blind spot between
registration and live entry:
- c_lobby_entered: fires on page load (measures reg→lobby conversion)
- c_lobby_duration: fires on exit with duration_sec + exit_type
- c_lobby_abandon: fires on pagehide if user leaves before entering live

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Add purchase fallback logging

**Why:** When Stripe's `amount_total` is null, the purchase event silently uses the hardcoded $599 fallback. This could mask data quality issues if Stripe API changes.

**Files:**
- Modify: `src/app/(public)/checkout/[webinarId]/return/page.tsx:36`

**Step 1: Add console.warn when fallback triggers**

In `src/app/(public)/checkout/[webinarId]/return/page.tsx`, replace line 36:
```typescript
            const purchaseValue = data.amountTotal ? data.amountTotal / 100 : DEFAULT_PRODUCT_PRICE;
```
with:
```typescript
            const purchaseValue = data.amountTotal
              ? data.amountTotal / 100
              : (() => {
                  console.warn('[GA4] Purchase fallback: amountTotal missing from session-status', { sessionId, webinarId });
                  return DEFAULT_PRODUCT_PRICE;
                })();
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(public\)/checkout/\[webinarId\]/return/page.tsx
git commit -m "fix(tracking): log warning when purchase event uses fallback price

Adds console.warn when Stripe amountTotal is missing, making it
visible in browser dev tools if the fallback $599 is used instead
of the real Stripe amount.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Add `c_purchase_confirmation` backup event on return page

**Why:** The `purchase` event is client-dependent — it doesn't fire if user closes browser after payment, network fails, or ad blocker intercepts GTM. Adding a separate confirmation event with different parameters provides a cross-check signal. Compare DB order count vs GA4 purchase count vs confirmation count to detect gaps.

**Files:**
- Modify: `src/lib/analytics.ts` (add event type)
- Modify: `src/app/(public)/checkout/[webinarId]/return/page.tsx` (fire event)

**Step 1: Add event type to GA4EventMap**

In `src/lib/analytics.ts`, add to GA4EventMap after `c_share_click` (or after the lobby events from Task 2):

```typescript
  c_purchase_confirmation: { webinar_id: string; transaction_id: string; order_status: string }
```

**Step 2: Fire confirmation event after purchase event**

In `src/app/(public)/checkout/[webinarId]/return/page.tsx`, after the `trackGA4('purchase', ...)` call (after line 48, inside the `if (!purchaseTracked.current)` block), add:

```typescript
            trackGA4('c_purchase_confirmation', {
              webinar_id: webinarId,
              transaction_id: sessionId || `session_${Date.now()}`,
              order_status: data.orderStatus || 'unknown',
            });
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/lib/analytics.ts src/app/\(public\)/checkout/\[webinarId\]/return/page.tsx
git commit -m "feat(tracking): add c_purchase_confirmation backup event

Fires alongside purchase event on return page. Provides a cross-check
signal — compare DB orders vs GA4 purchase vs confirmation counts to
detect client-side tracking gaps (browser close, ad blockers, etc).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Update documentation

**Why:** Architecture docs must reflect tracking changes (CLAUDE.md rule #5).

**Files:**
- Modify: `docs/architecture.md` (analytics/tracking section)
- Modify: `docs/decisions.md` (append decision log)

**Step 1: Update architecture.md tracking section**

Find the analytics/tracking section in `docs/architecture.md` and update the event list to:
- Remove `join_group` from listed events
- Add `c_lobby_entered`, `c_lobby_abandon`, `c_lobby_duration`
- Add `c_purchase_confirmation`
- Note: lobby events close the registration→live funnel gap

**Step 2: Append to decisions.md**

Append to `docs/decisions.md`:

```markdown

### 2026-03-12: GA4 tracking audit fixes

- **Removed `join_group`**: redundant with `c_enter_live` which fires at decision point (lobby→live transition) with entry_method context. `join_group` fired too late (page mount) and double-counted conversions.
- **Added lobby instrumentation**: `c_lobby_entered`, `c_lobby_duration`, `c_lobby_abandon` close the funnel blind spot between registration and live entry.
- **Added `c_purchase_confirmation`**: backup event on return page for cross-checking against DB order counts to detect client-side tracking gaps.
- **Added purchase fallback logging**: console.warn when Stripe `amountTotal` is missing and fallback price is used.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: update architecture and decisions for GA4 tracking audit fixes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Verification Checklist

After all tasks:

1. `npx tsc --noEmit` — no type errors
2. `npm run build` — production build succeeds
3. Manual smoke test in dev (`npm run dev`):
   - Visit lobby page → check console for `[GA4] c_lobby_entered`
   - Leave lobby page → check console for `[GA4] c_lobby_abandon` + `c_lobby_duration`
   - Enter live room → check console for `[GA4] c_lobby_duration` (exit_type: enter_live) + `c_enter_live`
   - Confirm NO `[GA4] join_group` fires on live room load
   - Complete checkout → check console for both `[GA4] purchase` and `[GA4] c_purchase_confirmation`
