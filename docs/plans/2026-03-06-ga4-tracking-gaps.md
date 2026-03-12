# GA4 Tracking Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all GA4 tracking gaps identified in the audit report (`docs/plans/ga4-audit-report.md`), achieving full funnel visibility from landing page through purchase.

**Architecture:** Extend the existing dual-layer tracking (`analytics.ts` for GA4 types, `tracking.ts` for dual-fire). Add new GA4 event types, new GA4 mappings, and sprinkle tracking calls into existing components. No new components or pages needed — only modifications to existing files.

**Tech Stack:** Next.js App Router, `@next/third-parties/google` (`sendGAEvent`), TypeScript

**No test framework configured** — verification is manual via `console.log('[Track]')` output and `npx tsc --noEmit`. Each task ends with a type-check step.

---

## Task 1: Add New GA4 Event Types to `analytics.ts`

**Files:**
- Modify: `src/lib/analytics.ts`

All subsequent tasks depend on these types existing.

**Step 1: Add new event types**

Replace the entire `analytics.ts` with:

```typescript
import { sendGAEvent } from '@next/third-parties/google'

type GA4Item = { item_id: string; item_name: string; price: number; quantity: number }

type GA4EventMap = {
  // Recommended GA4 events
  sign_up: { method: string; webinar_id: string }
  join_group: { group_id: string; webinar_id?: string }
  begin_checkout: { currency: string; value: number; items: GA4Item[] }
  purchase: { transaction_id: string; value: number; currency: string; items: GA4Item[] }

  // Custom events (c_ prefix)
  c_cta_click: { webinar_id: string; cta_type: string; cta_url: string; cta_id?: string; video_time_sec?: number }
  c_cta_view: { webinar_id: string; cta_type: string; cta_id?: string }
  c_webinar_complete: { webinar_id: string; watch_duration_sec?: number }
  c_chat_message: { webinar_id: string }
  c_video_progress: { webinar_id: string; percent: number }
  c_signup_button_click: { button_position: string; webinar_id: string }
  c_add_to_calendar: { method: string; webinar_id: string }
  c_end_page_cta_click: { webinar_id: string; button_text: string }
  c_scroll_depth: { percent: number; page: string }
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

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

**Step 3: Commit**

```bash
git add src/lib/analytics.ts
git commit -m "feat(analytics): add new GA4 event types for tracking gaps"
```

---

## Task 2: Add GA4 Mappings + Console Log Gate in `tracking.ts`

**Files:**
- Modify: `src/lib/tracking.ts`

Adds GA4 mappings for `cta_view` and `webinar_leave` (currently server-only). Also gates console.log behind dev mode.

**Step 1: Update tracking.ts**

Replace the entire file with:

```typescript
import { trackGA4 } from './analytics'

// Map internal event names to GA4 events
const GA4_EVENT_MAP: Record<string, (props: Record<string, unknown>) => void> = {
  webinar_join: (p) => trackGA4('join_group', {
    group_id: String(p.webinarId || ''),
    webinar_id: String(p.webinarId || ''),
  }),
  cta_click: (p) => trackGA4('c_cta_click', {
    webinar_id: String(p.webinarId || ''),
    cta_type: String(p.buttonText || '').slice(0, 100),
    cta_url: String(p.url || ''),
    cta_id: p.ctaId ? String(p.ctaId) : undefined,
    video_time_sec: typeof p.videoTime === 'number' ? p.videoTime : undefined,
  }),
  cta_view: (p) => trackGA4('c_cta_view', {
    webinar_id: String(p.webinarId || ''),
    cta_type: String(p.buttonText || '').slice(0, 100),
    cta_id: p.ctaId ? String(p.ctaId) : undefined,
  }),
  video_progress: (p) => trackGA4('c_video_progress', {
    webinar_id: String(p.webinarId || ''),
    percent: typeof p.percent === 'number' ? p.percent : 0,
  }),
  chat_message: (p) => trackGA4('c_chat_message', {
    webinar_id: String(p.webinarId || ''),
  }),
  webinar_leave: (p) => trackGA4('c_webinar_complete', {
    webinar_id: String(p.webinarId || ''),
    watch_duration_sec: typeof p.watchDurationSec === 'number' ? p.watchDurationSec : undefined,
  }),
}

export function track(event: string, properties?: Record<string, unknown>) {
  const payload = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Track]', event, properties)
    }

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

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/lib/tracking.ts
git commit -m "feat(analytics): add cta_view/webinar_leave GA4 mappings, gate console.log"
```

---

## Task 3: Fix Chat Message Tracking (1 line)

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

The `chat_message` GA4 mapping already exists in tracking.ts. We just need to call `track()`.

**Step 1: Add tracking call to handleSendMessage**

In `src/app/(public)/webinar/[id]/live/page.tsx`, find the `handleSendMessage` callback (around line 239) and add the tracking call:

Change:
```typescript
  const handleSendMessage = useCallback(
    async (msg: ChatMessage) => {
      try {
        await fetch(`/api/webinar/${webinarId}/chat`, {
```

To:
```typescript
  const handleSendMessage = useCallback(
    async (msg: ChatMessage) => {
      track('chat_message', { webinarId });
      try {
        await fetch(`/api/webinar/${webinarId}/chat`, {
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/(public)/webinar/[id]/live/page.tsx
git commit -m "feat(analytics): track chat message sends to GA4"
```

---

## Task 4: Add `video_time_sec` to CTA Click + `watch_duration_sec` to Leave

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

**Step 1: Add `currentTime` to CTA click tracking**

Find the `handleCTAClick` callback (around line 315-316). Change:
```typescript
    track('cta_click', { webinarId, buttonText: cta.buttonText, url: cta.url });
```

To:
```typescript
    track('cta_click', { webinarId, buttonText: cta.buttonText, url: cta.url, ctaId: cta.id, videoTime: currentTime });
```

**Step 2: Add `watchDurationSec` to webinar_leave**

Find the `ended` handler (around line 226-228). Change:
```typescript
      if (event.type === 'ended') {
        setIsPlaying(false);
        track('webinar_leave', { webinarId, reason: 'ended' });
```

To:
```typescript
      if (event.type === 'ended') {
        setIsPlaying(false);
        track('webinar_leave', { webinarId, reason: 'ended', watchDurationSec: Math.round(event.currentTime) });
```

**Step 3: Add `ctaId` to cta_view calls**

Find the `onCTAView` callbacks (around lines 460, 470). Change each from:
```typescript
onCTAView={(cta) => track('cta_view', { webinarId, buttonText: cta.buttonText })}
```

To:
```typescript
onCTAView={(cta) => track('cta_view', { webinarId, buttonText: cta.buttonText, ctaId: cta.id })}
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(public)/webinar/[id]/live/page.tsx
git commit -m "feat(analytics): add video_time_sec to CTA click, watch_duration to leave"
```

---

## Task 5: Add `webinar_join` Deduplication

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

**Step 1: Add ref guard**

Near the existing `trackedMilestones` ref (around line 82), add:
```typescript
  const joinTracked = useRef(false);
```

Then change the join tracking useEffect (around line 201-203) from:
```typescript
  useEffect(() => {
    track('webinar_join', { webinarId });
  }, [webinarId]);
```

To:
```typescript
  useEffect(() => {
    if (!joinTracked.current) {
      joinTracked.current = true;
      track('webinar_join', { webinarId });
    }
  }, [webinarId]);
```

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/(public)/webinar/[id]/live/page.tsx
git commit -m "fix(analytics): deduplicate webinar_join event with ref guard"
```

---

## Task 6: Add Landing Page CTA Attribution

**Files:**
- Modify: `src/app/(public)/page.tsx`
- Modify: `src/components/registration/useRegistrationForm.ts`

**Step 1: Add source tracking to `openModal` in page.tsx**

Find the `openModal` function (around line 143) and the `isModalOpen` state. Add a `modalSource` state and modify `openModal`:

After the existing state declarations (around line 22), add:
```typescript
  const [modalSource, setModalSource] = useState<string>('');
```

Change `openModal` from:
```typescript
  const openModal = async () => {
    // Re-fetch fresh evergreen slots so the displayed time is current
    if (webinar?.evergreen?.enabled) {
      await refreshEvergreenSlots();
    }
    setIsModalOpen(true);
  };
```

To:
```typescript
  const openModal = async (source: string) => {
    // Re-fetch fresh evergreen slots so the displayed time is current
    if (webinar?.evergreen?.enabled) {
      await refreshEvergreenSlots();
    }
    trackGA4('c_signup_button_click', { button_position: source, webinar_id: DEFAULT_WEBINAR_ID });
    setModalSource(source);
    setIsModalOpen(true);
  };
```

Add the import at the top of the file (after the existing imports):
```typescript
import { trackGA4 } from '@/lib/analytics';
```

**Step 2: Update button onClick calls**

Find the hero CTA button (around line 195). Change:
```typescript
              onClick={openModal}
```
To:
```typescript
              onClick={() => openModal('hero')}
```

Find the footer CTA button (around line 337). Change:
```typescript
            onClick={openModal}
```
To:
```typescript
            onClick={() => openModal('footer')}
```

**Step 3: Pass source to useRegistrationForm**

In the `useRegistrationForm` call (around line 24), add `source`:

Change the hook options interface in `useRegistrationForm.ts` — add `source?` param:
```typescript
interface UseRegistrationFormOptions {
  webinarId: string;
  onSuccess: (name: string) => void;
  onFormSubmit?: () => void;
  emailErrorMessage?: string;
  assignedSlot?: string;
  source?: string;
}
```

Update the function signature:
```typescript
export function useRegistrationForm({ webinarId, onSuccess, onFormSubmit, emailErrorMessage = '请输入有效的邮箱地址', assignedSlot, source }: UseRegistrationFormOptions) {
```

Update the `sign_up` tracking call (line 53-56):
```typescript
      trackGA4('sign_up', {
        method: source ? `webinar_registration_${source}` : 'webinar_registration',
        webinar_id: String(webinarId),
      });
```

**Step 4: Wire `modalSource` in page.tsx**

In page.tsx, update the `useRegistrationForm` call (around line 24). Add `source: modalSource`:
```typescript
  const form = useRegistrationForm({
    webinarId: DEFAULT_WEBINAR_ID,
    assignedSlot: selectedSlotTime || evergreenSlots[0]?.slotTime,
    source: modalSource,
    onSuccess: (name) => {
```

**Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/\(public\)/page.tsx src/components/registration/useRegistrationForm.ts
git commit -m "feat(analytics): track landing page CTA source attribution"
```

---

## Task 7: Add `begin_checkout` + End Page CTA Click Tracking

**Files:**
- Modify: `src/app/(public)/webinar/[id]/end/page.tsx`
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

**Step 1: Add tracking to end page CTA button**

In `end/page.tsx`, the CTA button onClick starts at line 101. Add tracking calls before `router.push`:

Change:
```typescript
              onClick={() => {
                // Read email from localStorage
                let email = '';
                try {
                  const sticky = localStorage.getItem(`webinar-${webinarId}-evergreen`);
                  if (sticky) {
                    const parsed = JSON.parse(sticky);
                    email = parsed.email || '';
                  }
                } catch { /* ignore */ }

                const params = new URLSearchParams();
                if (email) params.set('email', email);
                if (userName !== '观众') params.set('name', userName);
                params.set('source', 'end');

                router.push(`/checkout/${webinarId}?${params.toString()}`);
              }}
```

To:
```typescript
              onClick={() => {
                const buttonText = webinar.endPageCtaText || firstCTA?.buttonText || '了解更多';
                trackGA4('c_end_page_cta_click', {
                  webinar_id: String(webinarId),
                  button_text: buttonText,
                });
                trackGA4('begin_checkout', {
                  currency: 'USD',
                  value: 997,
                  items: [{ item_id: `webinar_${webinarId}`, item_name: webinar.title, price: 997, quantity: 1 }],
                });

                // Read email from localStorage
                let email = '';
                try {
                  const sticky = localStorage.getItem(`webinar-${webinarId}-evergreen`);
                  if (sticky) {
                    const parsed = JSON.parse(sticky);
                    email = parsed.email || '';
                  }
                } catch { /* ignore */ }

                const params = new URLSearchParams();
                if (email) params.set('email', email);
                if (userName !== '观众') params.set('name', userName);
                params.set('source', 'end');

                router.push(`/checkout/${webinarId}?${params.toString()}`);
              }}
```

**Step 2: Add `begin_checkout` to live room CTA click**

In `live/page.tsx`, inside `handleCTAClick` (around line 315), after the existing `track('cta_click', ...)` call, add:

```typescript
    trackGA4('begin_checkout', {
      currency: 'USD',
      value: 997,
      items: [{ item_id: `webinar_${webinarId}`, item_name: cta.buttonText, price: 997, quantity: 1 }],
    });
```

Add the import at top of `live/page.tsx`:
```typescript
import { trackGA4 } from '@/lib/analytics';
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/\(public\)/webinar/\[id\]/end/page.tsx src/app/\(public\)/webinar/\[id\]/live/page.tsx
git commit -m "feat(analytics): add begin_checkout and end page CTA click tracking"
```

---

## Task 8: Add Calendar Button Tracking to Lobby

**Files:**
- Modify: `src/app/(public)/webinar/[id]/lobby/page.tsx`

**Step 1: Add trackGA4 import**

Add at top of file:
```typescript
import { trackGA4 } from '@/lib/analytics';
```

**Step 2: Add onClick to Google Calendar link**

Find the Google Calendar `<a>` tag (around line 325-331). It currently has no `onClick`. Add one:

Change:
```typescript
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#F5F5F0] hover:bg-[#EEEEE8] border border-[#E8E5DE] rounded-md px-3 py-2 text-center text-xs font-medium transition-colors"
                >
                  Google 日历
                </a>
```

To:
```typescript
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackGA4('c_add_to_calendar', { method: 'google', webinar_id: webinarId })}
                  className="flex-1 bg-[#F5F5F0] hover:bg-[#EEEEE8] border border-[#E8E5DE] rounded-md px-3 py-2 text-center text-xs font-medium transition-colors"
                >
                  Google 日历
                </a>
```

**Step 3: Add tracking to iCal download**

Find `handleDownloadICS` function. Add tracking at the start of the function body. Look for where `handleDownloadICS` is defined (should be a `useCallback` or function). Add as first line inside:

```typescript
trackGA4('c_add_to_calendar', { method: 'ical', webinar_id: webinarId });
```

**Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/\(public\)/webinar/\[id\]/lobby/page.tsx
git commit -m "feat(analytics): track calendar button clicks on lobby page"
```

---

## Task 9: Fix Purchase Event — Dynamic Values from Stripe

**Files:**
- Modify: `src/app/api/checkout/session-status/route.ts`
- Modify: `src/app/(public)/checkout/[webinarId]/return/page.tsx`

**Step 1: Return amount and currency from session-status API**

In `session-status/route.ts`, the response (around line 45-48) currently returns:
```typescript
    return NextResponse.json({
      status: session.status,
      customerEmail: session.customer_details?.email || session.customer_email,
    });
```

Change to:
```typescript
    return NextResponse.json({
      status: session.status,
      customerEmail: session.customer_details?.email || session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
      productName: session.metadata?.webinar_title || 'Webinar Course',
    });
```

**Step 2: Use dynamic values in return page**

In `checkout/[webinarId]/return/page.tsx`, change the purchase tracking (around line 34-46):

From:
```typescript
          if (!purchaseTracked.current) {
            purchaseTracked.current = true;
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
            });
          }
```

To:
```typescript
          if (!purchaseTracked.current) {
            purchaseTracked.current = true;
            const purchaseValue = data.amountTotal ? data.amountTotal / 100 : 997;
            const purchaseCurrency = (data.currency || 'usd').toUpperCase();
            trackGA4('purchase', {
              transaction_id: sessionId || `session_${Date.now()}`,
              value: purchaseValue,
              currency: purchaseCurrency,
              items: [{
                item_id: `webinar_${webinarId}`,
                item_name: data.productName || 'Webinar Course',
                price: purchaseValue,
                quantity: 1,
              }],
            });
          }
```

**Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/api/checkout/session-status/route.ts src/app/\(public\)/checkout/\[webinarId\]/return/page.tsx
git commit -m "fix(analytics): use dynamic Stripe values for purchase event"
```

---

## Task 10: Add Scroll Depth Tracking to Landing Page

**Files:**
- Modify: `src/app/(public)/page.tsx`

**Step 1: Add scroll depth tracking hook**

In `page.tsx`, add a `useEffect` for scroll tracking. Place it after the existing `useEffect` blocks (around line 90-100). Add inside the `HomePage` component:

```typescript
  // Scroll depth tracking
  useEffect(() => {
    const milestones = new Set<number>();
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) return;
      const scrollPct = Math.round((window.scrollY / scrollHeight) * 100);
      [25, 50, 75, 100].forEach(m => {
        if (scrollPct >= m && !milestones.has(m)) {
          milestones.add(m);
          trackGA4('c_scroll_depth', { percent: m, page: 'landing' });
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
```

Note: `trackGA4` was already imported in Task 6. If implementing this task independently, ensure the import exists.

**Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/\(public\)/page.tsx
git commit -m "feat(analytics): add scroll depth tracking to landing page"
```

---

## Task 11: Build Verification

**Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: PASS with 0 errors

**Step 2: Build**

Run: `npm run build`
Expected: PASS — no build errors

**Step 3: Manual smoke test**

Start dev server (`npm run dev`), open browser console, and walk through the funnel:

1. Visit `/` — check for `c_scroll_depth` in console as you scroll
2. Click hero CTA — check for `c_signup_button_click` with `button_position: "hero"`
3. Submit registration — check for `sign_up` with `method: "webinar_registration_hero"`
4. On lobby page — click Google Calendar — check for `c_add_to_calendar` with `method: "google"`
5. On live room — check for `join_group` (fires once only)
6. Watch video — check for `c_video_progress` at 25%
7. When CTA appears — check for `c_cta_view` with `ctaId`
8. Click CTA — check for `c_cta_click` with `videoTime` + `begin_checkout`
9. Send a chat message — check for `c_chat_message`
10. When video ends — check for `c_webinar_complete` with `watchDurationSec`
11. On end page — click purchase CTA — check for `c_end_page_cta_click` + `begin_checkout`
12. After Stripe checkout — check for `purchase` with dynamic value/currency

**Step 4: Commit final state**

```bash
git add -A
git commit -m "docs: update architecture for GA4 tracking enhancements"
```

---

## Summary — Files Modified

| File | Tasks | Changes |
|------|-------|---------|
| `src/lib/analytics.ts` | T1 | 6 new GA4 event types, `GA4Item` type alias |
| `src/lib/tracking.ts` | T2 | 2 new GA4 mappings, console gate, `webinar_id` on `join_group`, `ctaId` support |
| `src/app/(public)/webinar/[id]/live/page.tsx` | T3, T4, T5, T7 | Chat tracking, CTA `videoTime`+`ctaId`, join dedup, `begin_checkout`, `watchDurationSec` |
| `src/app/(public)/page.tsx` | T6, T10 | CTA source attribution, scroll depth tracking |
| `src/components/registration/useRegistrationForm.ts` | T6 | `source` param in `sign_up` event |
| `src/app/(public)/webinar/[id]/end/page.tsx` | T7 | `c_end_page_cta_click` + `begin_checkout` |
| `src/app/(public)/webinar/[id]/lobby/page.tsx` | T8 | Calendar button tracking |
| `src/app/api/checkout/session-status/route.ts` | T9 | Return `amountTotal`, `currency`, `productName` |
| `src/app/(public)/checkout/[webinarId]/return/page.tsx` | T9 | Dynamic purchase values |
