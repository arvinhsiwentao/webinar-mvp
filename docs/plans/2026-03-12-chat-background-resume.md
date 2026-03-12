# Chat Background Resume & Slot-Anchored Timestamps

**Date:** 2026-03-12
**Status:** Approved
**Files:** `src/components/chat/ChatRoom.tsx` only

## Problem

1. When user switches tab to background and returns, auto-chat messages that should have fired are missed or fire with incorrect `wallTime = Date.now()` timestamps.
2. Chat should show full history from minute 0 with correct timestamps regardless of when user joins.
3. Timestamps should be slot-anchored (slotStart + videoSeconds), not based on when code executes.

## Design

### Core Mechanism

- **Timestamp formula:** `wallTime = slotStartMs + (msg.timeSec * 1000)` for all auto-chat messages
- **Gap detection:** Track `prevTimeRef`. When `currentTime - prevTime > 2s`, bulk-insert all unfired messages in the gap range
- **Late-join backfill:** Same formula, already handled on mount for `0 → initialTime`
- **Real user messages:** Keep `Date.now()` — those are actual real-time messages

### Changes

1. Replace `wallTime: Date.now()` with `slotStartMs + (msg.timeSec * 1000)` for auto-chat messages
2. Add `prevTimeRef` for gap detection, bulk-insert missed messages on resume
3. Simplify late-join backfill to use same slot-anchored formula
4. Real user messages unchanged (`Date.now()`)

### Edge Cases

- SSE messages during background: arrive normally, correct timestamps
- Join notifications during catch-up: still fire per new sender name
- No overlap between mount backfill and gap detection (`prevTimeRef` starts at `initialTime`)
- `firedAutoIds` prevents duplicate messages across multiple gaps
- Randomized trigger times used for firing order, but display timestamp uses original `timeSec` (imperceptible in HH:MM)
