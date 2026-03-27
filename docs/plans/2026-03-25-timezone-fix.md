# Timezone Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make timezone handling correct end-to-end — Admin configures a timezone, slot generation honors it, and all user-facing displays (landing page, emails, lobby) show times in that configured timezone with a dynamic label.

**Architecture:** Adopt "方案 A" — all user-facing times display in the Admin-configured timezone (e.g. `America/Chicago`). No per-user browser timezone conversion. This is simpler, consistent, and appropriate for a North American Chinese audience within ~3 hours of each other. The key fix is in `generateEvergreenSlots()` which currently uses `setHours()` in the server's local TZ (UTC on Zeabur) instead of the configured IANA timezone.

**Tech Stack:** Native `Intl.DateTimeFormat` with `timeZone` option (no new dependencies). Works in Node.js 18+ and all modern browsers.

---

## Background: The Bug

`dailySchedule: ["20:00"]` with `timezone: "America/Chicago"` means "8 PM Chicago time". But `generateEvergreenSlots()` does:

```typescript
candidate.setHours(20, 0, 0, 0); // ← 20:00 in SERVER local TZ (UTC on Zeabur)
```

This produces 20:00 UTC instead of 20:00 CST (which is 02:00 UTC next day). The landing page then shows this wrong time with a hardcoded "Central Standard Time" label. Emails do the same with hardcoded "(Central Time)".

## Shared Utility: `scheduleToUTC` and `formatInTimezone`

Both tasks below need two small helpers. We create them first as a shared foundation.

---

### Task 1: Add timezone utility functions to `src/lib/timezone.ts`

**Files:**
- Create: `src/lib/timezone.ts`

**Step 1: Create the timezone utility module**

```typescript
// src/lib/timezone.ts

/**
 * Convert a HH:mm schedule time in a given IANA timezone to a UTC Date
 * for a specific base date.
 *
 * Example: scheduleToUTC("20:00", "America/Chicago", baseDate)
 * → Date representing 20:00 Chicago time on that date (= 02:00 UTC next day in CST)
 */
export function scheduleToUTC(
  time: string,
  timezone: string,
  baseDate: Date
): Date {
  const [hours, minutes] = time.split(':').map(Number);

  // Strategy: construct a date in UTC, then figure out the offset for the target timezone
  // by comparing Intl-formatted parts in that timezone vs UTC.

  // 1. Start with the baseDate's date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(baseDate);
  const year = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value);
  const day = Number(parts.find(p => p.type === 'day')!.value);

  // 2. Build a "naive" UTC date with the target timezone's calendar date + desired time
  const naive = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  // 3. Find the UTC offset for that moment in the target timezone
  const offsetMs = getTimezoneOffsetMs(naive, timezone);

  // 4. Subtract the offset to get the true UTC time
  //    (offset is "UTC - local", so if Chicago is UTC-6, offset = -360 min = -21600000 ms)
  //    We want: UTC = local - offset → UTC = naive - offset
  return new Date(naive.getTime() - offsetMs);
}

/**
 * Get the offset in milliseconds for a timezone at a given instant.
 * Returns (local - UTC) in ms. E.g. America/Chicago in CST → -21600000 (-6h).
 */
function getTimezoneOffsetMs(date: Date, timezone: string): number {
  // Format the date in the target timezone and in UTC, then compare
  const utcParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const toDate = (parts: Intl.DateTimeFormatPart[]) => {
    const get = (type: string) => {
      const val = parts.find(p => p.type === type)?.value || '0';
      // Intl may return "24" for midnight in some locales — treat as 0
      return type === 'hour' && val === '24' ? 0 : Number(val);
    };
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  };

  return toDate(tzParts) - toDate(utcParts);
}

/**
 * IANA timezone → short display label map.
 */
const TIMEZONE_LABELS: Record<string, string> = {
  'America/Chicago': '美中时间 (CT)',
  'America/New_York': '美东时间 (ET)',
  'America/Los_Angeles': '美西时间 (PT)',
  'Asia/Taipei': '台北时间 (TST)',
};

/**
 * Get a user-friendly timezone label for display.
 * Falls back to the raw IANA string if not in the map.
 */
export function getTimezoneLabel(timezone: string): string {
  return TIMEZONE_LABELS[timezone] || timezone;
}

/**
 * Format a date string (ISO) for display in a specific timezone.
 * Returns { date, time } formatted in zh-CN locale.
 */
export function formatInTimezone(
  isoString: string,
  timezone: string
): { date: string; time: string } {
  const d = new Date(isoString);
  const date = d.toLocaleDateString('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  const time = d.toLocaleTimeString('zh-CN', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return { date, time };
}
```

**Step 2: Verify with a quick manual sanity check**

Run: `node -e "
const { scheduleToUTC } = require('./src/lib/timezone.ts');
"` — this won't work directly (TypeScript), but we'll verify in Task 2's integration test.

**Step 3: Commit**

```bash
git add src/lib/timezone.ts
git commit -m "feat: add timezone utility module for IANA-aware slot calculation and display"
```

---

### Task 2: Fix `generateEvergreenSlots()` to use configured timezone

**Files:**
- Modify: `src/lib/evergreen.ts:7-31` (anchor slot generation)
- Modify: `src/lib/evergreen.ts:69-87` (immediate slot calculation)

**Step 1: Update `generateEvergreenSlots` signature and anchor slot logic**

In `src/lib/evergreen.ts`, the function currently ignores `config.timezone`. Change:

```typescript
// BEFORE (line 17-20):
const [hours, minutes] = schedule.time.split(':').map(Number);
const candidate = new Date(now);
candidate.setDate(candidate.getDate() + dayOffset);
candidate.setHours(hours, minutes, 0, 0);
```

To use `scheduleToUTC`:

```typescript
// AFTER:
import { scheduleToUTC } from './timezone';

// Inside the loop:
const baseDate = new Date(now);
baseDate.setDate(baseDate.getDate() + dayOffset);
const candidate = scheduleToUTC(schedule.time, config.timezone, baseDate);
```

The `dayOffset` logic needs care: we need to advance the **timezone-local date**, not UTC date. Since `scheduleToUTC` extracts the calendar date from `baseDate` in the target timezone, passing a `baseDate` that's `now + dayOffset days` will correctly produce the right timezone-local date.

**Full replacement for lines 7-63:**

```typescript
export function generateEvergreenSlots(
  config: EvergreenConfig,
  now: Date = new Date()
): EvergreenSlot[] {
  const { dailySchedule, immediateSlot, displaySlotCount, timezone } = config;

  // 1. Generate anchor slots for today + next 2 days (in configured timezone)
  const anchorSlots: EvergreenSlot[] = [];
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    for (const schedule of dailySchedule) {
      const baseDate = new Date(now.getTime() + dayOffset * 86400000);
      const candidate = scheduleToUTC(schedule.time, timezone, baseDate);

      // Only include future slots with at least bufferMinutes gap
      const minutesUntil = (candidate.getTime() - now.getTime()) / 60000;
      if (minutesUntil >= (immediateSlot?.bufferMinutes ?? 3)) {
        anchorSlots.push({
          slotTime: candidate.toISOString(),
          type: 'anchor',
        });
      }
    }
  }

  anchorSlots.sort((a, b) =>
    new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime()
  );

  // 2. Check if immediate slot is needed
  const allSlots: EvergreenSlot[] = [...anchorSlots];

  if (immediateSlot?.enabled) {
    const nextAnchor = anchorSlots[0];
    const nextAnchorMinutes = nextAnchor
      ? (new Date(nextAnchor.slotTime).getTime() - now.getTime()) / 60000
      : Infinity;

    if (nextAnchorMinutes > immediateSlot.maxWaitMinutes) {
      const immSlot = calculateImmediateSlot(now, immediateSlot.intervalMinutes, immediateSlot.bufferMinutes);
      if (immSlot) {
        allSlots.push({
          slotTime: immSlot.toISOString(),
          type: 'immediate',
        });
      }
    }
  }

  // 3. Sort and take first N
  allSlots.sort((a, b) =>
    new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime()
  );

  return allSlots.slice(0, displaySlotCount);
}
```

Note: `calculateImmediateSlot` does NOT need timezone changes — it snaps to the next round interval from `now`, which is timezone-agnostic (it's a relative offset from the current moment).

**Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/evergreen.ts
git commit -m "fix: use configured timezone for evergreen slot generation instead of server local TZ"
```

---

### Task 3: Update the `/api/webinar/[id]/next-slot` response to include timezone

**Files:**
- Modify: `src/app/api/webinar/[id]/next-slot/route.ts` (already returns `config.timezone`, no change needed)

This task is a **no-op verification**. The API already returns `config.timezone`. The fix in Task 2 means the returned `slots[].slotTime` values are now correct UTC representations of the configured timezone's schedule.

**Step 1: Verify the response shape hasn't changed**

Read: `src/app/api/webinar/[id]/next-slot/route.ts`
Confirm it still returns `config: { timezone }`.

No commit needed.

---

### Task 4: Fix Landing Page timezone display

**Files:**
- Modify: `src/app/(public)/page.tsx:258-293` (slot display section)

**Step 1: Import utilities and update slot display**

The landing page fetches slots from `/api/webinar/[id]/next-slot`. The slot times are now correct UTC ISO strings (after Task 2). We need to:
1. Pass the timezone from the API response through to the display
2. Use `formatInTimezone()` instead of bare `toLocaleTimeString()`
3. Replace hardcoded "Central Standard Time" with dynamic label

First, store the timezone from the API response. In `refreshEvergreenSlots`:

```typescript
// Add state for timezone
const [evergreenTimezone, setEvergreenTimezone] = useState('America/Chicago');

// In refreshEvergreenSlots callback, after const slotData = await slotRes.json():
if (slotData.config?.timezone) {
  setEvergreenTimezone(slotData.config.timezone);
}
```

Then update the slot display (lines 258-293):

```typescript
import { formatInTimezone, getTimezoneLabel } from '@/lib/timezone';

// Replace lines 260-272:
const { date: fullDate, time } = formatInTimezone(dateStr, evergreenTimezone);
const dateObj = new Date(dateStr);
// Use Intl to get month/day in the configured timezone
const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: evergreenTimezone, month: 'numeric' }).format(dateObj));
const day = Number(new Intl.DateTimeFormat('en-US', { timeZone: evergreenTimezone, day: 'numeric' }).format(dateObj));

// Replace line 288:
<p className="text-sm md:text-base text-neutral-500">
  {time} {getTimezoneLabel(evergreenTimezone)}
</p>
```

**Step 2: Verify the build compiles**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/(public)/page.tsx
git commit -m "fix: landing page shows dynamic timezone label from admin config"
```

---

### Task 5: Fix confirmation email timezone display

**Files:**
- Modify: `src/lib/email.ts:49-56,134` (confirmationEmail function)
- Modify: `src/app/api/register/route.ts:109-114` (pass timezone to email)

**Step 1: Add timezone parameter to `confirmationEmail`**

```typescript
// BEFORE (line 49):
export function confirmationEmail(to: string, name: string, title: string, startTime: string, liveUrl: string, speakerAvatarUrl?: string): EmailParams {
  const d = new Date(startTime);
  const dateFormatted = d.toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  const timeFormatted = d.toLocaleTimeString('zh-CN', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

// AFTER:
import { formatInTimezone, getTimezoneLabel } from './timezone';

export function confirmationEmail(to: string, name: string, title: string, startTime: string, liveUrl: string, speakerAvatarUrl?: string, timezone: string = 'America/Chicago'): EmailParams {
  const { date: dateFormatted, time: timeFormatted } = formatInTimezone(startTime, timezone);
  const tzLabel = getTimezoneLabel(timezone);
```

Then on line 134, replace:

```html
<!-- BEFORE: -->
<p style="...">${timeFormatted} (Central Time)</p>

<!-- AFTER: -->
<p style="...">${timeFormatted} (${tzLabel})</p>
```

**Step 2: Pass timezone from register route**

In `src/app/api/register/route.ts`, around line 113:

```typescript
// BEFORE:
const emailData = confirmationEmail(body.email, body.name, webinar.title, sessionStartTime, liveUrl, speakerAvatarUrl);

// AFTER:
const emailData = confirmationEmail(body.email, body.name, webinar.title, sessionStartTime, liveUrl, speakerAvatarUrl, webinar.evergreen?.timezone);
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/lib/email.ts src/app/api/register/route.ts
git commit -m "fix: confirmation email uses configured timezone instead of hardcoded Central Time"
```

---

### Task 6: Fix `fulfillment.ts` order date formatting

**Files:**
- Modify: `src/lib/fulfillment.ts:74-76`

**Step 1: Add timezone to order date formatting**

This is a minor fix — the purchase confirmation email's order date should use the configured timezone. However, since fulfillment doesn't have easy access to the webinar's timezone, and this is just a date (not a time), the impact is minimal (dates only shift at the UTC boundary). We'll use `America/Chicago` as the default for now since that's the primary market timezone.

```typescript
// BEFORE:
const orderDate = new Date().toLocaleDateString('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit',
}).replace(/-/g, '/');

// AFTER:
const orderDate = new Date().toLocaleDateString('zh-CN', {
  timeZone: 'America/Chicago',
  year: 'numeric', month: '2-digit', day: '2-digit',
}).replace(/-/g, '/');
```

**Step 2: Commit**

```bash
git add src/lib/fulfillment.ts
git commit -m "fix: order date in purchase email uses America/Chicago timezone"
```

---

### Task 7: Fix Lobby page slot detection to use timezone

**Files:**
- Modify: `src/app/(public)/webinar/[id]/lobby/page.tsx:48-66`

**Step 1: Replace `setHours` with `scheduleToUTC` in lobby's live-slot detection**

The lobby page has a fallback that detects currently-live slots by iterating `dailySchedule` and using `setHours()`. This has the same bug as `evergreen.ts`.

```typescript
// BEFORE (lines 53-66):
for (let dayOffset = 0; dayOffset >= -1; dayOffset--) {
  for (const schedule of evergreen.dailySchedule) {
    const [hours, minutes] = schedule.time.split(':').map(Number);
    const slotStart = new Date(now);
    slotStart.setDate(slotStart.getDate() + dayOffset);
    slotStart.setHours(hours, minutes, 0, 0);
    ...
  }
}

// AFTER:
import { scheduleToUTC } from '@/lib/timezone';

for (let dayOffset = 0; dayOffset >= -1; dayOffset--) {
  for (const schedule of evergreen.dailySchedule) {
    const baseDate = new Date(now.getTime() + dayOffset * 86400000);
    const slotStart = scheduleToUTC(schedule.time, evergreen.timezone, baseDate);

    if (now.getTime() >= slotStart.getTime() && now.getTime() < slotStart.getTime() + durationMs) {
      effectiveSlot = slotStart.toISOString();
      break;
    }
  }
  if (effectiveSlot) break;
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/app/(public)/webinar/[id]/lobby/page.tsx
git commit -m "fix: lobby live-slot detection uses configured timezone"
```

---

### Task 8: Update `formatDate` / `formatTime` in `utils.ts` to accept optional timezone

**Files:**
- Modify: `src/lib/utils.ts:3-25`

**Step 1: Add optional timezone parameter**

```typescript
// BEFORE:
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  };
  return date.toLocaleDateString('zh-CN', options);
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

// AFTER:
export function formatDate(dateString: string, timezone?: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    ...(timezone && { timeZone: timezone }),
  };
  return date.toLocaleDateString('zh-CN', options);
}

export function formatTime(dateString: string, timezone?: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit', minute: '2-digit', hour12: false,
    ...(timezone && { timeZone: timezone }),
  });
}
```

This is backward-compatible — existing callers without timezone continue to work.

**Step 2: Verify build**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: formatDate/formatTime accept optional timezone parameter"
```

---

### Task 9: Final integration verification

**Step 1: Full build check**

Run: `npm run build`
Expected: Successful build with no errors.

**Step 2: Manual smoke test checklist**

1. Start dev server: `npm run dev`
2. Open landing page → verify times show with dynamic timezone label (e.g. "晚上8:00 美中时间 (CT)")
3. Change admin timezone to EST → verify landing page updates label
4. Register → check confirmation email shows correct time + timezone label
5. Open lobby without slot param → verify live detection works

**Step 3: Commit any final adjustments, then done**

---

## Summary of changes

| # | File | Change |
|---|------|--------|
| T1 | `src/lib/timezone.ts` (new) | `scheduleToUTC()`, `formatInTimezone()`, `getTimezoneLabel()` |
| T2 | `src/lib/evergreen.ts` | Use `scheduleToUTC()` for anchor slots |
| T3 | `src/app/api/webinar/[id]/next-slot/route.ts` | No-op (already correct) |
| T4 | `src/app/(public)/page.tsx` | Dynamic timezone label + `formatInTimezone()` |
| T5 | `src/lib/email.ts` + `register/route.ts` | Pass timezone to email, dynamic label |
| T6 | `src/lib/fulfillment.ts` | Explicit `America/Chicago` for order date |
| T7 | `src/app/(public)/webinar/[id]/lobby/page.tsx` | Use `scheduleToUTC()` for live detection |
| T8 | `src/lib/utils.ts` | Optional timezone param on formatDate/formatTime |
| T9 | — | Build + smoke test |
