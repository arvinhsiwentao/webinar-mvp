# GTM Tracking Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify all analytics tracking through GTM `dataLayer.push()`, remove the legacy dual-fire `track()` system, add missing events, and increase video progress granularity.

**Architecture:** All events flow through one function: `trackGA4()` → `window.dataLayer.push()` → GTM → GA4. The legacy `track()` wrapper (which dual-fires to both `/api/track` server endpoint and GA4) is removed entirely. A new 60-second video heartbeat replaces the coarse 25% milestone system.

**Tech Stack:** Next.js 16, React 19, TypeScript, GTM via `@next/third-parties/google`

---

## Event Inventory (After Overhaul)

All events use `trackGA4()` → `window.dataLayer.push()`. No server-side `/api/track`.

| # | Event Name | Page | Type | Key Params |
|---|---|---|---|---|
| 1 | `c_scroll_depth` | Landing | Custom | `percent` (10% intervals), `page` |
| 2 | `c_signup_button_click` | Landing | Custom | `button_position`, `webinar_id` |
| 3 | `sign_up` | Registration Modal | GA4 Recommended | `method`, `webinar_id` |
| 4 | `c_add_to_calendar` | Lobby | Custom | `method`, `webinar_id` |
| 5 | `c_enter_live` | Lobby | Custom | `webinar_id`, `entry_method` |
| 6 | `join_group` | Live Room | GA4 Recommended | `group_id`, `webinar_id` |
| 7 | `c_video_heartbeat` | Live Room | Custom | `webinar_id`, `current_time_sec`, `watch_duration_sec` |
| 8 | `c_video_progress` | Live Room | Custom | `webinar_id`, `percent` (5% intervals) |
| 9 | `c_chat_message` | Live Room | Custom | `webinar_id`, `video_time_sec` |
| 10 | `c_cta_view` | Live Room | Custom | `webinar_id`, `cta_id`, `cta_type`, `video_time_sec` |
| 11 | `c_cta_dismiss` | Live Room | Custom | `webinar_id`, `cta_id`, `cta_type`, `video_time_sec` |
| 12 | `begin_checkout` | Live Room + End | GA4 Recommended | `currency`, `value`, `items` |
| 13 | `c_webinar_complete` | End Page only | Custom | `webinar_id`, `watch_duration_sec` |
| 14 | `c_end_page_cta_click` | End Page | Custom | `webinar_id`, `button_text` |
| 15 | `c_share_click` | End Page | Custom | `webinar_id`, `platform` |
| 16 | `purchase` | Checkout Return | GA4 Recommended | `transaction_id`, `value`, `currency`, `items` |

### Events REMOVED vs current:
- `webinar_leave` (from Live Room) — replaced by heartbeat; `c_webinar_complete` fires only on End Page
- `c_cta_click` — merged into `begin_checkout` (CTA context params added to `begin_checkout`)
- All server-side `/api/track` calls — removed

---

## Task 1: Update GA4EventMap types in `analytics.ts`

**Files:**
- Modify: `src/lib/analytics.ts`

**Step 1: Update the GA4EventMap type**

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
    window.dataLayer.push({ event: eventName, ...params })
  } catch {
    // GTM not loaded — silently ignore
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors related to `analytics.ts`

**Step 3: Commit**

```bash
git add src/lib/analytics.ts
git commit -m "refactor: update GA4EventMap with complete GTM event types

Add c_enter_live, c_video_heartbeat, c_share_click events.
Add cta_id/video_time_sec to begin_checkout.
Add dev console logging to trackGA4.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Delete legacy `track()` system

**Files:**
- Delete: `src/lib/tracking.ts`
- Delete: `src/app/api/track/route.ts`
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx` (remove import)

**Step 1: Remove the import of `track` from live page**

In `src/app/(public)/webinar/[id]/live/page.tsx`, change line 17:

```typescript
// REMOVE this line:
import { track } from '@/lib/tracking';
```

Do NOT add a replacement import — `trackGA4` is already imported on line 18.

**Step 2: Delete tracking.ts**

```bash
rm src/lib/tracking.ts
```

**Step 3: Delete the /api/track route**

```bash
rm src/app/api/track/route.ts
```

**Step 4: Verify no remaining references**

Run: `grep -r "from '@/lib/tracking'" src/` — should return nothing.
Run: `grep -r "appendEvent" src/` — should only return `src/lib/db.ts` (the definition).

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Errors in `live/page.tsx` where `track(` calls exist — these are fixed in Task 3.

**Step 6: Commit**

```bash
git add -u
git commit -m "refactor: remove legacy track() dual-fire system

Delete tracking.ts (GA4_EVENT_MAP + server POST wrapper).
Delete /api/track route. All tracking now goes through
trackGA4() → dataLayer → GTM exclusively.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Rewrite Live Room tracking

This is the largest task — converts all `track()` calls to `trackGA4()`, adds heartbeat, increases video progress to 5% intervals.

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

**Step 1: Replace `webinar_join` tracking (line 225-230)**

Replace:
```typescript
useEffect(() => {
    if (!joinTracked.current) {
      joinTracked.current = true;
      track('webinar_join', { webinarId });
    }
  }, [webinarId]);
```

With:
```typescript
useEffect(() => {
    if (!joinTracked.current) {
      joinTracked.current = true;
      trackGA4('join_group', { group_id: webinarId, webinar_id: webinarId });
    }
  }, [webinarId]);
```

**Step 2: Add 60-second heartbeat effect**

Add this new `useEffect` right after the join tracking effect:

```typescript
  // Video heartbeat — sends watch position every 60 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const watchDuration = Math.round(currentTime - lateJoinSeconds);
      if (watchDuration > 0) {
        trackGA4('c_video_heartbeat', {
          webinar_id: webinarId,
          current_time_sec: Math.round(currentTime),
          watch_duration_sec: watchDuration,
        });
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [isPlaying, webinarId, currentTime, lateJoinSeconds]);
```

**Step 3: Replace video progress milestones (inside `handlePlaybackEvent`)**

In the `handlePlaybackEvent` callback, replace the milestone array `[25, 50, 75, 100]` with 5% intervals.

Replace:
```typescript
        [25, 50, 75, 100].forEach(milestone => {
            if (percent >= milestone && !trackedMilestones.current.has(milestone)) {
              trackedMilestones.current.add(milestone);
              track('video_progress', { webinarId, percent: milestone });
            }
          });
```

With:
```typescript
        const milestones = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
        for (const milestone of milestones) {
          if (percent >= milestone && !trackedMilestones.current.has(milestone)) {
            trackedMilestones.current.add(milestone);
            trackGA4('c_video_progress', { webinar_id: webinarId, percent: milestone });
          }
        }
```

**Step 4: Replace `webinar_leave` on video ended**

Replace:
```typescript
      if (event.type === 'ended') {
        setIsPlaying(false);
        track('webinar_leave', { webinarId, reason: 'ended', watchDurationSec: Math.round(event.currentTime) });
```

With:
```typescript
      if (event.type === 'ended') {
        setIsPlaying(false);
        // Final heartbeat with exact end position
        trackGA4('c_video_heartbeat', {
          webinar_id: webinarId,
          current_time_sec: Math.round(event.currentTime),
          watch_duration_sec: Math.round(event.currentTime - lateJoinSeconds),
        });
```

Note: `c_webinar_complete` now fires only on the End Page (Task 5), not here.

**Step 5: Replace `chat_message` tracking**

Replace:
```typescript
      track('chat_message', { webinarId });
```

With:
```typescript
      trackGA4('c_chat_message', { webinar_id: webinarId, video_time_sec: Math.round(currentTime) });
```

**Step 6: Replace CTA click — merge `cta_click` + `begin_checkout` into single event**

Replace the entire `handleCTAClick` body's tracking section (lines 344-349):
```typescript
    track('cta_click', { webinarId, buttonText: cta.buttonText, ctaId: cta.id, videoTime: currentTime });
    trackGA4('begin_checkout', {
      currency: 'USD',
      value: 997,
      items: [{ item_id: `webinar_${webinarId}`, item_name: cta.buttonText, price: 997, quantity: 1 }],
    });
```

With single event:
```typescript
    trackGA4('begin_checkout', {
      currency: 'USD',
      value: 997,
      items: [{ item_id: `webinar_${webinarId}`, item_name: cta.buttonText, price: 997, quantity: 1 }],
      cta_id: cta.id,
      video_time_sec: Math.round(currentTime),
      source: 'live',
    });
```

**Step 7: Replace CTA view tracking (lines 494 and 504)**

Replace both instances of:
```typescript
onCTAView={(cta) => track('cta_view', { webinarId, buttonText: cta.buttonText, ctaId: cta.id })}
```

With:
```typescript
onCTAView={(cta) => trackGA4('c_cta_view', { webinar_id: webinarId, cta_id: cta.id, cta_type: cta.buttonText.slice(0, 100), video_time_sec: Math.round(currentTime) })}
```

**Step 8: Replace CTA dismiss tracking (lines 495 and 506)**

Replace both instances of:
```typescript
onCTADismiss={(cta) => track('cta_dismiss', { webinarId, buttonText: cta.buttonText, ctaId: cta.id, videoTime: currentTime })}
```

With:
```typescript
onCTADismiss={(cta) => trackGA4('c_cta_dismiss', { webinar_id: webinarId, cta_id: cta.id, cta_type: cta.buttonText.slice(0, 100), video_time_sec: Math.round(currentTime) })}
```

**Step 9: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

**Step 10: Commit**

```bash
git add src/app/(public)/webinar/[id]/live/page.tsx
git commit -m "refactor: rewrite Live Room tracking to pure GTM

- Replace all track() calls with trackGA4()
- Add 60s video heartbeat (c_video_heartbeat)
- Video progress: 5% intervals (was 25%)
- Merge cta_click + begin_checkout into single begin_checkout
- Add video_time_sec to chat and CTA events
- Remove webinar_leave (completion tracked on End Page only)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Add `c_enter_live` to Lobby page

**Files:**
- Modify: `src/app/(public)/webinar/[id]/lobby/page.tsx`

**Step 1: Add trackGA4 to `handleEnterLive` (line 85-87)**

Replace:
```typescript
  const handleEnterLive = () => {
    router.push(buildLiveUrl());
  };
```

With:
```typescript
  const handleEnterLive = () => {
    trackGA4('c_enter_live', { webinar_id: webinarId, entry_method: 'button' });
    router.push(buildLiveUrl());
  };
```

**Step 2: Add tracking to countdown auto-redirect (line 81-83)**

Replace:
```typescript
  const handleCountdownComplete = useCallback(() => {
    router.push(buildLiveUrl());
  }, [router, buildLiveUrl]);
```

With:
```typescript
  const handleCountdownComplete = useCallback(() => {
    trackGA4('c_enter_live', { webinar_id: webinarId, entry_method: 'countdown_auto' });
    router.push(buildLiveUrl());
  }, [router, buildLiveUrl, webinarId]);
```

**Step 3: Add tracking to LIVE state auto-redirect (line 44-48)**

Inside the `fetchWebinar` function, find the LIVE redirect block:
```typescript
          if (state === 'LIVE') {
            const slotParam = `&slot=${encodeURIComponent(slotTime)}`;
            router.push(`/webinar/${webinarId}/live?name=${encodeURIComponent(userName)}${slotParam}`);
            return;
          }
```

Add tracking before the push:
```typescript
          if (state === 'LIVE') {
            trackGA4('c_enter_live', { webinar_id: webinarId, entry_method: 'redirect_live' });
            const slotParam = `&slot=${encodeURIComponent(slotTime)}`;
            router.push(`/webinar/${webinarId}/live?name=${encodeURIComponent(userName)}${slotParam}`);
            return;
          }
```

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(public)/webinar/[id]/lobby/page.tsx
git commit -m "feat: add c_enter_live tracking to Lobby page

Track all three entry methods: button click, countdown auto-redirect,
and immediate LIVE state redirect. Closes tracking gap between
registration and live room join.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Fix End Page tracking

**Files:**
- Modify: `src/app/(public)/webinar/[id]/end/page.tsx`

**Step 1: Pass watch duration from Live Room to End Page via sessionStorage**

This requires a small addition to `live/page.tsx` — in the video `ended` handler, before the redirect:

In `src/app/(public)/webinar/[id]/live/page.tsx`, inside the `event.type === 'ended'` block, add before `setTimeout`:

```typescript
        // Persist watch duration for End Page
        try {
          sessionStorage.setItem(`webinar-${webinarId}-watch-duration`, String(Math.round(event.currentTime - lateJoinSeconds)));
        } catch { /* ignore */ }
```

**Step 2: Read watch duration on End Page and include in `c_webinar_complete`**

In `src/app/(public)/webinar/[id]/end/page.tsx`, replace the tracking inside `fetchWebinar` (lines 31-34):

```typescript
        trackGA4('c_webinar_complete', {
          webinar_id: String(webinarId),
        });
```

With:
```typescript
        let watchDuration: number | undefined;
        try {
          const stored = sessionStorage.getItem(`webinar-${webinarId}-watch-duration`);
          if (stored) watchDuration = Number(stored);
        } catch { /* ignore */ }
        trackGA4('c_webinar_complete', {
          webinar_id: String(webinarId),
          watch_duration_sec: watchDuration,
        });
```

**Step 3: Fix `begin_checkout` hardcoded price + add source param**

Replace (lines 107-111):
```typescript
                trackGA4('begin_checkout', {
                  currency: 'USD',
                  value: 997,
                  items: [{ item_id: `webinar_${webinarId}`, item_name: webinar.title, price: 997, quantity: 1 }],
                });
```

With:
```typescript
                trackGA4('begin_checkout', {
                  currency: 'USD',
                  value: 997,
                  items: [{ item_id: `webinar_${webinarId}`, item_name: webinar.title, price: 997, quantity: 1 }],
                  source: 'end',
                });
```

Note: price is still 997 because `CTAEvent` type has no `price` field. When a pricing system is added later, update here.

**Step 4: Add share button tracking**

Find the Facebook share link (around line 150-158) and add onClick:

```typescript
            onClick={() => trackGA4('c_share_click', { webinar_id: String(webinarId), platform: 'facebook' })}
```

Find the Twitter share link (around line 159-167) and add onClick:

```typescript
            onClick={() => trackGA4('c_share_click', { webinar_id: String(webinarId), platform: 'twitter' })}
```

**Step 5: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/(public)/webinar/[id]/end/page.tsx src/app/(public)/webinar/[id]/live/page.tsx
git commit -m "fix: End Page tracking — add watch duration, share clicks

- Pass watch_duration_sec via sessionStorage from Live Room
- Include watch_duration_sec in c_webinar_complete
- Add source param to begin_checkout
- Add c_share_click tracking for Facebook/Twitter buttons

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Increase Landing Page scroll depth granularity

**Files:**
- Modify: `src/app/(public)/page.tsx`

**Step 1: Change scroll milestones from 25% to 10% intervals**

Replace (lines 132-136):
```typescript
      [25, 50, 75, 100].forEach(m => {
        if (scrollPct >= m && !milestones.has(m)) {
          milestones.add(m);
          trackGA4('c_scroll_depth', { percent: m, page: 'landing' });
        }
      });
```

With:
```typescript
      for (const m of [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]) {
        if (scrollPct >= m && !milestones.has(m)) {
          milestones.add(m);
          trackGA4('c_scroll_depth', { percent: m, page: 'landing' });
        }
      }
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/(public)/page.tsx
git commit -m "feat: increase scroll depth granularity to 10% intervals

Was 25/50/75/100%, now 10/20/.../100% for finer
Landing Page engagement analysis.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Clean up unused `appendEvent` in db.ts

**Files:**
- Modify: `src/lib/db.ts`

**Step 1: Verify `appendEvent` has no remaining callers**

Run: `grep -r "appendEvent" src/ --include="*.ts" --include="*.tsx"` — should only return the definition in `db.ts`.

**Step 2: Remove the function**

Delete the `appendEvent` function (around lines 226-231) and its comment block from `src/lib/db.ts`:

```typescript
// --- Tracking events ---

export async function appendEvent(event: unknown): Promise<void> {
  const { error } = await supabase
    .from('events')
    .insert({ data: event });
  if (error) throw error;
}
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/db.ts
git commit -m "chore: remove unused appendEvent from db.ts

No longer needed — server-side event tracking removed in favor
of pure GTM/GA4 pipeline.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Full build verification

**Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

**Step 3: Run production build**

Run: `npm run build`
Expected: PASS — all pages compile successfully

**Step 4: Manual smoke test**

Run: `npm run dev`

Open browser DevTools console and verify:
1. **Landing Page** (`/`): Scroll down — console shows `[GA4] c_scroll_depth` at 10%, 20%, etc.
2. **Landing Page**: Click CTA button — console shows `[GA4] c_signup_button_click`
3. **Lobby Page**: Click "进入直播间" — console shows `[GA4] c_enter_live`
4. **Live Room**: Watch video — console shows `[GA4] c_video_heartbeat` every 60s
5. **Live Room**: Console shows `[GA4] c_video_progress` at 5% milestones
6. **Live Room**: Send chat message — console shows `[GA4] c_chat_message` with `video_time_sec`
7. **End Page**: Console shows `[GA4] c_webinar_complete` with `watch_duration_sec`

---

## Summary of Changes

| File | Action |
|---|---|
| `src/lib/analytics.ts` | Rewrite GA4EventMap with all new event types |
| `src/lib/tracking.ts` | DELETE |
| `src/app/api/track/route.ts` | DELETE |
| `src/lib/db.ts` | Remove `appendEvent` |
| `src/app/(public)/page.tsx` | Scroll depth → 10% intervals |
| `src/app/(public)/webinar/[id]/lobby/page.tsx` | Add `c_enter_live` tracking |
| `src/app/(public)/webinar/[id]/live/page.tsx` | Full rewrite: heartbeat, 5% progress, pure trackGA4 |
| `src/app/(public)/webinar/[id]/end/page.tsx` | Fix watch duration, add share tracking |
