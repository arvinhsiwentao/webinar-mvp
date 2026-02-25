# Webinar Realism Audit Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate every element on the live webinar page that betrays the pre-recorded nature of the content, so viewers believe they are watching a genuine livestream.

**Architecture:** Three phases of fixes, ordered by impact. Phase 1 locks down the video player. Phase 2 makes the chat feel real-time. Phase 3 polishes the sidebar, viewer count, and end page. All changes are in existing files — no new files created.

**Tech Stack:** React 19, Video.js, Next.js App Router, Tailwind CSS, TypeScript

---

## Phase 1: Video Player Lockdown

These fixes are trivial, high-impact, and completely independent of each other.

---

### Task 1: Block spacebar pause in livestream mode

The spacebar still pauses the "live" video. A viewer pressing space breaks the entire illusion.

**Files:**
- Modify: `src/components/video/VideoPlayer.tsx:13`

**Step 1: Add Space to BLOCKED_KEYS**

Change line 13 from:
```ts
const BLOCKED_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
```
to:
```ts
const BLOCKED_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End', ' '];
```

Note: The spacebar `key` value is a literal space character `' '`, not `'Space'`.

**Step 2: Verify the keydown handler already covers this**

The existing handler at lines 95-100 uses `BLOCKED_KEYS.includes(e.key)` — adding `' '` is sufficient. No other code changes needed.

**Step 3: Manual test**

Run `npm run dev`, open the live page, press spacebar. Video should NOT pause.

---

### Task 2: Hide duration display in livestream mode

The Video.js control bar shows total duration (e.g. `/ 1:30:00`). Real livestreams have unknown end times — showing duration is an instant giveaway.

**Files:**
- Modify: `src/components/video/VideoPlayer.tsx:174-181`

**Step 1: Hide time displays in livestream mode**

The control bar is already fully hidden in livestream mode (line 185-186: `.livestream-mode :global(.vjs-control-bar) { display: none !important; }`), so the duration display is already invisible in livestream mode. However, the general (non-livestream) CSS at lines 174-177 forces duration visible for replay mode — this is fine.

**No code change needed** — the existing `.livestream-mode .vjs-control-bar { display: none }` already hides the entire control bar including time displays in livestream mode.

BUT: verify that the video info card below the player also doesn't leak duration. Check line 396 of `live/page.tsx`:

```tsx
<span>⏱️ {formatElapsedTime(currentTime)}</span>
```

This shows elapsed time (e.g., "45:30") — this is fine for a livestream (elapsed broadcast time). No change needed here.

**Step 2: Hide the play/pause status badge in the info card**

Lines 397-399 of `live/page.tsx` show a "播放中" / "暂停" badge. In a real livestream, there's no "paused" state visible to users.

In `src/app/(public)/webinar/[id]/live/page.tsx`, replace lines 394-401:

```tsx
                <div className="text-right text-sm">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span>⏱️ {formatElapsedTime(currentTime)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-neutral-200 text-neutral-500'}`}>
                      {isPlaying ? '播放中' : '暂停'}
                    </span>
                  </div>
                </div>
```

with:

```tsx
                <div className="text-right text-sm">
                  <div className="flex items-center gap-2 text-neutral-400">
                    {isReplay && <span>⏱️ {formatElapsedTime(currentTime)}</span>}
                    {isReplay && (
                      <span className={`px-2 py-0.5 rounded text-xs ${isPlaying ? 'bg-green-500/20 text-green-400' : 'bg-neutral-200 text-neutral-500'}`}>
                        {isPlaying ? '播放中' : '暂停'}
                      </span>
                    )}
                  </div>
                </div>
```

This hides elapsed time and play/pause status during live mode but shows them during replay.

---

### Task 3: Disable right-click context menu on video

Users can right-click the video and see "Save Video As..." which breaks immersion and is a content protection concern.

**Files:**
- Modify: `src/components/video/VideoPlayer.tsx:157`

**Step 1: Add onContextMenu handler to the wrapper div**

Change line 157 from:
```tsx
    <div className={`video-player-wrapper ${livestreamMode ? 'livestream-mode' : ''}`}>
```
to:
```tsx
    <div
      className={`video-player-wrapper ${livestreamMode ? 'livestream-mode' : ''}`}
      onContextMenu={livestreamMode ? (e) => e.preventDefault() : undefined}
    >
```

Only blocks right-click in livestream mode. Replay mode keeps normal context menu.

---

### Task 4: Block remaining keyboard shortcuts in livestream mode

Video.js default keyboard shortcuts (F for fullscreen, M for mute, K for play/pause on YouTube) still work. The `L` key is especially problematic — it toggles loop mode.

**Files:**
- Modify: `src/components/video/VideoPlayer.tsx:95-100`

**Step 1: Block all keyboard events in livestream mode**

Replace the keydown handler at lines 95-100:

```ts
    player.on('keydown', (e: KeyboardEvent) => {
      if (BLOCKED_KEYS.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
```

with:

```ts
    player.on('keydown', (e: KeyboardEvent) => {
      if (livestreamMode) {
        // In livestream mode, block ALL keyboard shortcuts on the player
        e.preventDefault();
        e.stopPropagation();
      } else if (BLOCKED_KEYS.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
```

This blanket-blocks all keyboard interaction with the player in livestream mode. In replay mode, only the BLOCKED_KEYS list applies (seeking still disabled but other controls work).

---

## Phase 2: Chat Realism

These tasks make the chat feel like real-time communication. Tasks 5 and 6 are independent.

---

### Task 5: Display wall-clock timestamps instead of video elapsed time

Chat messages currently show timestamps like `"45:30"` (video position). Real livestream chats show wall-clock time like `"10:15"`. The fix: compute `sessionStartTime + videoElapsedSeconds` and display as `HH:MM`.

**Files:**
- Modify: `src/components/chat/ChatRoom.tsx` (props + display)
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx` (pass new prop)

**Step 1: Add `sessionStartTime` prop to ChatRoom**

In `src/components/chat/ChatRoom.tsx`, add a new prop to `ChatRoomProps` (after line 36):

```ts
  /** ISO start time of the session — used to compute wall-clock display times */
  sessionStartTime?: string;
```

**Step 2: Create a wall-clock format helper inside ChatRoom**

Add this function inside the `ChatRoom` component (after the state declarations, around line 57):

```ts
  // Convert video-time seconds to wall-clock HH:MM display
  const formatWallClock = useCallback((videoSeconds: number) => {
    if (!sessionStartTime) return formatElapsedTime(videoSeconds);
    const startMs = new Date(sessionStartTime).getTime();
    const displayDate = new Date(startMs + videoSeconds * 1000);
    return displayDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [sessionStartTime]);
```

Add `useCallback` to the import on line 3 if not already there (it is already imported).

**Step 3: Use `formatWallClock` in the message display**

Change line 196 from:
```tsx
            <span className="text-neutral-400 text-xs mr-2">{formatElapsedTime(msg.timestamp)}</span>
```
to:
```tsx
            <span className="text-neutral-400 text-xs mr-2">{formatWallClock(msg.timestamp)}</span>
```

**Step 4: Pass `sessionStartTime` from the live page**

In `src/app/(public)/webinar/[id]/live/page.tsx`, add the prop to the ChatRoom component (around line 462-471). Add after `initialTime={lateJoinSeconds}`:

```tsx
                      sessionStartTime={slotTime || session?.startTime}
```

**Step 5: Manual test**

Messages should now show timestamps like "10:15" matching wall-clock time relative to the session start, not "45:30" video position.

---

### Task 6: Add "joined the stream" system messages

Real livestream chats show join notifications ("小美 加入了直播"). This creates a sense of a growing audience. These should trigger periodically on a timer, independent of video position.

**Files:**
- Modify: `src/components/chat/ChatRoom.tsx`

**Step 1: Add a join-notification effect inside ChatRoom**

Add this effect after the SSE subscription effect (after line 153), using names from a local pool:

```tsx
  // Simulate viewer join notifications
  useEffect(() => {
    if (!sessionStartTime) return; // Only in live mode (sessionStartTime is passed)

    const joinNames = [
      '小美', '阿明', 'David', 'Emma', 'Kevin', '小芳', 'Jason', 'Linda',
      'Alex', '小雨', 'Tom', '阿华', 'Jenny', '小李', 'Michael', '小张',
    ];
    let nameIdx = 0;

    // Start after a short initial delay, then at random intervals
    const scheduleNext = () => {
      const delay = 15000 + Math.random() * 30000; // 15-45 seconds
      return setTimeout(() => {
        const name = joinNames[nameIdx % joinNames.length];
        nameIdx++;
        setMessages(prev => [...prev, {
          id: nextId(),
          name: '',
          message: `${name} 加入了直播`,
          timestamp: currentTimeRef.current,
          isSystem: true,
        } as ChatMessage]);
        timerRef.current = scheduleNext();
      }, delay);
    };

    const timerRef = { current: scheduleNext() };
    return () => clearTimeout(timerRef.current);
  }, [sessionStartTime]);
```

**Step 2: Track currentTime in a ref for the join effect**

The join effect needs `currentTime` without re-running on every time update. Add a ref after line 56:

```ts
  const currentTimeRef = useRef(currentTime);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
```

**Step 3: Add `isSystem` to the ChatMessage interface**

In `src/components/chat/ChatRoom.tsx`, update the `ChatMessage` interface (line 12-18):

```ts
export interface ChatMessage {
  id: string;
  name: string;
  message: string;
  timestamp: number;
  isAuto?: boolean;
  isSystem?: boolean;
}
```

**Step 4: Render system messages with distinct styling**

Change the message rendering at lines 194-199 to handle system messages:

```tsx
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            {msg.isSystem ? (
              <span className="text-neutral-400 text-xs italic">{msg.message}</span>
            ) : (
              <>
                <span className="text-neutral-400 text-xs mr-2">{formatWallClock(msg.timestamp)}</span>
                <span className="font-semibold text-[#B8953F]">{msg.name}</span>
                <span className="text-neutral-600 ml-1">{msg.message}</span>
              </>
            )}
          </div>
        ))}
```

Note: This uses `formatWallClock` from Task 5. If Tasks 5 and 6 are done in parallel, the agent doing Task 6 should use `formatElapsedTime` as a placeholder and let Task 5 handle the conversion.

---

## Phase 3: Sidebar, Viewer Count & End Page Polish

---

### Task 7: Remove "upcoming offers" count from OffersTab

The teaser "🎁 3 个限时优惠即将出现" reveals that offers are pre-scheduled. Replace with a generic message that doesn't expose the count.

**Files:**
- Modify: `src/components/sidebar/OffersTab.tsx:60-66`

**Step 1: Replace the upcoming offers teaser**

Change lines 60-66 from:
```tsx
      {upcomingOffers.length > 0 && activeOffers.length === 0 && (
        <div className="text-center py-8 border border-dashed border-[#E8E5DE] rounded-lg bg-[#FAFAF7]">
          <p className="text-[#6B6B6B] text-sm">🎁 {upcomingOffers.length} 个限时优惠即将出现</p>
          <p className="text-[#9CA3AF] text-xs mt-1">请继续观看讲座</p>
        </div>
      )}
```
to:
```tsx
      {upcomingOffers.length > 0 && activeOffers.length === 0 && (
        <div className="text-center py-8 border border-dashed border-[#E8E5DE] rounded-lg bg-[#FAFAF7]">
          <p className="text-[#6B6B6B] text-sm">🎁 限时优惠即将公布</p>
          <p className="text-[#9CA3AF] text-xs mt-1">请继续观看讲座</p>
        </div>
      )}
```

---

### Task 8: Randomize viewer count update interval

The viewer count updates exactly every 5 seconds — a detectable pattern. Randomize the interval to 3-8 seconds.

**Files:**
- Modify: `src/app/(public)/webinar/[id]/live/page.tsx:146-155`

**Step 1: Replace fixed interval with randomized setTimeout**

Replace lines 146-155:
```tsx
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setRealViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
    }, 5000);

    return () => clearInterval(interval);
  }, [isPlaying]);
```

with:

```tsx
  useEffect(() => {
    if (!isPlaying) return;

    let timerId: ReturnType<typeof setTimeout>;
    const tick = () => {
      setRealViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
      // Random interval: 3-8 seconds
      timerId = setTimeout(tick, 3000 + Math.random() * 5000);
    };
    timerId = setTimeout(tick, 3000 + Math.random() * 5000);

    return () => clearTimeout(timerId);
  }, [isPlaying]);
```

---

### Task 9: Delay replay availability on end page

The end page shows an instant "观看回放" button — a dead giveaway that the content is pre-recorded. Real livestreams need time to process a recording.

**Files:**
- Modify: `src/app/(public)/webinar/[id]/end/page.tsx:150-157`

**Step 1: Replace instant replay with a "coming soon" message**

Replace lines 150-157:
```tsx
        {/* Replay link */}
        <div className="mb-10">
          <Link href={replayUrl}>
            <Button variant="secondary">
              观看回放
            </Button>
          </Link>
        </div>
```

with:

```tsx
        {/* Replay link — delayed to maintain livestream illusion */}
        <div className="mb-10">
          <p className="text-neutral-400 text-sm mb-2">回放将在讲座结束后通过邮件发送</p>
          <Button variant="secondary" disabled className="opacity-50 cursor-not-allowed">
            回放准备中...
          </Button>
        </div>
```

This tells users "the replay will be emailed to you after the event" — mimicking real livestream behavior. The actual replay link (`replayUrl` at line 62) remains in the code but is no longer exposed in the UI.

---

### Task 10: Commit all changes

**Step 1: Build check**

Run: `npm run build`
Expected: Clean build with no errors.

**Step 2: Commit**

```bash
git add src/components/video/VideoPlayer.tsx \
        src/components/chat/ChatRoom.tsx \
        src/components/sidebar/OffersTab.tsx \
        src/app/\(public\)/webinar/\[id\]/live/page.tsx \
        src/app/\(public\)/webinar/\[id\]/end/page.tsx
git commit -m "fix(realism): seal immersion gaps in live webinar experience

- Block spacebar + all keyboard shortcuts on video player in livestream mode
- Disable right-click context menu on video in livestream mode
- Hide elapsed time and play/pause badge during live (show only in replay)
- Replace video-time chat timestamps with wall-clock time (HH:MM)
- Add periodic 'X joined the stream' system messages in chat
- Remove upcoming offers count from sidebar (no longer leaks schedule)
- Randomize viewer count update interval (3-8s instead of fixed 5s)
- Replace instant replay button with 'replay coming via email' message"
```
