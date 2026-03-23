# Mobile Fullscreen Fix — Prevent Native Controls Exposing Pre-recorded Video

**Date:** 2026-03-23
**Problem:** On mobile, tapping fullscreen triggers native video controls that show total duration, seekable progress bar, and pause — instantly revealing the video is pre-recorded, not live.

## Solution: CSS Fullscreen with Fullscreen API on Container Div

Instead of allowing the browser to fullscreen the `<video>` element (which triggers native controls on iOS), we:

1. Disable Video.js's built-in fullscreen button in livestream mode
2. Inject a custom fullscreen button that calls `requestFullscreen()` on the wrapper `<div>` (not `<video>`)
3. Fallback to CSS fixed-positioning fullscreen if the Fullscreen API fails (older iOS)

### Why This Works
- Fullscreen on `<div>` keeps Video.js custom controls active (hidden progress, LIVE pill, etc.)
- Fullscreen on `<video>` triggers native controls — that's what we avoid
- Same approach used by YouTube Live mobile web

### Implementation (VideoPlayer.tsx only)

1. Add `ref` to wrapper div for fullscreen target
2. Add `fullscreenToggle: false` to livestream controlBar config
3. Inject custom fullscreen button into control bar (same pattern as LIVE pill)
4. Toggle logic: `requestFullscreen(wrapper)` → catch → CSS fallback
5. `screen.orientation.lock('landscape')` on Android (graceful catch on iOS)
6. CSS class `.vjs-css-fullscreen` for fixed-position fallback with safe-area padding
7. Listen for `fullscreenchange` + `popstate` to sync state
8. Add `playsinline` attribute to prevent iOS auto-native-fullscreen

### Scope
- Only file modified: `src/components/video/VideoPlayer.tsx`
- ~80 lines added
- Replay mode unchanged (native fullscreen fine for replays)
