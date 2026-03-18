# Clean Code Refactor Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce complexity in the two largest components by extracting custom hooks and sub-components, eliminating duplicate logic.

**Architecture:** Extract business logic from `live/page.tsx` into custom hooks. Split `WebinarForm.tsx` form sections into sub-components. Consolidate repeated patterns.

**Tech Stack:** React 19 (custom hooks, components), TypeScript, Next.js App Router

---

## Scope & Priority

Based on codebase analysis, two files need refactoring:

| File | Lines | Primary Issue |
|------|-------|---------------|
| `src/app/(public)/webinar/[id]/live/page.tsx` | 683 | 77-line visibility handler, mixed concerns |
| `src/app/(admin)/admin/_components/WebinarForm.tsx` | 861 | Monolithic form, all sections inline |

**Out of scope:** Files under 400 lines, acceptable patterns (silent catch for localStorage, generic `data` naming after fetch).

---

## Task 1: Extract `useVisibilityResume` hook from live page

The visibility change handler (lines 146-223) is a 77-line `useEffect` with deep nesting that handles:
- Pre-show → live phase transition
- Seek-to-live-wall position
- Unmuted/muted play fallback chain

This is a self-contained concern that can become a custom hook.

**Files:**
- Create: `src/hooks/useVisibilityResume.ts`
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

**Step 1: Create the hook file**

```typescript
// src/hooks/useVisibilityResume.ts
'use client';

import { useEffect } from 'react';
import type Player from 'video.js/dist/types/player';

interface UseVisibilityResumeOptions {
  eventPhase: string;
  slotTime: string | null;
  playerRef: React.RefObject<Player | null>;
  setEventPhase: (phase: 'loading' | 'pre_event' | 'pre_show' | 'live' | 'ended') => void;
  setIsMuted: (muted: boolean) => void;
  setAutoplayBlocked: (blocked: boolean) => void;
}

export function useVisibilityResume({
  eventPhase,
  slotTime,
  playerRef,
  setEventPhase,
  setIsMuted,
  setAutoplayBlocked,
}: UseVisibilityResumeOptions) {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;

      // If still in pre_show but start time has passed, transition immediately
      if (eventPhase === 'pre_show' && slotTime) {
        const now = Date.now();
        const startMs = new Date(slotTime).getTime();
        if (now >= startMs) {
          setEventPhase('live');
        }
      }

      // If live, catch up to real-time and resume if paused
      if (eventPhase === 'live' || (eventPhase === 'pre_show' && slotTime && Date.now() >= new Date(slotTime).getTime())) {
        const player = playerRef.current;
        if (!player || player.isDisposed()) return;

        const seekToLiveWall = () => {
          if (player.isDisposed() || !slotTime) return;
          const elapsed = (Date.now() - new Date(slotTime).getTime()) / 1000;
          const duration = player.duration() || 0;
          if (duration > 0 && elapsed > 0) {
            const liveWall = Math.min(elapsed, duration);
            const currentPos = player.currentTime() || 0;
            if (liveWall - currentPos > 2) {
              player.currentTime(liveWall);
            }
          }
        };

        if (!player.paused()) {
          seekToLiveWall();
          return;
        }

        const attemptPlay = () => {
          if (player.isDisposed()) return;
          seekToLiveWall();
          player.muted(false);
          const playPromise = player.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
              setIsMuted(false);
              setAutoplayBlocked(false);
            }).catch(() => {
              player.muted(true);
              setIsMuted(true);
              const mutedPromise = player.play();
              if (mutedPromise && typeof mutedPromise.then === 'function') {
                mutedPromise.then(() => {
                  setAutoplayBlocked(false);
                }).catch(() => {
                  setAutoplayBlocked(true);
                });
              }
            });
          }
        };

        if (player.readyState() < 3) {
          player.one('canplay', attemptPlay);
        } else {
          attemptPlay();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [eventPhase, slotTime, playerRef, setEventPhase, setIsMuted, setAutoplayBlocked]);
}
```

**Step 2: Replace the inline useEffect in live/page.tsx**

In `live/page.tsx`, remove lines 145-223 (the `// Resume playback when tab returns...` useEffect) and replace with:

```typescript
import { useVisibilityResume } from '@/hooks/useVisibilityResume';

// ... inside component, after playerInstanceRef declaration:
useVisibilityResume({
  eventPhase,
  slotTime,
  playerRef: playerInstanceRef,
  setEventPhase,
  setIsMuted,
  setAutoplayBlocked,
});
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Verify dev server**

Run: `npm run dev` — navigate to a live room, switch tabs, return. Verify video resumes.

**Step 5: Commit**

```bash
git add src/hooks/useVisibilityResume.ts src/app/\(public\)/webinar/\[id\]/live/page.tsx
git commit -m "refactor: extract useVisibilityResume hook from live page"
```

---

## Task 2: Extract `usePlaybackTracking` hook from live page

The playback event handler (lines 256-296) and heartbeat interval (lines 238-253) are tracking concerns mixed into the page component.

**Files:**
- Create: `src/hooks/usePlaybackTracking.ts`
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

**Step 1: Create the hook file**

```typescript
// src/hooks/usePlaybackTracking.ts
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trackGA4 } from '@/lib/analytics';

interface UsePlaybackTrackingOptions {
  webinarId: string;
  userName: string;
  lateJoinSeconds: number;
  isPlaying: boolean;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
}

export function usePlaybackTracking({
  webinarId,
  userName,
  lateJoinSeconds,
  isPlaying,
  setCurrentTime,
  setIsPlaying,
}: UsePlaybackTrackingOptions) {
  const router = useRouter();
  const trackedMilestones = useRef<Set<number>>(new Set());
  const currentTimeRef = useRef(0);

  // Keep ref in sync for heartbeat reads
  const syncTimeRef = useCallback((time: number) => {
    currentTimeRef.current = time;
  }, []);

  // Video heartbeat — sends watch position every 60 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const watchDuration = Math.round(currentTimeRef.current - lateJoinSeconds);
      if (watchDuration > 0) {
        trackGA4('c_video_heartbeat', {
          webinar_id: webinarId,
          current_time_sec: Math.round(currentTimeRef.current),
          watch_duration_sec: watchDuration,
        });
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [isPlaying, webinarId, lateJoinSeconds]);

  const handlePlaybackEvent = useCallback(
    (event: { type: string; currentTime: number; duration: number }) => {
      if (event.type === 'timeupdate') {
        setCurrentTime(event.currentTime);
        syncTimeRef(event.currentTime);
        if (event.duration > 0) {
          const percent = Math.floor((event.currentTime / event.duration) * 100);
          const milestones = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
          for (const milestone of milestones) {
            if (percent >= milestone && !trackedMilestones.current.has(milestone)) {
              trackedMilestones.current.add(milestone);
              trackGA4('c_video_progress', { webinar_id: webinarId, percent: milestone });
            }
          }
        }
      }
      if (event.type === 'play') {
        setIsPlaying(true);
      }
      if (event.type === 'pause') {
        setIsPlaying(false);
      }
      if (event.type === 'ended') {
        setIsPlaying(false);
        trackGA4('c_video_heartbeat', {
          webinar_id: webinarId,
          current_time_sec: Math.round(event.currentTime),
          watch_duration_sec: Math.round(event.currentTime - lateJoinSeconds),
        });
        try {
          sessionStorage.setItem(`webinar-${webinarId}-watch-duration`, String(Math.round(event.currentTime - lateJoinSeconds)));
        } catch { /* ignore */ }
        setTimeout(() => {
          router.push(`/webinar/${webinarId}/end?name=${encodeURIComponent(userName)}`);
        }, 2000);
      }
    },
    [webinarId, router, userName, lateJoinSeconds, setCurrentTime, setIsPlaying, syncTimeRef]
  );

  return { handlePlaybackEvent };
}
```

**Step 2: Replace in live/page.tsx**

Remove:
- `trackedMilestones` ref (line 82)
- `currentTimeRef` ref and sync (lines 84, 235)
- Heartbeat `useEffect` (lines 238-253)
- `handlePlaybackEvent` callback (lines 256-296)

Replace with:

```typescript
import { usePlaybackTracking } from '@/hooks/usePlaybackTracking';

// Inside component:
const { handlePlaybackEvent } = usePlaybackTracking({
  webinarId,
  userName,
  lateJoinSeconds,
  isPlaying,
  setCurrentTime,
  setIsPlaying,
});
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/hooks/usePlaybackTracking.ts src/app/\(public\)/webinar/\[id\]/live/page.tsx
git commit -m "refactor: extract usePlaybackTracking hook from live page"
```

---

## Task 3: Deduplicate CTA tracking callbacks in live page

Lines 529-531 and 540-542 have identical `onCTAView` and `onCTADismiss` lambda callbacks. Extract to named callbacks.

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

**Step 1: Add named callbacks above the return statement**

```typescript
const handleCTAView = useCallback((cta: CTAEvent) => {
  trackGA4('c_cta_view', { webinar_id: webinarId, cta_id: cta.id, cta_type: cta.buttonText.slice(0, 100), video_time_sec: Math.round(currentTime) });
}, [webinarId, currentTime]);

const handleCTADismiss = useCallback((cta: CTAEvent) => {
  trackGA4('c_cta_dismiss', { webinar_id: webinarId, cta_id: cta.id, cta_type: cta.buttonText.slice(0, 100), video_time_sec: Math.round(currentTime) });
}, [webinarId, currentTime]);
```

**Step 2: Replace inline lambdas in both CTAOverlay usages**

```tsx
<CTAOverlay
  ...
  onCTAView={handleCTAView}
  onCTADismiss={handleCTADismiss}
  ...
/>
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/\(public\)/webinar/\[id\]/live/page.tsx
git commit -m "refactor: deduplicate CTA tracking callbacks"
```

---

## Task 4: Extract WebinarForm sections into sub-components

The 861-line form has 10 distinct sections, each self-contained. Extract the 3 largest sections that have the most complex rendering logic.

**Files:**
- Create: `src/app/(admin)/admin/_components/form/EvergreenSection.tsx`
- Create: `src/app/(admin)/admin/_components/form/CTASection.tsx`
- Create: `src/app/(admin)/admin/_components/form/PromoSection.tsx`
- Modify: `src/app/(admin)/admin/_components/WebinarForm.tsx`

### Step 1: Extract shared input class constant

Add to `WebinarForm.tsx` top-level:

```typescript
const INPUT_CLASS = 'w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none';
const INPUT_SM_CLASS = 'w-full bg-white text-neutral-900 px-3 py-2 rounded border border-neutral-300 text-sm';
```

Replace all 20+ occurrences of the full class string with these constants.

### Step 2: Create EvergreenSection component

Extract lines 336-465 (Evergreen Schedule section) into `form/EvergreenSection.tsx`:

```typescript
// src/app/(admin)/admin/_components/form/EvergreenSection.tsx
'use client';

interface EvergreenSectionProps {
  dailySchedule: string[];
  setDailySchedule: (schedule: string[]) => void;
  immediateSlotEnabled: boolean;
  setImmediateSlotEnabled: (enabled: boolean) => void;
  intervalMinutes: number;
  setIntervalMinutes: (minutes: number) => void;
  bufferMinutes: number;
  setBufferMinutes: (minutes: number) => void;
  maxWaitMinutes: number;
  setMaxWaitMinutes: (minutes: number) => void;
  displaySlotCount: number;
  setDisplaySlotCount: (count: number) => void;
  evergreenTimezone: string;
  setEvergreenTimezone: (tz: string) => void;
}

export default function EvergreenSection({ ...props }: EvergreenSectionProps) {
  // Move the entire <section> JSX for evergreen config here
  // (lines 337-465 from WebinarForm.tsx)
}
```

### Step 3: Create CTASection component

Extract lines 520-715 (CTA Events section — the most complex section at ~195 lines) into `form/CTASection.tsx`. This section contains CTAPreview, the ArrayFieldEditor with nested form groups for timing, content, style, and preview.

```typescript
// src/app/(admin)/admin/_components/form/CTASection.tsx
'use client';

import ArrayFieldEditor from '../ArrayFieldEditor';

// Move CTAPreview function and CTAField interface here
// Move the entire CTA <section> JSX here
```

### Step 4: Create PromoSection component

Extract lines 764-826 (Promotional Content + End Page sections — combined ~60 lines of simple fields) into `form/PromoSection.tsx`.

### Step 5: Replace extracted sections in WebinarForm with component calls

```tsx
<EvergreenSection
  dailySchedule={dailySchedule}
  setDailySchedule={setDailySchedule}
  // ... other props
/>
<CTASection
  ctaEvents={ctaEvents}
  setCtaEvents={setCtaEvents}
/>
<PromoSection
  formData={formData}
  setFormData={setFormData}
/>
```

### Step 6: Verify build

Run: `npx tsc --noEmit`

### Step 7: Commit

```bash
git add src/app/\(admin\)/admin/_components/form/ src/app/\(admin\)/admin/_components/WebinarForm.tsx
git commit -m "refactor: extract WebinarForm sections into sub-components"
```

---

## Summary

| Task | Target | Expected Reduction |
|------|--------|--------------------|
| T1: useVisibilityResume | live/page.tsx | -75 lines |
| T2: usePlaybackTracking | live/page.tsx | -60 lines |
| T3: CTA callback dedup | live/page.tsx | -8 lines (clarity improvement) |
| T4: Form section extraction | WebinarForm.tsx | -400 lines (moved to sub-components) |

**Net result:**
- `live/page.tsx`: 683 → ~540 lines
- `WebinarForm.tsx`: 861 → ~460 lines
- 3 new focused hook/component files

No behavior changes. Pure structural refactoring.
