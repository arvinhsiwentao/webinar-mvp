# Viewer Authenticity & Chat Synchronization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make viewer counts, chat activity, and user perception logically synchronized — hot start base viewers, organic jitter, no chat-with-zero-viewers.

**Architecture:** Modify the 3-phase viewer curve in `viewer-simulator.ts` to start from a base count (~35% of peak) instead of 0, add per-tick jitter for organic feel, and pre-load auto-chat sender names into the initial viewer pool. Suppress join message spam for the initial batch in `ChatRoom.tsx`.

**Tech Stack:** React hooks, TypeScript. No external dependencies added.

**Note:** No test framework is configured. Verify manually via `npm run dev` + browser inspection, and via `npx tsc --noEmit` for type safety.

---

### Task 1: Modify `getTargetCount` to Support Base Count Offset

**Files:**
- Modify: `src/lib/viewer-simulator.ts:55-86` (the `getTargetCount` function)

**Step 1: Update `getTargetCount` signature and Phase 1 formula**

Change the function to accept a `baseCount` parameter. Phase 1 ramps from `baseCount → peak` instead of `0 → peak`. Phase 3 adds a floor at 30% of peak.

```typescript
/**
 * Calculate target viewer count at a given video timestamp.
 *
 * Phase 1 (Ramp-up):   0 → rampSec        → baseCount → peakTarget (easeOutQuad)
 * Phase 2 (Plateau):    rampSec → 80% dur   → peakTarget (stable)
 * Phase 3 (Decline):    80% dur → 100% dur  → peakTarget → 60% of peak (linear, floored at 30%)
 */
export function getTargetCount(
  timeSec: number,
  peakTarget: number,
  rampSec: number,
  durationSec: number,
  baseCount: number = 0,
): number {
  const t = Math.max(0, Math.min(timeSec, durationSec));

  if (t <= rampSec) {
    // Phase 1 — Ramp-up with easeOutQuad from baseCount → peakTarget
    const progress = rampSec > 0 ? t / rampSec : 1;
    const eased = progress * (2 - progress); // easeOutQuad
    return Math.round(baseCount + (peakTarget - baseCount) * eased);
  } else if (t <= durationSec * 0.8) {
    // Phase 2 — Plateau at peak
    return peakTarget;
  } else {
    // Phase 3 — Linear decline to 60 % of peak (floored at 30%)
    const declineStart = durationSec * 0.8;
    const declineDuration = durationSec * 0.2;
    const progress =
      declineDuration > 0 ? (t - declineStart) / declineDuration : 1;
    const declined = Math.round(peakTarget * (1 - 0.4 * Math.min(progress, 1)));
    return Math.max(Math.round(peakTarget * 0.3), declined);
  }
}
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors (baseCount has default value, existing callers unaffected).

**Step 3: Commit**

```bash
git add src/lib/viewer-simulator.ts
git commit -m "feat(viewer-sim): add baseCount parameter to getTargetCount curve"
```

---

### Task 2: Add Hot Start Base Count & Pre-Load Viewers on Initialization

**Files:**
- Modify: `src/lib/viewer-simulator.ts:115-215` (the `useViewerSimulator` hook — initialization section)

**Step 1: Add `baseCountRef` and compute base count in initialization**

Add a ref to store the computed base count (computed once, used by tick loop). Modify both the fresh-start and late-join initialization branches to pre-load viewers.

Replace the initialization `useEffect` (lines 167–215) with:

```typescript
  // ── Initialization (on mount) ─────────────────────────────────────
  const baseCountRef = useRef(0);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const pool = buildPool();
    const initTime = initialTimeSec ?? 0;

    // Compute base count: ~35% of peak (30-40% with random variance)
    const base = Math.max(
      Math.round(peakTarget * (0.30 + Math.random() * 0.10)),
      1,
    );
    baseCountRef.current = base;

    const acNames = autoChatNamesSet.current;
    // Auto-chat names from the pool, in original order (earliest-firing first)
    const acInPool = pool.filter((n) => acNames.has(n));
    // Non-auto-chat names from the pool
    const nonAC = pool.filter((n) => !acNames.has(n));
    // Shuffle non-AC for random selection
    const shuffledNonAC = [...nonAC].sort(() => Math.random() - 0.5);

    if (initTime > 0) {
      // Late joiner — fast-forward to target count, floored at base
      const target = Math.max(
        base,
        getTargetCount(initTime, peakTarget, rampSec, videoDurationSec, base),
      );

      // Build initial viewers: auto-chat first (capped at target), then fill
      const initial: string[] = [];
      initial.push(...acInPool.slice(0, target));
      const remaining = target - initial.length;
      if (remaining > 0) {
        initial.push(...shuffledNonAC.slice(0, remaining));
      }

      const initialSet = new Set(initial);
      availableRef.current = pool.filter((n) => !initialSet.has(n));
      viewersRef.current = initial;
      setViewers(initial);
    } else {
      // Fresh start — pre-load base viewers immediately (hot start)
      const initial: string[] = [];
      // Cap auto-chat names at baseCount to keep curve correct
      initial.push(...acInPool.slice(0, base));
      const remaining = base - initial.length;
      if (remaining > 0) {
        initial.push(...shuffledNonAC.slice(0, remaining));
      }

      const initialSet = new Set(initial);
      availableRef.current = pool.filter((n) => !initialSet.has(n));
      viewersRef.current = initial;
      setViewers(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Manual verification**

Run: `npm run dev`, open http://localhost:3000, navigate to a live webinar.
Expected: Viewer count starts at ~35% of peak (e.g., ~21 for peak=60), not 0.

**Step 4: Commit**

```bash
git add src/lib/viewer-simulator.ts
git commit -m "feat(viewer-sim): hot start with base viewer count at ~35% of peak"
```

---

### Task 3: Add Jitter to the Tick Loop

**Files:**
- Modify: `src/lib/viewer-simulator.ts:217-385` (the tick loop `useEffect`)

**Step 1: Update the tick function to apply jitter and use baseCount**

In the tick function, after computing `target` from `getTargetCount`, apply jitter and floor enforcement. The key changes:

1. Pass `baseCountRef.current` as 5th argument to `getTargetCount`
2. Apply jitter: ±8% of peak, biased upward during ramp
3. Floor: never below `baseCountRef.current`

Replace the target computation and delta lines (around lines 249-252) inside `const tick = () => {`:

Find:
```typescript
      // ── Compute target and delta ───────────────────────────────
      const target = getTargetCount(now, peak, ramp, duration);
      const currentViewers = viewersRef.current;
      const delta = target - currentViewers.length;
```

Replace with:
```typescript
      // ── Compute target with base offset and jitter ───────────
      const base = baseCountRef.current;
      const rawTarget = getTargetCount(now, peak, ramp, duration, base);

      // Apply organic jitter (±8% of peak)
      const jitterRange = Math.max(1, Math.round(peak * 0.08));
      let jitterDelta = Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange;

      // During ramp, bias jitter upward to avoid stalling near base
      if (now <= ramp && jitterDelta < 0) {
        jitterDelta = Math.random() > 0.5 ? 0 : Math.abs(jitterDelta);
      }

      const target = Math.max(base, rawTarget + jitterDelta);
      const currentViewers = viewersRef.current;
      const delta = target - currentViewers.length;
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Manual verification**

Run: `npm run dev`, observe viewer count in browser.
Expected: Count fluctuates slightly each tick (e.g., 58 → 61 → 57 → 63 during plateau) instead of being perfectly stable.

**Step 4: Commit**

```bash
git add src/lib/viewer-simulator.ts
git commit -m "feat(viewer-sim): add organic jitter to viewer count curve"
```

---

### Task 4: Suppress Initial Join Messages in ChatRoom

**Files:**
- Modify: `src/components/chat/ChatRoom.tsx:222-247` (the join message `useEffect`)

**Step 1: Add initialization guard to skip join messages for the initial batch**

The viewer simulator now pre-loads base viewers on mount. Without this fix, the first render would detect all base viewers as "new" and generate dozens of join messages.

Find the join message effect (lines 222-247):
```typescript
  // Generate join messages when viewer simulator adds new names
  const prevViewersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (viewers.length === 0) return;

    const prevSet = prevViewersRef.current;
    const newNames = viewers.filter(name => !prevSet.has(name));

    if (newNames.length > 0) {
      // Limit to 3 join messages per tick to avoid chat spam
      const toShow = newNames.slice(0, 3);
      setMessages(prev => [
        ...prev,
        ...toShow.map(name => ({
          id: nextId(),
          name: '',
          message: `${name} 加入了直播`,
          timestamp: currentTimeRef.current,
          wallTime: Date.now(),
          isSystem: true,
        })),
      ]);
    }

    prevViewersRef.current = new Set(viewers);
  }, [viewers]);
```

Replace with:
```typescript
  // Generate join messages when viewer simulator adds new names.
  // Skip the initial batch (hot-start base viewers) to avoid spam.
  const prevViewersRef = useRef<Set<string>>(new Set());
  const viewersInitializedRef = useRef(false);
  useEffect(() => {
    if (viewers.length === 0) return;

    // First render with viewers: snapshot without generating messages
    if (!viewersInitializedRef.current) {
      viewersInitializedRef.current = true;
      prevViewersRef.current = new Set(viewers);
      return;
    }

    const prevSet = prevViewersRef.current;
    const newNames = viewers.filter(name => !prevSet.has(name));

    if (newNames.length > 0) {
      // Limit to 3 join messages per tick to avoid chat spam
      const toShow = newNames.slice(0, 3);
      setMessages(prev => [
        ...prev,
        ...toShow.map(name => ({
          id: nextId(),
          name: '',
          message: `${name} 加入了直播`,
          timestamp: currentTimeRef.current,
          wallTime: Date.now(),
          isSystem: true,
        })),
      ]);
    }

    prevViewersRef.current = new Set(viewers);
  }, [viewers]);
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Manual verification**

Run: `npm run dev`, open live room.
Expected: No flood of "X 加入了直播" messages on page load. After a few seconds, individual join messages appear as the viewer list grows during ramp.

**Step 4: Commit**

```bash
git add src/components/chat/ChatRoom.tsx
git commit -m "fix(chat): suppress join message spam for initial hot-start viewers"
```

---

### Task 5: Final Verification & Documentation

**Files:**
- Modify: `docs/architecture.md` (update viewer simulation section)
- Modify: `docs/decisions.md` (append decision entry)

**Step 1: End-to-end manual verification**

Run: `npm run dev`, open http://localhost:3000

Verify all success criteria:
1. ✅ Viewer count starts at ~35% of peak on page load (not 0)
2. ✅ Auto-chat sender names are visible in Viewers tab before their first message fires
3. ✅ Viewer count fluctuates naturally (not monotonically increasing)
4. ✅ No join message spam when page first loads
5. ✅ Late join users see proportionally correct viewer count (test with `?slot=<past-time>`)
6. ✅ Count never drops below base during ramp/plateau

**Step 2: Update `docs/architecture.md`**

Update the viewer simulation description to mention the hot start base and jitter.

**Step 3: Append to `docs/decisions.md`**

```markdown
### 2026-02-26 — Hot start + jitter for viewer count authenticity

**Decision:** Viewer count now starts at ~35% of peak (auto-derived) with all early auto-chat names pre-loaded. Added ±8% organic jitter per tick. Suppressed initial join message spam.

**Why:** Previous 0→peak ramp caused chat-with-zero-viewers, monotonic growth looked robotic, and users entered an "empty room." New model creates immediate social proof on entry.
```

**Step 4: Final commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: update architecture and decisions for viewer authenticity changes"
```

---

## Summary of Changes

| File | Lines Changed | What |
|------|--------------|------|
| `src/lib/viewer-simulator.ts` | ~40 lines | baseCount param in getTargetCount, hot start init, jitter in tick loop |
| `src/components/chat/ChatRoom.tsx` | ~5 lines | Initialization guard for join messages |
| `docs/architecture.md` | ~5 lines | Updated description |
| `docs/decisions.md` | ~4 lines | New decision entry |

**Total scope:** ~50 lines of logic changes across 2 source files + docs.
