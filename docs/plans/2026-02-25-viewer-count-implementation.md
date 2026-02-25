# Viewer Count Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the disconnected viewer count formula with a list-driven simulation where the displayed count equals the number of names visible in the 觀眾 tab, with organic join/leave behavior over the webinar's duration.

**Architecture:** A new `useViewerSimulator` React hook manages a stateful viewer list that grows/shrinks following a 3-phase attendance curve (ramp-up → plateau → decline) driven by video playback time. The 觀眾 tab renders this list directly. Admin configures peak target and ramp time instead of base count and multiplier. Backward-compatible with existing data.

**Tech Stack:** React 19 hooks, TypeScript strict, Next.js 16 App Router

**Design doc:** `docs/plans/2026-02-25-viewer-count-redesign.md`

---

### Task 1: Add New Type Fields (Backward-Compatible)

**Files:**
- Modify: `src/lib/types.ts:53-106` (Webinar interface)
- Modify: `src/lib/types.ts:130-162` (CreateWebinarRequest interface)

**Step 1: Add fields to Webinar interface**

In `src/lib/types.ts`, add two optional fields to the `Webinar` interface after line 73 (`viewerMultiplier`):

```typescript
  viewerPeakTarget?: number;    // Peak viewer count target (replaces base+multiplier formula)
  viewerRampMinutes?: number;   // Minutes to reach peak from video start
```

Keep `viewerBaseCount` and `viewerMultiplier` — they remain for backward compatibility.

**Step 2: Add fields to CreateWebinarRequest interface**

In the same file, add after line 147 (`viewerMultiplier`):

```typescript
  viewerPeakTarget?: number;
  viewerRampMinutes?: number;
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors (fields are optional, nothing references them yet)

**Step 4: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add viewerPeakTarget and viewerRampMinutes to Webinar"
```

---

### Task 2: Create Viewer Simulator — Name Pool + Target Formula

**Files:**
- Create: `src/lib/viewer-simulator.ts`

**Step 1: Create the file with name pool and pure target function**

Create `src/lib/viewer-simulator.ts` with:

1. **NAME_POOL** — 200+ names (mix of Chinese first names and Western names common in Chinese diaspora). This pool is the single source of truth for all simulated viewer names.

2. **`getTargetCount` pure function** — Given video time, peak target, ramp duration, and total duration, returns how many viewers should be active:

```typescript
/**
 * Calculate target viewer count at a given video timestamp.
 *
 * Phase 1 (Ramp-up):   0 → rampSec        → 0 → peakTarget (easeOutQuad)
 * Phase 2 (Plateau):    rampSec → 80% dur   → peakTarget (stable)
 * Phase 3 (Decline):    80% dur → 100% dur  → peakTarget → 60% of peak (linear)
 */
export function getTargetCount(
  timeSec: number,
  peakTarget: number,
  rampSec: number,
  durationSec: number
): number {
  // Clamp to valid range
  const t = Math.max(0, Math.min(timeSec, durationSec));

  if (t <= rampSec) {
    // Phase 1: easeOutQuad — fast start, slows near peak
    const progress = rampSec > 0 ? t / rampSec : 1;
    const eased = progress * (2 - progress);
    return Math.round(peakTarget * eased);
  } else if (t <= durationSec * 0.8) {
    // Phase 2: Plateau
    return peakTarget;
  } else {
    // Phase 3: Linear decline to 60% of peak
    const declineStart = durationSec * 0.8;
    const declineDuration = durationSec * 0.2;
    const progress = declineDuration > 0 ? (t - declineStart) / declineDuration : 1;
    return Math.round(peakTarget * (1 - 0.4 * Math.min(progress, 1)));
  }
}
```

The NAME_POOL should contain approximately 200 names. Include names already used in auto-chat messages (David, 小美, Alex, 阿明, Emma, Kevin, 小芳, Jason, Linda, Tom, 小雨, Ryan, Nicole, 陈静, 王强, Amy, 刘洋, Peter, 黄丽, Bob, 赵敏, 周杰, Lucy, 吴涛, 孙燕, Jack, 李明, 张伟, Grace, 赵鑫, 周芳, Brian, 郭靖, 许可, 钱伟, Chris, 蒋勇) first in the array, then additional names. This ordering matters for auto-chat sync (Task 3).

Additional names to fill to 200+:
- Chinese: 小红, 阿杰, 小蓉, 志远, 文静, 海涛, 丽华, 建国, 秀英, 国强, 明珠, 伟东, 春花, 德华, 小玲, 阿宝, 文华, 丽萍, 志强, 美玲, 大伟, 小凤, 阿龙, 玉兰, 建华, 秋月, 晓东, 美华, 阿辉, 春梅, 文杰, 丽芳, 志华, 秀兰, 明辉, 小燕, 阿强, 玉华, 建军, 秋霞, 晓明, 美丽, 阿翔, 春兰, 文斌, 丽娟, 志刚, 秀芳, 明亮, 小敏, 阿伟, 玉珍, 建平, 秋菊, 晓辉, 美珍, 阿峰, 春燕
- Western: Sarah, Michael, Jennifer, Daniel, Michelle, Andrew, Jessica, Steven, Angela, Patrick, Stephanie, Jonathan, Christine, Timothy, Samantha, Gregory, Melissa, Kenneth, Rebecca, Jeffrey, Amanda, Raymond, Laura, Roger, Diane, Henry, Victoria, Arthur, Diana, Wayne, Tracy, Stanley, Cindy, Vincent, Teresa, Dennis, Sharon, George, Maria, Harry, Sophie, Leo, Tiffany, Ray, Catherine, Frank, Monica, Howard, Gloria

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/viewer-simulator.ts
git commit -m "feat(viewer-sim): add name pool and target count formula"
```

---

### Task 3: Create Viewer Simulator — React Hook

**Files:**
- Modify: `src/lib/viewer-simulator.ts`

**Step 1: Add the `useViewerSimulator` hook**

This is the core logic. Add to `src/lib/viewer-simulator.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseViewerSimulatorOptions {
  peakTarget: number;           // Admin-configured peak count
  rampMinutes: number;          // Minutes to reach peak
  videoDurationSec: number;     // Total video length in seconds
  currentTimeSec: number;       // Current playback position (from onTimeUpdate)
  isPlaying: boolean;           // Whether video is currently playing
  autoChatNames?: string[];     // Unique names from auto-chat messages (for sync)
  hostName?: string;            // Excluded from pool
  userName?: string;            // Excluded from pool (shown separately in UI)
  initialTimeSec?: number;      // For late joiners — fast-forward snapshot
}

interface UseViewerSimulatorResult {
  viewers: string[];            // Current active viewer names
  viewerCount: number;          // viewers.length
}
```

**Hook behavior:**

1. **Initialization (mount / initialTimeSec):**
   - Filter NAME_POOL to exclude `hostName` and `userName`
   - Compute `targetAtInit = getTargetCount(initialTimeSec, ...)`
   - Pick `targetAtInit` names from the pool:
     - First, include auto-chat names whose `timeSec <= initialTimeSec`
     - Then fill remaining slots from pool in order
   - Set these as the initial `viewers` state

2. **Tick loop (useEffect on `isPlaying`):**
   - When `isPlaying` is true, start a timeout loop (3-8 second random intervals)
   - Each tick:
     a. Read `currentTimeSec` from a ref (NOT from closure — avoids stale values)
     b. Compute `target = getTargetCount(currentTimeSec, ...)`
     c. Compare `target` vs `viewers.length`
     d. If need to add: pick names from available pool, append to viewers list
        - Prioritize auto-chat names whose first message is within next 60 seconds
     e. If need to remove: remove from middle of list (not end — more natural)
        - Never remove auto-chat names whose message hasn't fired yet
        - During plateau churn, prefer removing names that joined earliest
     f. If at target (±2): 20% chance of a swap (remove 1 + add 1) for liveliness
   - When `isPlaying` is false, clear the timeout (pause ticking)

3. **Important refs (avoid stale closures):**
   - `currentTimeRef` — updated on every render from `currentTimeSec` prop
   - `viewersRef` — mirrors `viewers` state to avoid stale reads in tick callback
   - `availablePoolRef` — names not currently in the viewer list
   - `cooldownRef` — Set of names that recently left (cleared after 2 min)

4. **Return:** `{ viewers, viewerCount: viewers.length }`

**Key implementation details:**

- Use `useRef` for `currentTimeSec` to avoid re-creating the tick effect on every time update:
  ```typescript
  const currentTimeRef = useRef(currentTimeSec);
  currentTimeRef.current = currentTimeSec;
  ```

- The tick effect depends ONLY on `isPlaying` — not on `currentTimeSec`:
  ```typescript
  useEffect(() => {
    if (!isPlaying) return;
    let timerId: ReturnType<typeof setTimeout>;
    const tick = () => {
      // Read currentTimeRef.current here
      // ... simulation logic ...
      timerId = setTimeout(tick, 3000 + Math.random() * 5000);
    };
    timerId = setTimeout(tick, 1000); // Start quickly after play
    return () => clearTimeout(timerId);
  }, [isPlaying]);
  ```

- For adding viewers, use a helper that picks from available pool:
  ```typescript
  function pickFromPool(count: number, available: string[], priorityNames: string[]): string[] {
    const picked: string[] = [];
    // First, pick from priority names (auto-chat names due soon)
    for (const name of priorityNames) {
      if (picked.length >= count) break;
      const idx = available.indexOf(name);
      if (idx !== -1) {
        picked.push(name);
        available.splice(idx, 1);
      }
    }
    // Then fill from pool
    while (picked.length < count && available.length > 0) {
      const idx = Math.floor(Math.random() * available.length);
      picked.push(available[idx]);
      available.splice(idx, 1);
    }
    return picked;
  }
  ```

- For removing viewers, avoid removing names that are auto-chat senders AND haven't spoken yet:
  ```typescript
  function pickToRemove(
    count: number,
    viewers: string[],
    protectedNames: Set<string>
  ): number[] {
    // Get indices of removable viewers (not protected, not first 2 positions)
    const removable = viewers
      .map((name, idx) => ({ name, idx }))
      .filter(({ name, idx }) => !protectedNames.has(name) && idx > 1);

    // Shuffle and pick
    const shuffled = removable.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map(r => r.idx).sort((a, b) => b - a); // reverse order for safe splice
  }
  ```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/viewer-simulator.ts
git commit -m "feat(viewer-sim): add useViewerSimulator hook with 3-phase attendance"
```

---

### Task 4: Update ViewersTab to Accept Viewers Array

**Files:**
- Modify: `src/components/sidebar/ViewersTab.tsx`

**Step 1: Change the component interface and implementation**

Replace the entire component. Key changes:
- Props: `viewerCount: number` → `viewers: string[]`
- Remove: `NAME_POOL` constant (moved to viewer-simulator.ts)
- Remove: `useMemo` shuffling logic
- Badge count: Use `viewers.length` instead of `viewerCount`
- Render `viewers` array directly (stable order, no shuffling)

New props interface:
```typescript
interface ViewersTabProps {
  viewers: string[];       // Active viewer names from simulator
  hostName: string;
  hostAvatar?: string;
  userName?: string;
}
```

The render loop stays almost identical — just iterate `viewers` instead of the shuffled array. The badge count becomes `{(viewers.length + 1 + (userName ? 1 : 0)).toLocaleString()} 人` (viewers + host + self).

Actually, simpler: `{(viewers.length + 1).toLocaleString()} 人` — the `viewers` array from the simulator already excludes the host and current user (they're shown separately in the UI). The +1 is for the host. If `userName` is present, it's +2 (host + self), but the current code shows host and self separately above the list, and the badge should reflect total including them.

Correction: To match the header count, the badge should show the same number as the header. The header shows `viewerCount` which is `viewers.length`. But the total visible people in the tab = viewers.length + host + maybe self. This can be confusing.

**Decision:** The badge count in ViewersTab shows `viewers.length` (same as the header count). The host and current user are "extras" that are always visible but not counted in the "viewers" metric. This matches real platforms like YouTube Live where the viewer count doesn't include the streamer.

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: Type errors in `live/page.tsx` (passing wrong props to ViewersTab). This is expected and will be fixed in Task 5.

**Step 3: Commit**

```bash
git add src/components/sidebar/ViewersTab.tsx
git commit -m "refactor(viewers-tab): accept viewers array instead of count"
```

---

### Task 5: Integrate Simulator into Live Page

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx`

This is the most critical task — wiring everything together.

**Step 1: Replace old viewer count logic with simulator hook**

Remove:
- Line 2: Remove `useMemo` from import (if no longer needed elsewhere — check first)
- Lines 62-72: `realViewerCount` state + `viewerCount` useMemo
- Lines 188-200: `realViewerCount` fluctuation useEffect

Add import:
```typescript
import { useViewerSimulator } from '@/lib/viewer-simulator';
```

Add after webinar is loaded, extract auto-chat names:
```typescript
// Extract unique auto-chat sender names for viewer sync
const autoChatNames = useMemo(() => {
  if (!webinar?.autoChat) return [];
  return [...new Set(webinar.autoChat.map(m => m.name))];
}, [webinar]);

// Simulated viewer list (replaces old formula)
const { viewers, viewerCount } = useViewerSimulator({
  peakTarget: webinar?.viewerPeakTarget ?? webinar?.viewerBaseCount ?? 60,
  rampMinutes: webinar?.viewerRampMinutes ?? 15,
  videoDurationSec: (webinar?.duration ?? 60) * 60,
  currentTimeSec: currentTime,
  isPlaying,
  autoChatNames,
  hostName: webinar?.speakerName,
  userName,
  initialTimeSec: lateJoinSeconds,
});
```

Note the fallback chain: `viewerPeakTarget ?? viewerBaseCount ?? 60` — this handles backward compatibility.

**Step 2: Update ViewersTab props**

Change the ViewersTab usage (around line 504):
```typescript
<ViewersTab
  viewers={viewers}
  hostName={webinar.speakerName}
  hostAvatar={webinar.speakerAvatar || webinar.speakerImage}
  userName={userName}
/>
```

The header display (line 344) stays the same — it already uses `viewerCount`.

**Step 3: Verify types compile and app runs**

Run: `npx tsc --noEmit`
Expected: No errors

Run: `npm run dev`
Navigate to a live room and verify:
- Viewer count starts low and grows
- 觀眾 tab shows individual names appearing over time
- Count in header matches number of names in tab
- Names are stable (don't shuffle on re-render)

**Step 4: Commit**

```bash
git add src/app/(public)/webinar/[id]/live/page.tsx
git commit -m "feat(live): integrate viewer simulator, count now matches viewer list"
```

---

### Task 6: Update Admin Form

**Files:**
- Modify: `src/app/(admin)/admin/_components/WebinarForm.tsx`

**Step 1: Update form state**

In the `useState` for `formData` (lines 28-55), replace:
```typescript
viewerBaseCount: webinar?.viewerBaseCount || 100,
viewerMultiplier: webinar?.viewerMultiplier || 3,
```
with:
```typescript
viewerPeakTarget: webinar?.viewerPeakTarget ?? webinar?.viewerBaseCount ?? 60,
viewerRampMinutes: webinar?.viewerRampMinutes ?? 15,
```

**Step 2: Update the form section**

Replace the "观看人数设置" section (lines 592-616) with new fields:

```tsx
{/* Viewer Config */}
<section className="bg-white rounded-lg p-6 border border-neutral-200">
  <h2 className="text-lg font-semibold mb-4">观看人数设置</h2>
  <div className="grid md:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm text-neutral-500 mb-2">高峰观看人数</label>
      <input
        type="number"
        value={formData.viewerPeakTarget}
        onChange={(e) => setFormData({ ...formData, viewerPeakTarget: parseInt(e.target.value) || 60 })}
        min={5}
        max={500}
        className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
      />
      <p className="text-neutral-400 text-xs mt-1">观众列表中显示的最大人数 (建议 30-100)</p>
    </div>
    <div>
      <label className="block text-sm text-neutral-500 mb-2">升温时间 (分钟)</label>
      <input
        type="number"
        value={formData.viewerRampMinutes}
        onChange={(e) => setFormData({ ...formData, viewerRampMinutes: parseInt(e.target.value) || 15 })}
        min={1}
        max={60}
        className="w-full bg-white text-neutral-900 px-4 py-2 rounded border border-neutral-300 focus:border-[#B8953F] focus:outline-none"
      />
      <p className="text-neutral-400 text-xs mt-1">从开播到高峰人数的过渡时间</p>
    </div>
  </div>
</section>
```

**Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/(admin)/admin/_components/WebinarForm.tsx
git commit -m "feat(admin): replace base/multiplier with peak target and ramp time"
```

---

### Task 7: Update API + Sample Data + JSON DB

**Files:**
- Modify: `src/app/api/admin/webinar/route.ts`
- Modify: `src/lib/db.ts`
- Modify: `data/webinars.json`

**Step 1: Update POST defaults in API route**

In `src/app/api/admin/webinar/route.ts`, in the `createWebinar` call (around line 34-43), add:
```typescript
viewerPeakTarget: body.viewerPeakTarget ?? 60,
viewerRampMinutes: body.viewerRampMinutes ?? 15,
```

Keep the existing `viewerBaseCount` and `viewerMultiplier` lines for backward compat.

**Step 2: Update sample data in db.ts**

In `src/lib/db.ts`, find the sample webinar initialization (around line 240) and add after `viewerMultiplier`:
```typescript
viewerPeakTarget: 60,
viewerRampMinutes: 15,
```

**Step 3: Update webinars.json**

In `data/webinars.json`, add to the existing webinar object (after `viewerMultiplier`):
```json
"viewerPeakTarget": 60,
"viewerRampMinutes": 15,
```

**Step 4: Verify everything compiles and runs**

Run: `npx tsc --noEmit`
Run: `npm run dev`
Test: Create a new webinar in admin panel, verify new fields save and load correctly.

**Step 5: Commit**

```bash
git add src/app/api/admin/webinar/route.ts src/lib/db.ts data/webinars.json
git commit -m "feat(data): add viewerPeakTarget and viewerRampMinutes to API, sample data"
```

---

### Task 8: Update Architecture Documentation

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/decisions.md`

**Step 1: Update architecture.md**

In the "Component Synchronization" section, update the viewer count description to reflect the new list-driven simulation. Mention:
- ViewerSimulator hook drives both the 觀眾 tab and the displayed count
- 3-phase attendance curve (ramp-up, plateau, decline)
- Admin configures peak target and ramp time
- Auto-chat names are synchronized with the viewer list

**Step 2: Append to decisions.md**

Add entry:
```markdown
## 2026-02-25: Viewer count redesign — list-driven simulation

**Decision:** Replaced the independent viewer count formula (`base + real × multiplier ± 5%`) with a list-driven simulation where `viewerCount = viewers.length`. The 觀眾 tab shows the actual simulated viewer list, and the header count reflects it exactly.

**Why:** The old formula produced counts (e.g., 105) completely disconnected from the ~40-name pool in the 觀眾 tab, breaking immersion. The new design ensures the count always matches visible evidence. Admin now configures `viewerPeakTarget` and `viewerRampMinutes` instead of `viewerBaseCount` and `viewerMultiplier`.

**Trade-off:** Peak count is now limited by NAME_POOL size (~200). For webinars needing 200+ simulated viewers, the pool would need expansion.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: update architecture and decisions for viewer count redesign"
```

---

### Task 9: End-to-End Smoke Test

**No code changes — manual verification.**

**Test 1: Fresh start (no late join)**
1. `npm run dev`
2. Navigate to a live room as a new user
3. Verify: Viewer count starts at 0-5, grows gradually
4. Switch to 觀眾 tab — count in header matches names in list
5. Wait 15+ minutes — count should plateau near `viewerPeakTarget` (60)
6. Names should appear one by one, no sudden jumps or reshuffling

**Test 2: Late join**
1. Modify the assigned slot time to be 20 minutes in the past
2. Enter the live room
3. Verify: Viewer count starts near peak (not from 0)
4. 觀眾 tab immediately shows ~60 names

**Test 3: Auto-chat name sync**
1. Watch the first 30 seconds of the webinar
2. When "David" sends an auto-chat message, verify "David" appears in 觀眾 tab
3. Chat names should appear in viewers BEFORE their first message

**Test 4: Admin panel**
1. Go to admin → edit webinar
2. Change "高峰观看人数" to 30
3. Change "升温时间" to 5
4. Save and reload live room
5. Verify: Peak is ~30, reached faster

**Test 5: Decline phase**
1. Skip to ~80% of video duration (modify initialTime or shorten video)
2. Verify: Viewer count starts declining
3. Names leave the 觀眾 tab
