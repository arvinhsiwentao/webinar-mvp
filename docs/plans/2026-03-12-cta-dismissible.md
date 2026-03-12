# CTA Dismissible (Close Button) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow marketers to configure whether each CTA can be dismissed (closed) by the viewer via a close button.

**Architecture:** Add `dismissible?: boolean` to `CTAEvent`. When true, render an × button in top-right of the CTA. On click, add the CTA id to a local `dismissedIds` Set state — permanently hiding it for the session. Fire a `cta_dismiss` tracking event.

**Tech Stack:** React state, TypeScript interface, Tailwind CSS

---

### Task 1: Add `dismissible` field to CTAEvent type

**Files:**
- Modify: `src/lib/types.ts:3-13`

**Step 1: Add the field**

In `src/lib/types.ts`, add `dismissible?: boolean` to `CTAEvent` after `secondaryText`:

```typescript
export interface CTAEvent {
  id: string;
  showAtSec: number;
  hideAtSec: number;
  buttonText: string;
  promoText?: string;
  showCountdown: boolean;
  position?: 'on_video' | 'below_video';
  color?: string;
  secondaryText?: string;
  dismissible?: boolean;
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors (optional field, fully backward-compatible)

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add dismissible field to CTAEvent type"
```

---

### Task 2: Add `cta_dismiss` tracking event

**Files:**
- Modify: `src/lib/tracking.ts:4-31`

**Step 1: Add GA4 mapping**

In `src/lib/tracking.ts`, add a new entry to `GA4_EVENT_MAP` after the `cta_view` entry (after line 20):

```typescript
  cta_dismiss: (p) => trackGA4('c_cta_dismiss', {
    webinar_id: String(p.webinarId || ''),
    cta_type: String(p.buttonText || '').slice(0, 100),
    cta_id: p.ctaId ? String(p.ctaId) : undefined,
    video_time_sec: typeof p.videoTime === 'number' ? p.videoTime : undefined,
  }),
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/tracking.ts
git commit -m "feat: add cta_dismiss tracking event"
```

---

### Task 3: Implement close button in CTAOverlay component

**Files:**
- Modify: `src/components/cta/CTAOverlay.tsx`

**Step 1: Add `dismissedIds` state and `onCTADismiss` callback**

Add a new state `dismissedIds` (Set of string) and a new optional prop `onCTADismiss`:

```typescript
export interface CTAOverlayProps {
  currentTime: number;
  ctaEvents: CTAEvent[];
  onCTAClick?: (cta: CTAEvent) => void;
  onCTAView?: (cta: CTAEvent) => void;
  onCTADismiss?: (cta: CTAEvent) => void;  // NEW
  position?: 'on_video' | 'below_video';
}
```

Inside the component, add state:
```typescript
const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
```

In the `useEffect` that matches CTAs, filter out dismissed ones:
```typescript
for (const cta of ctaEvents) {
  if (dismissedIds.has(cta.id)) continue;  // NEW: skip dismissed
  if (currentTime >= cta.showAtSec && currentTime < cta.hideAtSec) {
    matched = cta;
    break;
  }
}
```

**Step 2: Add close button to the render**

After the opening `<div>` of the card (the one with `rounded-xl shadow-2xl`), add:

```tsx
{activeCTA.dismissible && (
  <button
    type="button"
    onClick={() => {
      setDismissedIds(prev => new Set(prev).add(activeCTA.id));
      setActiveCTA(null);
      setVisible(false);
      prevActive.current = null;
      onCTADismiss?.(activeCTA);
    }}
    className={`absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
      isOnVideo
        ? 'text-white/60 hover:text-white hover:bg-white/20'
        : 'text-[#999] hover:text-[#1A1A1A] hover:bg-black/10'
    }`}
    aria-label="关闭"
  >
    ✕
  </button>
)}
```

The card container div needs `relative` added to its className for absolute positioning of the close button.

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/cta/CTAOverlay.tsx
git commit -m "feat: add dismissible close button to CTA overlay"
```

---

### Task 4: Wire `onCTADismiss` in live page

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx:489-506`

**Step 1: Add dismiss handler and pass to both CTAOverlay instances**

Find the two `<CTAOverlay>` usages. Add `onCTADismiss` prop to each:

```tsx
onCTADismiss={(cta) => track('cta_dismiss', { webinarId, buttonText: cta.buttonText, ctaId: cta.id, videoTime: currentTime })}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(public\)/webinar/\[id\]/live/page.tsx
git commit -m "feat: wire cta_dismiss tracking in live page"
```

---

### Task 5: Add admin checkbox for dismissible

**Files:**
- Modify: `src/app/(admin)/admin/_components/WebinarForm.tsx`

**Step 1: Add `dismissible` to `CTAField` interface**

At line 76, add to the interface:
```typescript
interface CTAField {
  showAtSec: string;
  hideAtSec: string;
  buttonText: string;
  promoText: string;
  showCountdown: boolean;
  position: string;
  color: string;
  secondaryText: string;
  dismissible: boolean;  // NEW
}
```

**Step 2: Add default value in "添加 CTA" button handler**

At line 523, add `dismissible: false` to the new CTA object:
```typescript
onClick={() => setCtaEvents([...ctaEvents, {
  showAtSec: '',
  hideAtSec: '',
  buttonText: '',
  promoText: '',
  showCountdown: true,
  position: 'below_video',
  color: '',
  secondaryText: '',
  dismissible: false,  // NEW
}])}
```

**Step 3: Add default value in initial state mapping**

At line 122, add `dismissible` to the mapping:
```typescript
dismissible: c.dismissible || false,
```

**Step 4: Add checkbox in the 样式设置 section**

After the "显示倒计时" checkbox (after line 672), add:
```tsx
<label className="flex items-center gap-2 text-sm text-neutral-500">
  <input
    type="checkbox"
    checked={cta.dismissible}
    onChange={(e) => update('dismissible', e.target.checked as CTAField[keyof CTAField])}
    className="rounded accent-[#B8953F]"
  />
  允许用户关闭
</label>
```

**Step 5: Add to payload serialization**

At line 179, add `dismissible` to the CTA payload mapping:
```typescript
ctaEvents: ctaEvents.filter(c => c.buttonText).map(c => ({
  showAtSec: parseInt(c.showAtSec) || 0,
  hideAtSec: parseInt(c.hideAtSec) || 0,
  buttonText: c.buttonText,
  promoText: c.promoText || undefined,
  showCountdown: c.showCountdown,
  position: c.position || 'below_video',
  color: c.color || undefined,
  secondaryText: c.secondaryText || undefined,
  dismissible: c.dismissible || undefined,  // NEW
})),
```

**Step 6: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/\(admin\)/admin/_components/WebinarForm.tsx
git commit -m "feat: add dismissible checkbox to admin CTA config"
```

---

### Task 6: Build and verify

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Commit (if any fixes needed)**

Only if build required fixes.
