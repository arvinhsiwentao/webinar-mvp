# Viewer Count Redesign: List-Driven Simulation

**Date:** 2026-02-25
**Status:** Design complete, pending implementation

## Problem

The viewer count displayed in the header ("105 正在观看") is completely disconnected from the 觀眾 tab. The count comes from a formula `(realViewerCount × multiplier) + baseCount ± 5%`, while the 觀眾 tab shows shuffled names from a 48-name pool. This mismatch makes the count feel fake.

## Solution

**The viewer count becomes a derived value from the viewer list, not an independent formula.**

`viewerCount = viewers.length` — what you see in the 觀眾 tab IS the count.

## Algorithm Design

### Phase Model (tied to video playback time)

```
Viewers
  ^
  |          ┌──────────────────┐
  |         /   Phase 2: Plateau \
  |        /    (churn swaps)     \
  |       /                        \
  |      /                          \
  |     / Phase 1:          Phase 3: \
  |    /  Ramp-up           Decline   \
  |   /   (easeOutQuad)     (linear)   \
  └──/──────────────────────────────────\──> Time
    0%   rampMin          80%         100%
```

| Phase | Boundary | Target | Behavior |
|-------|----------|--------|----------|
| Ramp-up | `0 → rampMinutes` | `0 → peakTarget` | easeOutQuad curve — fast initial joins, slows near peak |
| Plateau | `rampMinutes → 80% of duration` | `peakTarget` | Stable with occasional swap churn (1 leave + 1 join every ~25s) |
| Decline | `80% → 100% of duration` | `peakTarget → 60% of peak` | Linear drop — leaves outpace joins |

### Target Count Formula

```typescript
function getTargetCount(timeSec, peakTarget, rampSec, durationSec) {
  if (timeSec <= rampSec) {
    // easeOutQuad: fast start, slows near peak
    const t = timeSec / rampSec;
    return Math.round(peakTarget * t * (2 - t));
  } else if (timeSec <= durationSec * 0.8) {
    return peakTarget;
  } else {
    const progress = (timeSec - durationSec * 0.8) / (durationSec * 0.2);
    return Math.round(peakTarget * (1 - 0.4 * progress)); // → 60% of peak
  }
}
```

### Tick Logic (every 3-8 seconds, randomized)

```
1. Compute target = getTargetCount(currentTimeSec)
2. delta = target - activeViewers.length
3. If delta > 2:  add min(delta, ceil(peak * 0.05)) viewers  [fills quickly]
4. If delta < -2: remove min(|delta|, ceil(peak * 0.02)) viewers [drains slowly]
5. If |delta| <= 2 and random < 0.2: swap 1 (remove oldest non-chat, add new)  [churn]
```

### Name Pool

200+ names, mix of:
- Chinese first names (~55%): 小美, 阿明, 王强, 陈静, etc.
- Western names common in Chinese diaspora (~45%): David, Emma, Kevin, etc.

Names that "leave" go to a cooldown set (won't rejoin for 2+ minutes).

### Fast-Forward for Late Joiners (Pitfall #1 fix)

When `initialTimeSec > 0`:
1. Compute `target = getTargetCount(initialTimeSec)` — pure math, no simulation
2. Immediately populate `activeViewers` with `target` names from the pool
3. Auto-chat names due before `initialTimeSec` are force-included
4. Begin normal tick loop from that point

No need to replay all intermediate ticks — the formula gives us the snapshot.

### Auto-Chat Name Synchronization (Pitfall #3 fix)

Auto-chat messages contain names that also appear as "viewers". For consistency:
- Extract all unique names from `autoChat[]` with their `timeSec`
- When the simulator picks names to add during ramp-up, **prioritize auto-chat names whose first message is within the next 60 seconds**
- Auto-chat names are never removed during plateau (they're "engaged" — chatters don't leave)
- During decline phase, auto-chat names leave last

### List Stability (Pitfall #4 fix)

The viewer list is maintained as a stateful array:
- **Joins** append to the end of the list
- **Leaves** remove from a random position (not the end — natural churn)
- **No reshuffling** — the list order stays stable between ticks
- The ViewersTab renders the array as-is — no `sort(() => Math.random())` anymore

## Data Model Changes

### types.ts

```typescript
// Add to Webinar interface:
viewerPeakTarget?: number;    // default: 60
viewerRampMinutes?: number;   // default: 15

// Keep existing (backward compat):
viewerBaseCount: number;      // used as fallback for peakTarget
viewerMultiplier: number;     // ignored by new simulator
```

### Backward Compatibility (Pitfall #2 fix)

- `viewerPeakTarget` defaults to `viewerBaseCount` if not set — existing webinars get their base count as the peak target
- `viewerRampMinutes` defaults to 15 if not set
- `viewerBaseCount` and `viewerMultiplier` remain in the type but are deprecated
- The admin form shows the new fields; old fields are hidden
- No migration needed — the simulator checks `viewerPeakTarget ?? viewerBaseCount ?? 60`

## Admin Configuration

Replace the "观看人数设置" section:

| Field | Label | Default | Description |
|-------|-------|---------|-------------|
| `viewerPeakTarget` | 高峰观看人数 | 60 | Target number of viewers at peak |
| `viewerRampMinutes` | 升温时间 (分钟) | 15 | How long to reach peak from start |

## Component Changes

### New: `src/lib/viewer-simulator.ts`

Exports:
- `NAME_POOL: string[]` — 200+ names
- `getTargetCount(timeSec, peakTarget, rampSec, durationSec): number` — pure function
- `useViewerSimulator(options): { viewers: string[], viewerCount: number }` — React hook

### Modified: `src/app/(public)/webinar/[id]/live/page.tsx`

- Remove: `realViewerCount` state, `viewerCount` useMemo, viewer fluctuation useEffect
- Add: `useViewerSimulator()` call with webinar config
- Pass `viewers` array to `ViewersTab` (replaces `viewerCount` prop)
- Pass `viewers.length` to header display

### Modified: `src/components/sidebar/ViewersTab.tsx`

- Change prop: `viewerCount: number` → `viewers: string[]`
- Remove: `NAME_POOL`, shuffling `useMemo`
- Render `viewers` array directly
- `viewerCount` for the badge = `viewers.length`

### Modified: `src/app/(admin)/admin/_components/WebinarForm.tsx`

- Replace `viewerBaseCount` + `viewerMultiplier` fields with `viewerPeakTarget` + `viewerRampMinutes`
- Form state uses new field names

### Modified: `src/app/api/admin/webinar/route.ts`

- POST default: `viewerPeakTarget: body.viewerPeakTarget ?? 60`
- POST default: `viewerRampMinutes: body.viewerRampMinutes ?? 15`

### Modified: `src/lib/db.ts`

- Sample data includes `viewerPeakTarget: 60, viewerRampMinutes: 15`

### Modified: `data/webinars.json`

- Add `viewerPeakTarget` and `viewerRampMinutes` to existing webinar

## Files Changed (Summary)

| File | Action | Scope |
|------|--------|-------|
| `src/lib/viewer-simulator.ts` | **CREATE** | New hook + name pool + phase algorithm |
| `src/lib/types.ts` | EDIT | Add 2 optional fields to `Webinar` + `CreateWebinarRequest` |
| `src/app/(public)/webinar/[id]/live/page.tsx` | EDIT | Replace formula with hook, update props |
| `src/components/sidebar/ViewersTab.tsx` | EDIT | New prop interface, remove internal pool |
| `src/app/(admin)/admin/_components/WebinarForm.tsx` | EDIT | New form fields |
| `src/app/api/admin/webinar/route.ts` | EDIT | New defaults in POST |
| `src/lib/db.ts` | EDIT | Sample data |
| `data/webinars.json` | EDIT | Add new fields |

## What Does NOT Change

- Chat system (SSE, auto-chat, user messages) — completely independent
- Video player / seeking prevention
- CTA overlay system
- BottomBar component (unused in live page)
- Demo page (hardcoded, separate concern)
- Registration flow
- All other pages (landing, lobby, end)
