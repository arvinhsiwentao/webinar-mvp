import { EvergreenConfig, EvergreenSlot } from './types';

/**
 * Generate upcoming display slots from evergreen config.
 * Combines daily anchor slots + optional immediate slot, sorted chronologically.
 */
export function generateEvergreenSlots(
  config: EvergreenConfig,
  now: Date = new Date()
): EvergreenSlot[] {
  const { dailySchedule, immediateSlot, displaySlotCount } = config;

  // 1. Generate anchor slots for today + next 2 days
  const anchorSlots: EvergreenSlot[] = [];
  for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
    for (const schedule of dailySchedule) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + dayOffset);
      candidate.setHours(hours, minutes, 0, 0);

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

/**
 * Calculate the next round interval boundary with buffer.
 * E.g., interval=15, buffer=3, now=10:28 → 10:30 (2 min < 3 buffer → 10:45)
 */
function calculateImmediateSlot(
  now: Date,
  intervalMinutes: number,
  bufferMinutes: number
): Date | null {
  const candidate = new Date(now);
  const currentMinutes = candidate.getMinutes();
  const nextSlotMinute = Math.ceil(currentMinutes / intervalMinutes) * intervalMinutes;

  candidate.setMinutes(nextSlotMinute, 0, 0);

  // If too close to now, advance to next interval
  const minutesUntil = (candidate.getTime() - now.getTime()) / 60000;
  if (minutesUntil < bufferMinutes) {
    candidate.setMinutes(candidate.getMinutes() + intervalMinutes);
  }

  return candidate;
}

/**
 * Get the slot expiry time (slot start + video duration).
 */
export function getSlotExpiresAt(slotTime: string, videoDurationMinutes: number): string {
  const expires = new Date(new Date(slotTime).getTime() + videoDurationMinutes * 60000);
  return expires.toISOString();
}

/**
 * Determine user's session state based on assigned slot and current time.
 */
export type EvergreenState = 'PRE_REG' | 'CONFIRMED' | 'LIVE' | 'MISSED';

export function getEvergreenState(
  assignedSlot: string,
  expiresAt: string,
  registered: boolean,
  now: Date = new Date()
): EvergreenState {
  const slotTime = new Date(assignedSlot).getTime();
  const expiry = new Date(expiresAt).getTime();
  const nowMs = now.getTime();

  if (nowMs >= expiry) return 'MISSED';
  if (nowMs >= slotTime) return 'LIVE';
  if (registered) return 'CONFIRMED';
  return 'PRE_REG';
}

/**
 * Calculate video start position for late join (in seconds).
 */
export function calculateLateJoinPosition(assignedSlot: string, now: Date = new Date()): number {
  const elapsed = (now.getTime() - new Date(assignedSlot).getTime()) / 1000;
  return Math.max(0, Math.floor(elapsed));
}
