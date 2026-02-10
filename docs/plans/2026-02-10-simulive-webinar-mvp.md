# Simulive Webinar MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a simulive (simulated live) webinar system where pre-recorded video plays as if live, with timestamp-synced auto-chat, CTA overlays with countdown timers, viewer count display, and a LIVE badge — all in a Next.js app.

**Architecture:** Client-side only MVP. The live room page (`/live/[id]`) loads a static JSON config (webinar data, auto-chat messages, CTA events) and renders a VideoPlayer + ChatRoom + CTA overlay. The VideoPlayer streams HLS via hls.js, blocks fast-forward via `timeupdate` enforcement, and exposes `currentTime` via React context. ChatRoom and CTA subscribe to that timestamp to trigger messages/overlays. No backend database — config is served from a static JSON file via an API route.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, hls.js (HLS streaming), no additional state management (React context + useState suffices)

**MVP Scope (from spec P0 items):**
- A1-A2: Video playback (HLS) + play/pause/volume/fullscreen (no fast-forward)
- A5: Timestamp sync (video time drives all events)
- C1-C3, C8: Chat message list + send + nicknames + auto-chat by timestamp
- D4-D5: CTA button (time-triggered) + countdown timer
- E1, E3: Viewer count (simulated) + LIVE badge

**Out of scope for this plan:** Registration/landing page, waiting room, backend database, WebSocket real-time chat, admin panel, email reminders.

---

## Task 0: Project Setup & Dependencies

**Files:**
- Modify: `package.json`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/types/webinar.ts`
- Create: `src/data/demo-webinar.json`
- Create: `src/app/api/webinars/[id]/config/route.ts`

**Step 1: Install hls.js**

Run:
```bash
npm install hls.js
```

hls.js is a lightweight HLS client that works with standard `<video>` elements. No Video.js needed for MVP — we use the native HTML5 video element + hls.js for HLS support.

**Step 2: Create TypeScript types**

Create `src/types/webinar.ts`:

```typescript
export interface AutoChatMessage {
  timeSec: number;
  name: string;
  message: string;
}

export interface CTAEvent {
  showAtSec: number;
  hideAtSec: number;
  buttonText: string;
  url: string;
  promoText?: string;
  showCountdown: boolean;
  countdownDurationSec: number;
}

export interface ViewerConfig {
  baseCount: number;
  multiplier: number;
}

export interface WebinarConfig {
  id: string;
  title: string;
  speakerName: string;
  videoUrl: string;
  autoChat: AutoChatMessage[];
  cta: CTAEvent[];
  viewerConfig: ViewerConfig;
}
```

**Step 3: Create demo webinar config**

Create `src/data/demo-webinar.json`:

```json
{
  "id": "demo-001",
  "title": "AIC Webinar Demo",
  "speakerName": "Speaker",
  "videoUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "autoChat": [
    { "timeSec": 3, "name": "Alex", "message": "Hello everyone!" },
    { "timeSec": 8, "name": "Sarah", "message": "Excited for this!" },
    { "timeSec": 15, "name": "Mike", "message": "Great content so far" },
    { "timeSec": 25, "name": "Lisa", "message": "Taking notes" },
    { "timeSec": 40, "name": "David", "message": "This is really helpful" },
    { "timeSec": 55, "name": "Emma", "message": "+1" },
    { "timeSec": 70, "name": "Tom", "message": "Can you repeat that?" },
    { "timeSec": 90, "name": "Amy", "message": "Amazing insight!" },
    { "timeSec": 110, "name": "Chris", "message": "Thanks for sharing!" },
    { "timeSec": 130, "name": "Nina", "message": "Very useful, bookmarked!" }
  ],
  "cta": [
    {
      "showAtSec": 60,
      "hideAtSec": 180,
      "buttonText": "Buy Now",
      "url": "https://example.com/checkout",
      "promoText": "Was $9,900 - Live Special $4,900",
      "showCountdown": true,
      "countdownDurationSec": 120
    }
  ],
  "viewerConfig": {
    "baseCount": 50,
    "multiplier": 2
  }
}
```

Note: The `videoUrl` uses Mux's public test HLS stream. Replace with your own HLS URL for production.

**Step 4: Create API route to serve config**

Create `src/app/api/webinars/[id]/config/route.ts`:

```typescript
import { NextResponse } from "next/server";
import demoWebinar from "@/data/demo-webinar.json";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // MVP: only serve the demo config
  if (id === "demo-001") {
    return NextResponse.json(demoWebinar);
  }

  return NextResponse.json(
    { error: { code: "WEBINAR_NOT_FOUND", message: "Webinar not found" } },
    { status: 404 }
  );
}
```

**Step 5: Update layout metadata**

Modify `src/app/layout.tsx` — change metadata:

```typescript
export const metadata: Metadata = {
  title: "Live Webinar",
  description: "Simulive Webinar Platform",
};
```

**Step 6: Clean up globals.css**

Replace `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --background: #0a0a0a;
  --foreground: #ededed;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: project setup - types, demo config, API route, hls.js"
```

---

## Task 1: VideoTimeContext — Shared Video Timestamp

**Files:**
- Create: `src/contexts/VideoTimeContext.tsx`

This is the backbone of the whole system. Every component (chat, CTA, viewer count) reacts to the video's current time. We use React context to broadcast it.

**Step 1: Create the context**

Create `src/contexts/VideoTimeContext.tsx`:

```typescript
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";

interface VideoTimeContextValue {
  currentTime: number;
  isPlaying: boolean;
  duration: number;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setDuration: (duration: number) => void;
  maxReachedTime: React.RefObject<number>;
}

const VideoTimeContext = createContext<VideoTimeContextValue | null>(null);

export function VideoTimeProvider({ children }: { children: ReactNode }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const maxReachedTime = useRef(0);

  const handleSetCurrentTime = useCallback((time: number) => {
    setCurrentTime(time);
    if (time > maxReachedTime.current) {
      maxReachedTime.current = time;
    }
  }, []);

  return (
    <VideoTimeContext.Provider
      value={{
        currentTime,
        isPlaying,
        duration,
        setCurrentTime: handleSetCurrentTime,
        setIsPlaying,
        setDuration,
        maxReachedTime,
      }}
    >
      {children}
    </VideoTimeContext.Provider>
  );
}

export function useVideoTime() {
  const context = useContext(VideoTimeContext);
  if (!context) {
    throw new Error("useVideoTime must be used within a VideoTimeProvider");
  }
  return context;
}
```

**Step 2: Commit**

```bash
git add src/contexts/VideoTimeContext.tsx
git commit -m "feat: add VideoTimeContext for shared video timestamp"
```

---

## Task 2: VideoPlayer Component — HLS Playback, No Fast-Forward

**Files:**
- Create: `src/components/VideoPlayer.tsx`

The player uses hls.js to attach an HLS stream to a native `<video>` element. On every `timeupdate`, it checks if the user tried to seek ahead of `maxReachedTime` and snaps them back. Progress bar is hidden (simulive mode). Controls: play/pause, volume, fullscreen only.

**Step 1: Create the VideoPlayer component**

Create `src/components/VideoPlayer.tsx`:

```typescript
"use client";

import { useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { useVideoTime } from "@/contexts/VideoTimeContext";

interface VideoPlayerProps {
  videoUrl: string;
}

export default function VideoPlayer({ videoUrl }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { setCurrentTime, setIsPlaying, setDuration, maxReachedTime } =
    useVideoTime();

  // Attach HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = videoUrl;
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [videoUrl]);

  // Sync time + enforce no-fast-forward
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;

    // Block fast-forward: if user seeked beyond max reached, snap back
    if (current > maxReachedTime.current + 1.5) {
      video.currentTime = maxReachedTime.current;
      return;
    }

    setCurrentTime(current);
  }, [setCurrentTime, maxReachedTime]);

  const handlePlay = useCallback(() => setIsPlaying(true), [setIsPlaying]);
  const handlePause = useCallback(() => setIsPlaying(false), [setIsPlaying]);
  const handleDurationChange = useCallback(() => {
    const video = videoRef.current;
    if (video) setDuration(video.duration);
  }, [setDuration]);

  // Block seeking via the seeking event as well
  const handleSeeking = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.currentTime > maxReachedTime.current + 1.5) {
      video.currentTime = maxReachedTime.current;
    }
  }, [maxReachedTime]);

  return (
    <div className="relative w-full bg-black aspect-video">
      <video
        ref={videoRef}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onDurationChange={handleDurationChange}
        onSeeking={handleSeeking}
        playsInline
      />
      <PlayerControls videoRef={videoRef} />
    </div>
  );
}

function PlayerControls({
  videoRef,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const { isPlaying, currentTime, duration } = useVideoTime();

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center gap-3">
      <button
        onClick={togglePlay}
        className="text-white hover:text-gray-300 transition-colors"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-7 h-7"
          >
            <path
              fillRule="evenodd"
              d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-7 h-7"
          >
            <path
              fillRule="evenodd"
              d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <span className="text-white text-sm font-mono min-w-[80px]">
        {formatTime(currentTime)} / {formatTime(duration || 0)}
      </span>

      <div className="flex-1" />

      <button
        onClick={toggleMute}
        className="text-white hover:text-gray-300 transition-colors"
        aria-label="Toggle mute"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6"
        >
          <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
          <path d="M15.932 7.757a.75.75 0 0 1 1.061 0 6 6 0 0 1 0 8.486.75.75 0 0 1-1.06-1.061 4.5 4.5 0 0 0 0-6.364.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      <button
        onClick={toggleFullscreen}
        className="text-white hover:text-gray-300 transition-colors"
        aria-label="Toggle fullscreen"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-6 h-6"
        >
          <path
            fillRule="evenodd"
            d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/VideoPlayer.tsx
git commit -m "feat: add VideoPlayer with HLS support and no-fast-forward"
```

---

## Task 3: ChatRoom Component — Auto-Chat by Timestamp

**Files:**
- Create: `src/components/ChatRoom.tsx`
- Create: `src/hooks/useAutoChat.ts`

Auto-chat messages fire when `currentTime` crosses their `timeSec`. We track which messages have already been shown using a Set of indices. Users can also type their own messages (local-only, no backend).

**Step 1: Create the useAutoChat hook**

Create `src/hooks/useAutoChat.ts`:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import type { AutoChatMessage } from "@/types/webinar";

export interface ChatMessage {
  id: string;
  name: string;
  message: string;
  timestamp: number;
  isAuto: boolean;
}

export function useAutoChat(
  autoMessages: AutoChatMessage[],
  currentTime: number
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const firedIndices = useRef<Set<number>>(new Set());

  useEffect(() => {
    autoMessages.forEach((msg, index) => {
      if (currentTime >= msg.timeSec && !firedIndices.current.has(index)) {
        firedIndices.current.add(index);
        setMessages((prev) => [
          ...prev,
          {
            id: `auto-${index}-${msg.timeSec}`,
            name: msg.name,
            message: msg.message,
            timestamp: msg.timeSec,
            isAuto: true,
          },
        ]);
      }
    });
  }, [currentTime, autoMessages]);

  const addUserMessage = (name: string, message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        name,
        message,
        timestamp: currentTime,
        isAuto: false,
      },
    ]);
  };

  return { messages, addUserMessage };
}
```

**Step 2: Create the ChatRoom component**

Create `src/components/ChatRoom.tsx`:

```typescript
"use client";

import { useState, useRef, useEffect } from "react";
import { useVideoTime } from "@/contexts/VideoTimeContext";
import { useAutoChat } from "@/hooks/useAutoChat";
import type { AutoChatMessage } from "@/types/webinar";

interface ChatRoomProps {
  autoMessages: AutoChatMessage[];
  userName?: string;
}

export default function ChatRoom({
  autoMessages,
  userName = "You",
}: ChatRoomProps) {
  const { currentTime } = useVideoTime();
  const { messages, addUserMessage } = useAutoChat(autoMessages, currentTime);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    addUserMessage(userName, trimmed);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
        <span className="text-sm font-semibold text-zinc-200">Chat</span>
        <span className="text-xs text-zinc-500">
          {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2">
            <span className="text-sm font-semibold text-blue-400 shrink-0">
              {msg.name}
            </span>
            <span className="text-sm text-zinc-300 break-words">
              {msg.message}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 placeholder-zinc-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/hooks/useAutoChat.ts src/components/ChatRoom.tsx
git commit -m "feat: add ChatRoom with auto-chat triggered by video timestamp"
```

---

## Task 4: CTA Overlay — Time-Triggered with Countdown

**Files:**
- Create: `src/components/CTAOverlay.tsx`

CTA appears when `currentTime` is between `showAtSec` and `hideAtSec`. The countdown starts from `countdownDurationSec` and ticks down based on elapsed time since the CTA appeared.

**Step 1: Create the CTAOverlay component**

Create `src/components/CTAOverlay.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import { useVideoTime } from "@/contexts/VideoTimeContext";
import type { CTAEvent } from "@/types/webinar";

interface CTAOverlayProps {
  ctaEvents: CTAEvent[];
}

export default function CTAOverlay({ ctaEvents }: CTAOverlayProps) {
  const { currentTime } = useVideoTime();

  const activeCTA = useMemo(() => {
    return ctaEvents.find(
      (cta) => currentTime >= cta.showAtSec && currentTime < cta.hideAtSec
    );
  }, [currentTime, ctaEvents]);

  if (!activeCTA) return null;

  const elapsed = currentTime - activeCTA.showAtSec;
  const remaining = Math.max(0, activeCTA.countdownDurationSec - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = Math.floor(remaining % 60);

  return (
    <div className="absolute bottom-16 left-4 right-4 z-10">
      <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-xl p-4 shadow-2xl shadow-red-900/30 animate-in slide-in-from-bottom-4">
        {activeCTA.promoText && (
          <p className="text-white/90 text-sm mb-2">{activeCTA.promoText}</p>
        )}

        <div className="flex items-center gap-3">
          <a
            href={activeCTA.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-white text-red-600 font-bold text-center py-3 px-6 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {activeCTA.buttonText}
          </a>

          {activeCTA.showCountdown && remaining > 0 && (
            <div className="text-white text-center min-w-[80px]">
              <div className="text-2xl font-mono font-bold">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </div>
              <div className="text-xs text-white/70">remaining</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/CTAOverlay.tsx
git commit -m "feat: add CTA overlay with countdown timer, time-triggered"
```

---

## Task 5: Viewer Count + LIVE Badge

**Files:**
- Create: `src/components/LiveBadge.tsx`
- Create: `src/hooks/useViewerCount.ts`

Simulated viewer count. Fluctuates slightly every few seconds based on `viewerConfig.baseCount` and `viewerConfig.multiplier`. LIVE badge is a pulsing red dot.

**Step 1: Create the useViewerCount hook**

Create `src/hooks/useViewerCount.ts`:

```typescript
"use client";

import { useState, useEffect } from "react";
import type { ViewerConfig } from "@/types/webinar";

export function useViewerCount(config: ViewerConfig, isPlaying: boolean) {
  const [count, setCount] = useState(
    config.baseCount * config.multiplier
  );

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const base = config.baseCount * config.multiplier;
      const variance = Math.floor(base * 0.05);
      const fluctuation =
        Math.floor(Math.random() * variance * 2) - variance;
      setCount(base + fluctuation);
    }, 5000);

    return () => clearInterval(interval);
  }, [config, isPlaying]);

  return count;
}
```

**Step 2: Create the LiveBadge component**

Create `src/components/LiveBadge.tsx`:

```typescript
"use client";

import { useVideoTime } from "@/contexts/VideoTimeContext";
import { useViewerCount } from "@/hooks/useViewerCount";
import type { ViewerConfig } from "@/types/webinar";

interface LiveBadgeProps {
  viewerConfig: ViewerConfig;
}

export default function LiveBadge({ viewerConfig }: LiveBadgeProps) {
  const { isPlaying } = useVideoTime();
  const viewerCount = useViewerCount(viewerConfig, isPlaying);

  return (
    <div className="flex items-center gap-3">
      {/* LIVE badge */}
      <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        LIVE
      </div>

      {/* Viewer count */}
      <div className="flex items-center gap-1 text-zinc-400 text-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
        </svg>
        <span>{viewerCount.toLocaleString()} watching</span>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/hooks/useViewerCount.ts src/components/LiveBadge.tsx
git commit -m "feat: add LIVE badge with pulsing dot and simulated viewer count"
```

---

## Task 6: Live Room Page — Assemble All Components

**Files:**
- Create: `src/app/live/[id]/page.tsx`
- Modify: `src/app/page.tsx`

The main live room page fetches config and renders VideoPlayer + ChatRoom + CTAOverlay + LiveBadge in a responsive layout: video on the left (takes ~70% width), chat panel on the right (~30% width).

**Step 1: Create the live room page**

Create `src/app/live/[id]/page.tsx`:

```typescript
import LiveRoom from "./LiveRoom";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LivePage({ params }: PageProps) {
  const { id } = await params;

  return <LiveRoom webinarId={id} />;
}
```

Create `src/app/live/[id]/LiveRoom.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { VideoTimeProvider } from "@/contexts/VideoTimeContext";
import VideoPlayer from "@/components/VideoPlayer";
import ChatRoom from "@/components/ChatRoom";
import CTAOverlay from "@/components/CTAOverlay";
import LiveBadge from "@/components/LiveBadge";
import type { WebinarConfig } from "@/types/webinar";

interface LiveRoomProps {
  webinarId: string;
}

export default function LiveRoom({ webinarId }: LiveRoomProps) {
  const [config, setConfig] = useState<WebinarConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/webinars/${webinarId}/config`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load webinar config");
        return res.json();
      })
      .then(setConfig)
      .catch((err) => setError(err.message));
  }, [webinarId]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <VideoTimeProvider>
      <div className="flex flex-col h-screen bg-zinc-950">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
          <h1 className="text-lg font-semibold text-zinc-100 truncate">
            {config.title}
          </h1>
          <LiveBadge viewerConfig={config.viewerConfig} />
        </header>

        {/* Main content */}
        <div className="flex flex-1 min-h-0">
          {/* Video area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="relative flex-1 flex items-center justify-center bg-black">
              <div className="w-full max-h-full">
                <VideoPlayer videoUrl={config.videoUrl} />
                <CTAOverlay ctaEvents={config.cta} />
              </div>
            </div>
          </div>

          {/* Chat sidebar */}
          <div className="w-80 shrink-0 hidden md:flex">
            <ChatRoom autoMessages={config.autoChat} />
          </div>
        </div>
      </div>
    </VideoTimeProvider>
  );
}
```

**Step 2: Update the home page to redirect to demo**

Replace `src/app/page.tsx`:

```typescript
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-zinc-100">
          Simulive Webinar Platform
        </h1>
        <p className="text-zinc-400">
          Pre-recorded content with live interaction feel
        </p>
        <Link
          href="/live/demo-001"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Enter Demo Webinar
        </Link>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/live/ src/app/page.tsx
git commit -m "feat: add live room page assembling all webinar components"
```

---

## Task 7: Polish & Manual Testing

**Step 1: Verify the build compiles**

Run:
```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 2: Run dev server and test manually**

Run:
```bash
npm run dev
```

Test in browser at `http://localhost:3000`:
1. Home page shows "Enter Demo Webinar" link
2. Click link → navigates to `/live/demo-001`
3. Video loads and plays HLS stream
4. Chat panel shows auto-messages appearing as video time progresses
5. CTA overlay appears at 60s with countdown
6. CTA disappears at 180s
7. LIVE badge pulses, viewer count fluctuates
8. Trying to drag/seek forward is blocked (snaps back)
9. Typing a message in chat works (local-only)

**Step 3: Fix any issues found during testing**

Address compile errors or visual bugs.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: simulive webinar MVP complete - video, chat, CTA, viewer count"
```

---

## Summary

| Task | What it builds | Key files |
|------|---------------|-----------|
| 0 | Project setup, types, demo data, API route | `types/webinar.ts`, `data/demo-webinar.json`, API route |
| 1 | VideoTimeContext (shared timestamp) | `contexts/VideoTimeContext.tsx` |
| 2 | VideoPlayer (HLS + no fast-forward) | `components/VideoPlayer.tsx` |
| 3 | ChatRoom + useAutoChat (timestamp-triggered) | `components/ChatRoom.tsx`, `hooks/useAutoChat.ts` |
| 4 | CTA Overlay (time-triggered + countdown) | `components/CTAOverlay.tsx` |
| 5 | LIVE badge + viewer count (simulated) | `components/LiveBadge.tsx`, `hooks/useViewerCount.ts` |
| 6 | Live room page (assembles everything) | `app/live/[id]/page.tsx`, `app/live/[id]/LiveRoom.tsx` |
| 7 | Build verification + manual testing | - |
