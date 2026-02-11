# YouTube Video Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable YouTube URLs as webinar video sources alongside existing MP4/HLS support, using the `videojs-youtube` plugin.

**Architecture:** Detect YouTube URLs in VideoPlayer and configure Video.js with the `youtube` tech via `videojs-youtube` plugin. The plugin integrates YouTube's iframe API under Video.js's unified player interface, preserving `onTimeUpdate`, `play`, `pause`, `ended` events — keeping auto-chat, CTA overlays, and seeking prevention functional. Admin form updated to communicate supported formats.

**Tech Stack:** `videojs-youtube` npm package (latest), Video.js 8.x (existing), YouTube IFrame API (loaded by plugin automatically)

---

## Task 1: Install videojs-youtube package

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run:
```bash
npm install videojs-youtube
```

**Step 2: Verify installation**

Run:
```bash
npm ls videojs-youtube
```
Expected: Shows `videojs-youtube@x.x.x` installed under the project.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add videojs-youtube dependency for YouTube video support"
```

---

## Task 2: Add YouTube URL detection utility

**Files:**
- Modify: `src/lib/utils.ts`

**Step 1: Add the YouTube URL helper functions**

Add to the bottom of `src/lib/utils.ts`:

```typescript
/**
 * Detects if a URL is a YouTube video link.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      return parsed.pathname === '/watch' && parsed.searchParams.has('v')
        || parsed.pathname.startsWith('/embed/');
    }
    if (host === 'youtu.be') {
      return parsed.pathname.length > 1;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Determines the Video.js source type for a given URL.
 */
export function getVideoSourceType(url: string): string {
  if (isYouTubeUrl(url)) return 'video/youtube';
  if (url.endsWith('.m3u8')) return 'application/x-mpegURL';
  return 'video/mp4';
}
```

**Step 2: Verify no type errors**

Run:
```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "feat: add YouTube URL detection and video source type utilities"
```

---

## Task 3: Update VideoPlayer to support YouTube sources

**Files:**
- Modify: `src/components/video/VideoPlayer.tsx`

This is the core change. The VideoPlayer must:
1. Import `videojs-youtube` (side-effect import registers the tech)
2. Use the new `getVideoSourceType` helper for source type detection
3. Add `'youtube'` to `techOrder` when source is YouTube
4. Pass YouTube-specific options (disable native YT controls, disable related videos)

**Step 1: Update the VideoPlayer component**

Replace the existing content of `src/components/video/VideoPlayer.tsx` with:

```typescript
'use client';

import { useEffect, useRef, useCallback } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';
import { isYouTubeUrl, getVideoSourceType } from '@/lib/utils';

export interface PlaybackEvent {
  type: 'play' | 'pause' | 'timeupdate' | 'ended' | 'ready';
  currentTime: number;
  duration: number;
}

export interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  onPlaybackEvent?: (event: PlaybackEvent) => void;
}

export default function VideoPlayer({ src, autoPlay = false, onPlaybackEvent }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const lastReportedTime = useRef(0);

  const emitEvent = useCallback(
    (type: PlaybackEvent['type'], player: Player) => {
      onPlaybackEvent?.({
        type,
        currentTime: player.currentTime() ?? 0,
        duration: player.duration() ?? 0,
      });
    },
    [onPlaybackEvent],
  );

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered', 'vjs-fluid');
    videoRef.current.appendChild(videoElement);

    const isYT = isYouTubeUrl(src);
    const sourceType = getVideoSourceType(src);

    const playerOptions: Record<string, unknown> = {
      controls: true,
      autoplay: autoPlay,
      preload: 'auto',
      fluid: true,
      playbackRates: [],
      controlBar: {
        progressControl: false,
        remainingTimeDisplay: false,
        playbackRateMenuButton: false,
      },
      sources: [{ src, type: sourceType }],
    };

    if (isYT) {
      playerOptions.techOrder = ['youtube'];
      playerOptions.youtube = {
        ytControls: 0,
        rel: 0,              // no related videos at end
        modestbranding: 1,
        iv_load_policy: 3,   // hide annotations
        disablekb: 1,        // disable YouTube keyboard controls (anti-seek)
      };
    }

    const player = videojs(videoElement, playerOptions);
    playerRef.current = player;

    // Disable keyboard seeking (left/right arrows, etc.)
    player.on('keydown', (e: KeyboardEvent) => {
      const blocked = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (blocked.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Prevent seeking by monitoring time changes
    let allowedTime = 0;
    player.on('timeupdate', () => {
      const current = player.currentTime() ?? 0;
      if (current > allowedTime + 2) {
        player.currentTime(allowedTime);
      } else if (current > allowedTime) {
        allowedTime = current;
      }
      if (current < allowedTime - 1) {
        player.currentTime(allowedTime);
      }
    });

    // Emit playback events
    player.on('ready', () => emitEvent('ready', player));
    player.on('play', () => emitEvent('play', player));
    player.on('pause', () => emitEvent('pause', player));
    player.on('ended', () => emitEvent('ended', player));

    // Throttled timeupdate events (every 1 second)
    player.on('timeupdate', () => {
      const current = Math.floor(player.currentTime() ?? 0);
      if (current !== lastReportedTime.current) {
        lastReportedTime.current = current;
        emitEvent('timeupdate', player);
      }
    });

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, autoPlay, emitEvent]);

  return (
    <div className="video-player-wrapper">
      <div ref={videoRef} data-vjs-player />
      <style jsx>{`
        .video-player-wrapper {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }
        .video-player-wrapper :global(.video-js) {
          width: 100%;
          height: 100%;
        }
        .video-player-wrapper :global(.vjs-progress-control) {
          display: none !important;
        }
        .video-player-wrapper :global(.vjs-current-time),
        .video-player-wrapper :global(.vjs-duration) {
          display: block !important;
          padding: 0 4px;
        }
        .video-player-wrapper :global(.vjs-time-divider) {
          display: block !important;
        }
      `}</style>
    </div>
  );
}
```

**Key changes from original:**
- Added `import 'videojs-youtube'` (side-effect registration)
- Added `import { isYouTubeUrl, getVideoSourceType } from '@/lib/utils'`
- Replaced inline `isHLS` detection with `getVideoSourceType()`
- Added `techOrder: ['youtube']` and `youtube: {...}` options when source is YouTube
- YouTube options disable native controls, related videos, annotations, and keyboard seeking

**Step 2: Verify no type errors**

Run:
```bash
npx tsc --noEmit
```

If there's a type error for the `videojs-youtube` import (no type declarations), create a type shim:

Create `src/types/videojs-youtube.d.ts`:
```typescript
declare module 'videojs-youtube';
```

**Step 3: Verify dev server loads**

Run:
```bash
npm run dev
```
Navigate to a page with the video player and confirm no console errors about missing modules.

**Step 4: Commit**

```bash
git add src/components/video/VideoPlayer.tsx
git add src/types/videojs-youtube.d.ts  # only if created
git commit -m "feat: integrate videojs-youtube plugin for YouTube video playback"
```

---

## Task 4: Update admin form placeholder and help text

**Files:**
- Modify: `src/app/admin/page.tsx` (around line 482-490)

**Step 1: Update the video URL input placeholder**

Find the video URL input field (around line 482) and update the placeholder:

Change:
```
placeholder="https://example.com/video.mp4 或 .m3u8"
```
To:
```
placeholder="https://example.com/video.mp4、.m3u8 或 YouTube 連結"
```

**Step 2: Add a help text below the input**

After the `<input>` element and before the closing `</div>`, add:

```tsx
<p className="text-xs text-gray-500 mt-1">
  支援格式：MP4 直連、M3U8 (HLS) 串流、YouTube 影片連結
</p>
```

**Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: update admin form to indicate YouTube URL support"
```

---

## Task 5: Test end-to-end with YouTube URL

**Step 1: Start dev server**

Run:
```bash
npm run dev
```

**Step 2: Set a YouTube URL via admin**

1. Go to `http://localhost:3000/admin`
2. Edit the existing webinar
3. Set `videoUrl` to `https://www.youtube.com/watch?v=8uegnXH216Q` (the URL already in data)
4. Save

**Step 3: Test the live room**

1. Navigate to the webinar's live room page
2. Verify:
   - YouTube video loads and plays inside the Video.js player
   - Play/pause controls work
   - `timeupdate` events fire (check that auto-chat messages trigger at correct times)
   - CTA overlays appear at configured times
   - Progress bar is hidden (no seeking)
   - Video ended event fires and redirects to end page

**Step 4: Test fallback — verify MP4/HLS still works**

1. Change the videoUrl back to an HLS URL (e.g., `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`)
2. Confirm HLS playback still works normally

**Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify YouTube and HLS playback end-to-end"
```

---

## Task 6: Update documentation

**Files:**
- Modify: `docs/architecture.md` — Update VideoPlayer section to mention YouTube support
- Modify: `docs/decisions.md` — Record the decision to use videojs-youtube

**Step 1: Update architecture.md**

In the VideoPlayer / video section, add a note:

```markdown
- **YouTube support** via `videojs-youtube` plugin — detects YouTube URLs and uses YouTube iframe tech under Video.js's unified API. Supports `youtube.com/watch?v=`, `youtu.be/`, and `youtube.com/embed/` formats.
```

**Step 2: Append to decisions.md**

```markdown
## 2026-02-11: YouTube video support via videojs-youtube plugin

**Decision:** Use `videojs-youtube` Video.js tech plugin instead of raw iframe embed.

**Why:** Preserves the unified Video.js player API so that seeking prevention, `onTimeUpdate` callbacks (for auto-chat and CTA sync), and playback event tracking all continue to work without separate YouTube-specific code paths. The alternative (raw iframe) would have required reimplementing all time-synced features.
```

**Step 3: Commit**

```bash
git add docs/architecture.md docs/decisions.md
git commit -m "docs: document YouTube support via videojs-youtube plugin"
```
