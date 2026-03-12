# Livestream Player UX Optimization

**Date:** 2026-03-12
**Goal:** Make the video player indistinguishable from a real YouTube Live stream

## Problem

The current player exposes several "pre-recorded" visual cues:
- Progress bar with live-wall marker visible
- Total duration displayed (e.g., `0:12:34 / 1:45:00`)
- `ArrowLeft` key allows rewinding (impossible in real live)

## Changes (all in `VideoPlayer.tsx`, livestreamMode only)

### 1. Hide progress bar and total duration
- `progressControl: false`
- `durationDisplay: false`
- `timeDivider: false`
- `currentTimeDisplay: true` (keep elapsed time)

### 2. Inject red LIVE pill in control bar
- Custom DOM element via `player.controlBar.addChild()`
- Red pulsing dot + white "LIVE" text
- Positioned after `currentTimeDisplay`

### 3. Block all arrow keys
- `ArrowLeft`, `ArrowRight`, `Home`, `End` all blocked
- Prevents rewinding (which would re-trigger CTAs)

### 4. Remove dead code
- Delete SeekBar mouse intercept (~20 lines)
- Delete live-wall CSS (::before marker, ::after overlay, --live-wall-pct)
- Delete live-wall CSS variable update in timeupdate handler

## Files changed
- `src/components/video/VideoPlayer.tsx`

## Not in scope
- Pause/resume jump-to-live behavior (future optimization)
- CTA countdown logic (no change needed since timeline is now forward-only)
