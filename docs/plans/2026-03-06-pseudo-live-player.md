# Pseudo-Live Video Player with Smart Progress Bar

**Date:** 2026-03-06
**Status:** Planning

## 1. Overview

Transform the VideoPlayer from a fully locked-down "no controls" livestream player into a DVR-style pseudo-live player. Users get play/pause, volume, fullscreen, and a progress bar that allows rewinding but prevents scrubbing ahead of the "live wall" -- the furthest point the broadcast would have reached in real time.

**UX goal:** The viewer perceives a live stream they can pause and rewind (like cable DVR), but cannot skip ahead past what has "aired." If they pause for 2 minutes, the live wall advances 2 minutes, and they can scrub forward to catch up, but never beyond.

**Scope:** Livestream mode only (`livestreamMode=true`). Replay mode gets standard unrestricted controls.

## 2. Files to Modify

| File | Change Type |
|------|-------------|
| `src/components/video/VideoPlayer.tsx` | Major: control logic, wall-clock tracking, seek clamping, CSS |
| `src/app/(public)/webinar/[id]/live/page.tsx` | Minor: pass `slotTime` prop to VideoPlayer |

## 3. Implementation Steps

### Step 1: Add `slotTime` prop to VideoPlayerProps
Add `slotTime?: string` (ISO datetime of broadcast start) for wall-clock computation.

### Step 2: Re-enable controls in livestream mode
- `controls`: always `true` (was `!livestreamMode`)
- `controlBar.progressControl`: `true` (was `false`)
- Keep `playbackRateMenuButton: false`

### Step 3: Remove CSS hiding progress control
Delete `.vjs-progress-control { display: none !important }`.

### Step 4: Remove click shield in livestream mode
Users need to interact with controls now.

### Step 5: Remove auto-resume on pause
Delete the pause handler that auto-plays in livestream mode.

### Step 6: Implement wall-clock tracking
```
wallClockStartMs = sessionStorage || new Date(slotTime).getTime() || Date.now()
liveWall = Math.min((Date.now() - wallClockStartMs) / 1000, duration)
```
Persist to sessionStorage keyed by video src.

### Step 7: Replace seek-blocking with DVR clamping
Remove `allowedTime` / tolerance logic. Add `seeking` event handler that clamps `currentTime` to `liveWall` with reentrancy guard.

### Step 8: Override SeekBar handleMouseMove
Clamp target time before seek to prevent visual snap-back.

### Step 9: Update keyboard handling
- Space: allow (play/pause)
- ArrowLeft: allow (rewind)
- ArrowRight: allow if target <= liveWall, else clamp
- Home/End: block

### Step 10: Add CSS for live-wall visual indicator
- `::after` pseudo-element: dark overlay beyond live wall
- `::before` pseudo-element: 2px gold marker at live wall
- Play progress: gold `#B8953F`
- Driven by `--live-wall-pct` CSS custom property

### Step 11: Pass slotTime from live page
```tsx
<VideoPlayer slotTime={isReplay ? undefined : (slotTime || undefined)} />
```

### Step 12: Fix replay mode
No seek blocking in replay mode -- standard Video.js controls.

## 4. Wall-Clock Tracking Design

| Aspect | Design |
|--------|--------|
| Source of truth | `wallClockStartMs` -- real-world timestamp when broadcast "started" |
| Late join init | `new Date(slotTime).getTime()` |
| No-slot fallback | `Date.now()` |
| Persistence | `sessionStorage` keyed by `webinar-wall-clock-${src}` |
| Formula | `liveWall = Math.min((Date.now() - wallClockStartMs) / 1000, duration)` |
| Why Date.now() | Immune to tab suspension; correctly reflects elapsed time |

## 5. Seek Clamping Logic

1. On `seeking` event: compute `liveWall`, if `currentTime > liveWall + 0.5`, clamp
2. On SeekBar `handleMouseMove`: compute target from mouse position, clamp before seeking
3. Reentrancy guard (`isAdjustingTime`) prevents infinite loops
4. Double protection: handleMouseMove for smooth UX, seeking event as safety net

## 6. Progress Bar Visual Design

- **Played region (0 to current):** Gold `#B8953F`
- **Available region (current to live wall):** Default Video.js buffer display
- **Locked future (live wall to 100%):** Dark overlay `rgba(0,0,0,0.5)`
- **Live wall marker:** 2px vertical gold line
- Updated via `--live-wall-pct` CSS custom property on every timeupdate

## 7. Keyboard Handling

| Key | Livestream | Replay |
|-----|-----------|--------|
| Space | Allow | Allow |
| ArrowLeft | Allow | Allow |
| ArrowRight | Allow if <= liveWall | Allow |
| Home | Block | Allow |
| End | Block | Allow |

## 8. Late Join Integration

1. `calculateLateJoinPosition(slotTime)` returns elapsed seconds
2. `wallClockStartMs = new Date(slotTime).getTime()`
3. `liveWall = (Date.now() - slotTime) / 1000` -- matches late join position
4. Player seeks to `initialTime` on `loadedmetadata`
5. Progress bar shows rewindable content behind, live wall at current position

## 9. Edge Cases

| Scenario | Handling |
|----------|----------|
| Page refresh | wallClockStartMs restored from sessionStorage |
| Tab suspension | Date.now() correctly reflects elapsed time |
| Duration unknown | Skip clamping until loadedmetadata |
| Replay mode | No wall-clock, no clamping, full controls |
| Video ends naturally | liveWall = duration, no clamping interference |
| Long pause | Live wall advances; user can catch up to it |
| YouTube tech | Same Video.js API; ytControls: 0 already set |

## 10. Testing Checklist

- [ ] Play/Pause works (button + spacebar)
- [ ] Volume control works
- [ ] Fullscreen works
- [ ] Rewind via progress bar works
- [ ] Forward block: clicking past live wall clamps to it
- [ ] No visual snap-back on blocked seek
- [ ] Live wall marker advances over time
- [ ] Pause + catch up: live wall advances during pause, can scrub to it after resume
- [ ] ArrowLeft rewinds, ArrowRight clamps at live wall
- [ ] Page refresh preserves live wall
- [ ] Tab switch: live wall advances while away
- [ ] Late join: correct rewindable content shown
- [ ] Replay mode: full unrestricted seeking
- [ ] Video end triggers redirect
- [ ] Chat/CTA sync with scrubbed position
- [ ] Design: gold accent, clean dark overlay
