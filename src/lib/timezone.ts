/**
 * Timezone utilities for evergreen scheduling.
 * Uses native Intl.DateTimeFormat — no external dependencies.
 */

/**
 * Convert a HH:mm schedule time in a given IANA timezone to a UTC Date
 * for a specific base date.
 *
 * Strategy:
 * 1. Use Intl.DateTimeFormat to get the calendar date of baseDate in the target timezone
 * 2. Build a "naive" UTC date with that calendar date + the desired HH:mm
 * 3. Calculate the timezone offset by comparing formatted vs UTC
 * 4. Subtract offset to get true UTC
 */
export function scheduleToUTC(time: string, timezone: string, baseDate: Date): Date {
  const [hours, minutes] = time.split(':').map(Number);

  // Step 1: Get the calendar date of baseDate in the target timezone
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

  // Step 2: Build a "naive" UTC date with that calendar date + desired time
  const naiveUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));

  // Step 3: Calculate the timezone offset.
  // Format naiveUTC in the target timezone to see what local time it maps to,
  // then compute the difference.
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const tzParts = tzFormatter.formatToParts(naiveUTC);
  const tzYear = Number(tzParts.find(p => p.type === 'year')!.value);
  const tzMonth = Number(tzParts.find(p => p.type === 'month')!.value);
  const tzDay = Number(tzParts.find(p => p.type === 'day')!.value);
  const tzHour = Number(tzParts.find(p => p.type === 'hour')!.value);
  const tzMinute = Number(tzParts.find(p => p.type === 'minute')!.value);
  const tzSecond = Number(tzParts.find(p => p.type === 'second')!.value);

  // What naiveUTC looks like in the target timezone
  const asSeenInTZ = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
  // Offset = (what TZ sees) - (actual UTC ms)
  const offsetMs = asSeenInTZ - naiveUTC.getTime();

  // Step 4: Subtract offset to get true UTC
  // If TZ is UTC-5, naiveUTC of 08:00 UTC shows as 03:00 in TZ.
  // We want 08:00 in TZ = 13:00 UTC, so: naiveUTC + offset = true UTC
  // offset = 03:00 UTC - 08:00 UTC = -5h, so naiveUTC - (-5h) = naiveUTC + 5h = 13:00 UTC ✓
  return new Date(naiveUTC.getTime() - offsetMs);
}

const TIMEZONE_LABELS: Record<string, string> = {
  'America/Chicago': '美中时间 (CT)',
  'America/New_York': '美东时间 (ET)',
  'America/Los_Angeles': '美西时间 (PT)',
  'Asia/Taipei': '台北时间 (TST)',
};

/**
 * Map IANA timezone to a user-friendly Chinese display label.
 */
export function getTimezoneLabel(timezone: string): string {
  return TIMEZONE_LABELS[timezone] ?? timezone;
}

/**
 * Format an ISO date string for display in a specific timezone using zh-CN locale.
 * Returns { date, time } where:
 * - date: year/month/day/weekday long format (e.g. "2026年3月25日星期三")
 * - time: hour:minute 12-hour format (e.g. "下午 8:00")
 */
export function formatInTimezone(
  isoString: string,
  timezone: string
): { date: string; time: string } {
  const d = new Date(isoString);

  const dateStr = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(d);

  const timeStr = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return { date: dateStr, time: timeStr };
}
