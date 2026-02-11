# MVP Gap Closure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all identified gaps between the PM spec and current codebase to reach full MVP readiness.

**Architecture:** Three tiers of work — quick UI fixes (Tier 1), real-time features via SSE (Tier 2), and email/webhook infrastructure (Tier 3). All changes are additive; no existing functionality is removed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Video.js, Tailwind CSS 4, SSE (EventSource), SendGrid (optional)

---

## Parallelization Map

Tasks are grouped by file dependencies. Tasks within a group can run in parallel with tasks from other groups, but tasks touching the same files must be sequential.

```
GROUP A (independent):     Task 1 (landing page phone field)
GROUP B (independent):     Task 2 (admin registration list + CSV)
GROUP C (confirm page):    Task 3 (confirm page: countdown + ICS)
GROUP D (waiting page):    Task 4 (waiting page: auto-redirect + 30min gate)
GROUP E (types + admin):   Task 5 (viewer count config) → Task 6 (live page viewer formula)
GROUP F (chat system):     Task 7 (SSE chat backend) → Task 8 (ChatRoom SSE client)
GROUP G (tracking):        Task 9 (tracking utility + instrumentation)
GROUP H (email):           Task 10 (email service + templates)
GROUP I (end page):        Task 11 (end page + video ended redirect)
GROUP J (webhook):         Task 12 (webhook on registration)
```

**Parallel-safe groups:** A, B, C, D can all run simultaneously. E→F→G→H→I→J have some sequential deps.

---

### Task 1: Add Phone Field to Registration Form

**Files:**
- Modify: `src/app/webinar/[id]/page.tsx` (registration form section, ~line 320-360)

**Context:** The `Registration` type already has `phone?: string`, the API already accepts it, and `validatePhone()` exists in `utils.ts`. Only the form UI is missing.

**Step 1: Add phone state and input field**

In `src/app/webinar/[id]/page.tsx`, add phone state alongside existing name/email:

```tsx
const [phone, setPhone] = useState('');
```

Add phone input after the email input in the form (around line 340):

```tsx
<div>
  <label className="block text-sm text-neutral-400 mb-2">手機號碼（選填）</label>
  <input
    type="tel"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    className="w-full bg-transparent border-b border-neutral-700 py-3 text-white placeholder-neutral-600 focus:border-white focus:outline-none transition-colors"
    placeholder="0912345678"
  />
</div>
```

**Step 2: Wire phone into form submission**

In the `handleSubmit` function body JSON, add `phone: phone.trim() || undefined` to the fetch body.

**Step 3: Verify**

Run: `npm run build`
Expected: Build succeeds. Landing page shows phone field. Registration API receives phone.

**Step 4: Commit**

```bash
git add src/app/webinar/[id]/page.tsx
git commit -m "feat: add phone field to registration form"
```

---

### Task 2: Registration List + CSV Export in Admin

**Files:**
- Modify: `src/app/admin/page.tsx` (add new tab + component)
- Modify: `src/app/api/webinar/[id]/route.ts` (add registrations to GET response)

**Context:** `data/registrations.json` stores all registrations. `getRegistrationsByWebinar()` exists in `db.ts`. Admin needs a tab to view and export them.

**Step 1: Add registrations to webinar API response**

In `src/app/api/webinar/[id]/route.ts`, import `getRegistrationsByWebinar` from `@/lib/db` and include registrations in the GET response:

```ts
import { getWebinarById, getRegistrationsByWebinar } from '@/lib/db';

// In the GET handler, after fetching webinar:
const registrations = getRegistrationsByWebinar(id);
return NextResponse.json({ webinar, registrations });
```

**Step 2: Add "報名名單" tab to admin**

In `src/app/admin/page.tsx`:

1. Update `TabType` to include `'registrations'`:
```tsx
type TabType = 'list' | 'create' | 'edit' | 'registrations';
```

2. Add the tab button in the nav section after the create button.

3. Add a new `RegistrationList` component that:
   - Fetches all webinars, then for each, fetches `/api/webinar/{id}` to get registrations
   - Displays a table: Name, Email, Phone, Webinar, Session, Registered At
   - Has a "匯出 CSV" button

**Step 3: Implement CSV export**

```tsx
function exportCSV(registrations: Registration[], webinarTitle: string) {
  const headers = ['姓名', 'Email', '電話', '場次', '報名時間'];
  const rows = registrations.map(r => [
    r.name, r.email, r.phone || '', r.sessionId, r.registeredAt
  ]);
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${webinarTitle}-registrations.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 4: Verify**

Run: `npm run build`
Expected: Admin shows registrations tab. CSV downloads correctly with BOM for Excel compatibility.

**Step 5: Commit**

```bash
git add src/app/admin/page.tsx src/app/api/webinar/[id]/route.ts
git commit -m "feat: add registration list and CSV export to admin"
```

---

### Task 3: Confirm Page — Countdown + ICS Calendar Download

**Files:**
- Modify: `src/app/webinar/[id]/confirm/page.tsx`

**Context:** `generateICSContent()` already exists in `src/lib/utils.ts`. `CountdownTimer` component exists. Confirm page currently shows a static success message without fetching webinar data.

**Step 1: Fetch webinar data on confirm page**

Add state and useEffect to fetch webinar + session data (same pattern as waiting page):

```tsx
const [webinar, setWebinar] = useState<Webinar | null>(null);
const [session, setSession] = useState<Session | null>(null);

useEffect(() => {
  async function fetchWebinar() {
    const res = await fetch(`/api/webinar/${webinarId}`);
    if (!res.ok) return;
    const data = await res.json();
    setWebinar(data.webinar);
    const found = data.webinar.sessions.find((s: Session) => s.id === sessionId);
    setSession(found || data.webinar.sessions[0]);
  }
  fetchWebinar();
}, [webinarId, sessionId]);
```

**Step 2: Add countdown timer**

After the success icon/message, add:

```tsx
{session && (
  <div className="mb-8">
    <p className="text-gray-400 text-sm mb-3">距離直播還有</p>
    <CountdownTimer
      targetTime={session.startTime}
      size="md"
      showDays={true}
      showLabels={true}
    />
  </div>
)}
```

**Step 3: Add ICS download buttons**

Replace the static calendar action card with functional buttons:

```tsx
function handleDownloadICS() {
  if (!webinar || !session) return;
  const ics = generateICSContent(
    webinar.title,
    session.startTime,
    webinar.duration,
    `講者: ${webinar.speakerName}`,
    `${window.location.origin}/webinar/${webinar.id}/waiting?session=${session.id}`
  );
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${webinar.title}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function getGoogleCalendarUrl() {
  if (!webinar || !session) return '#';
  const start = new Date(session.startTime);
  const end = new Date(start.getTime() + webinar.duration * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  return `https://calendar.google.com/calendar/event?action=TEMPLATE&text=${encodeURIComponent(webinar.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`講者: ${webinar.speakerName}`)}`;
}
```

Render two buttons:
```tsx
<div className="flex gap-3">
  <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer"
     className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-xl p-4 text-center transition-colors">
    📅 Google 日曆
  </a>
  <button onClick={handleDownloadICS}
    className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-xl p-4 text-center transition-colors">
    📅 iCal 下載
  </button>
</div>
```

**Step 4: Verify**

Run: `npm run build`
Expected: Confirm page shows countdown + two working calendar buttons.

**Step 5: Commit**

```bash
git add src/app/webinar/[id]/confirm/page.tsx
git commit -m "feat: add countdown timer and ICS calendar download to confirm page"
```

---

### Task 4: Waiting Page — Auto-Redirect + 30min Gate

**Files:**
- Modify: `src/app/webinar/[id]/waiting/page.tsx`

**Context:** Currently uses 10-min threshold and manual button click. Spec requires 30-min threshold and auto-redirect when countdown hits zero.

**Step 1: Change threshold from 10min to 30min**

In the `checkCanEnter` function, change:
```tsx
setCanEnter(minutesUntilStart <= 30);
```

**Step 2: Add auto-redirect on countdown complete**

Add `onComplete` to CountdownTimer that triggers navigation:

```tsx
const handleCountdownComplete = useCallback(() => {
  router.push(`/webinar/${webinarId}/live?session=${sessionId}&name=${encodeURIComponent(userName)}`);
}, [router, webinarId, sessionId, userName]);
```

Wire it to the CountdownTimer:
```tsx
<CountdownTimer
  targetTime={session.startTime}
  size="lg"
  showDays={true}
  showLabels={true}
  onComplete={handleCountdownComplete}
/>
```

**Step 3: Update button text**

Change the disabled button text:
```tsx
'直播開始前 30 分鐘可進入'
```

Also update the confirm page hint text at the bottom to match:
```
直播開始前 30 分鐘可進入直播間
```

**Step 4: Verify**

Run: `npm run build`
Expected: Waiting page auto-redirects when countdown reaches zero. Button enables at 30min before start.

**Step 5: Commit**

```bash
git add src/app/webinar/[id]/waiting/page.tsx
git commit -m "feat: auto-redirect on countdown complete, change gate to 30min"
```

---

### Task 5: Viewer Count Configuration (Types + Admin)

**Files:**
- Modify: `src/lib/types.ts` (add fields to Webinar)
- Modify: `src/app/admin/page.tsx` (add viewer config section to form)
- Modify: `src/lib/db.ts` (update sample data)

**Step 1: Add viewer config fields to Webinar type**

In `src/lib/types.ts`, add to the `Webinar` interface:

```ts
viewerBaseCount: number;   // base fake viewer count
viewerMultiplier: number;  // multiplier for real count
```

Also add to `CreateWebinarRequest`:
```ts
viewerBaseCount?: number;
viewerMultiplier?: number;
```

**Step 2: Add viewer config section to admin form**

In `src/app/admin/page.tsx` `WebinarForm`, add state fields:
```tsx
viewerBaseCount: webinar?.viewerBaseCount || 100,
viewerMultiplier: webinar?.viewerMultiplier || 3,
```

Add a new form section "社會證明設定" with two number inputs for base count and multiplier. Include the formula explanation as helper text: `顯示人數 = (實際人數 × 倍率) + 基礎人數 ± 5%`

**Step 3: Update sample data**

In `src/lib/db.ts` `initializeSampleData`, add to the sample webinar:
```ts
viewerBaseCount: 100,
viewerMultiplier: 3,
```

**Step 4: Wire into form submission**

Add `viewerBaseCount` and `viewerMultiplier` to the payload object in `handleSubmit`.

**Step 5: Verify**

Run: `npm run build`
Expected: Admin form shows viewer config fields. Data persists on save.

**Step 6: Commit**

```bash
git add src/lib/types.ts src/app/admin/page.tsx src/lib/db.ts
git commit -m "feat: add configurable viewer count base and multiplier"
```

---

### Task 6: Live Page — Viewer Count Formula

**Files:**
- Modify: `src/app/webinar/[id]/live/page.tsx`

**Context:** Depends on Task 5 (needs `viewerBaseCount` and `viewerMultiplier` on Webinar type). Currently hardcodes viewer count starting at 247 with random delta.

**Step 1: Replace hardcoded viewer count with formula**

Replace the current viewer count simulation (lines ~41-74) with:

```tsx
// Simulated "real" viewer count (in production this would come from SSE connection count)
const [realViewerCount, setRealViewerCount] = useState(1);

// Calculate display count using formula from spec
const viewerCount = useMemo(() => {
  const base = webinar?.viewerBaseCount ?? 100;
  const multiplier = webinar?.viewerMultiplier ?? 3;
  const calculated = (realViewerCount * multiplier) + base;
  const variance = calculated * 0.05; // ±5%
  const random = (Math.random() * 2 - 1) * variance;
  return Math.round(calculated + random);
}, [realViewerCount, webinar]);

// Simulate real viewer fluctuation
useEffect(() => {
  if (!isPlaying) return;
  const interval = setInterval(() => {
    setRealViewerCount(prev => Math.max(1, prev + Math.floor(Math.random() * 3) - 1));
  }, 5000);
  return () => clearInterval(interval);
}, [isPlaying]);
```

Remove the old `useState(247)` and its `useEffect`.

**Step 2: Verify**

Run: `npm run build`
Expected: Viewer count uses the configurable formula. Default shows ~103 (1×3+100±5%).

**Step 3: Commit**

```bash
git add src/app/webinar/[id]/live/page.tsx
git commit -m "feat: use configurable viewer count formula with base/multiplier"
```

---

### Task 7: SSE Chat Backend

**Files:**
- Create: `src/app/api/webinar/[id]/chat/stream/route.ts`
- Modify: `src/app/api/webinar/[id]/chat/route.ts` (broadcast on POST)
- Create: `src/lib/chat-broker.ts` (in-memory pub/sub)

**Step 1: Create chat broker**

Create `src/lib/chat-broker.ts` — a simple in-memory pub/sub for SSE:

```ts
type Listener = (data: string) => void;

class ChatBroker {
  private listeners: Map<string, Set<Listener>> = new Map();

  subscribe(channel: string, listener: Listener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);
    return () => {
      this.listeners.get(channel)?.delete(listener);
      if (this.listeners.get(channel)?.size === 0) {
        this.listeners.delete(channel);
      }
    };
  }

  publish(channel: string, data: string): void {
    this.listeners.get(channel)?.forEach(listener => listener(data));
  }

  getConnectionCount(channel: string): number {
    return this.listeners.get(channel)?.size ?? 0;
  }
}

// Singleton — survives across API route invocations in dev/production
export const chatBroker = new ChatBroker();
```

**Step 2: Create SSE stream endpoint**

Create `src/app/api/webinar/[id]/chat/stream/route.ts`:

```ts
import { chatBroker } from '@/lib/chat-broker';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channel = `webinar-${id}`;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connection count
      const countData = JSON.stringify({
        type: 'viewers',
        count: chatBroker.getConnectionCount(channel) + 1,
      });
      controller.enqueue(encoder.encode(`data: ${countData}\n\n`));

      const unsubscribe = chatBroker.subscribe(channel, (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          unsubscribe();
        }
      });

      // Broadcast updated viewer count
      const broadcastCount = () => {
        const count = chatBroker.getConnectionCount(channel);
        chatBroker.publish(channel, JSON.stringify({ type: 'viewers', count }));
      };
      broadcastCount();

      // Heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeat);
        // Broadcast updated count after disconnect
        setTimeout(broadcastCount, 100);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

**Step 3: Update chat POST to broadcast**

In `src/app/api/webinar/[id]/chat/route.ts`, import the broker and publish after saving:

```ts
import { chatBroker } from '@/lib/chat-broker';

// After addChatMessage(...):
const channel = `webinar-${id}`;
chatBroker.publish(channel, JSON.stringify({
  type: 'message',
  message: newMessage,
}));
```

**Step 4: Verify**

Run: `npm run build`
Expected: Build succeeds. SSE endpoint streams messages.

**Step 5: Commit**

```bash
git add src/lib/chat-broker.ts src/app/api/webinar/[id]/chat/stream/route.ts src/app/api/webinar/[id]/chat/route.ts
git commit -m "feat: add SSE chat backend with in-memory pub/sub broker"
```

---

### Task 8: ChatRoom SSE Client Integration

**Files:**
- Modify: `src/components/chat/ChatRoom.tsx` (add EventSource subscription)
- Modify: `src/app/webinar/[id]/live/page.tsx` (pass webinarId + sessionId to ChatRoom, use real viewer count from SSE)

**Context:** Depends on Task 7 (SSE endpoint must exist).

**Step 1: Add SSE subscription to ChatRoom**

Add new props to `ChatRoomProps`:
```tsx
webinarId?: string;
sessionId?: string;
```

Add EventSource subscription inside ChatRoom:
```tsx
useEffect(() => {
  if (!webinarId) return;

  const eventSource = new EventSource(`/api/webinar/${webinarId}/chat/stream`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        const msg = data.message;
        setMessages(prev => {
          // Deduplicate by id
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, {
            id: msg.id,
            name: msg.name,
            message: msg.message,
            timestamp: msg.timestamp,
          }];
        });
      }
    } catch { /* ignore parse errors */ }
  };

  return () => eventSource.close();
}, [webinarId]);
```

**Step 2: Pass props from live page**

In `src/app/webinar/[id]/live/page.tsx`, update the ChatRoom usage:
```tsx
<ChatRoom
  currentTime={currentTime}
  autoMessages={webinar.autoChat}
  timeVariance={3}
  userName={userName}
  webinarId={webinarId}
  sessionId={session?.id}
  onSendMessage={handleSendMessage}
/>
```

**Step 3: Verify**

Run: `npm run build`
Expected: Chat messages sync between browser tabs viewing the same webinar.

**Step 4: Commit**

```bash
git add src/components/chat/ChatRoom.tsx src/app/webinar/[id]/live/page.tsx
git commit -m "feat: add real-time chat sync via SSE EventSource"
```

---

### Task 9: Tracking Events Utility + Instrumentation

**Files:**
- Create: `src/lib/tracking.ts`
- Create: `src/app/api/track/route.ts`
- Modify: `src/app/webinar/[id]/page.tsx` (landing page events)
- Modify: `src/app/webinar/[id]/live/page.tsx` (live room events)
- Modify: `src/components/cta/CTAOverlay.tsx` (cta_view event)

**Step 1: Create tracking utility**

Create `src/lib/tracking.ts`:

```ts
type TrackingEvent = {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: string;
};

export function track(event: string, properties?: Record<string, unknown>) {
  const payload: TrackingEvent = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Track]', event, properties);
  }

  // Fire and forget to backend
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => { /* silent fail */ });
}
```

**Step 2: Create track API endpoint**

Create `src/app/api/track/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    const filepath = path.join(process.cwd(), 'data', 'events.json');

    let events: unknown[] = [];
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      events = JSON.parse(content);
    } catch { /* file doesn't exist yet */ }

    events.push(event);
    fs.writeFileSync(filepath, JSON.stringify(events, null, 2), 'utf-8');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

**Step 3: Instrument landing page**

In `src/app/webinar/[id]/page.tsx`:
```tsx
import { track } from '@/lib/tracking';

// On mount:
useEffect(() => { track('page_view', { page: 'landing', webinarId }); }, [webinarId]);

// On form focus (first input):
// Add onFocus to name input: onFocus={() => track('form_start', { webinarId })}

// On form submit success:
track('form_submit', { webinarId, sessionId: selectedSession });
```

**Step 4: Instrument live page**

In `src/app/webinar/[id]/live/page.tsx`:
```tsx
import { track } from '@/lib/tracking';

// On mount:
useEffect(() => { track('webinar_join', { webinarId }); }, [webinarId]);

// In handlePlaybackEvent, track video progress milestones:
const trackedMilestones = useRef<Set<number>>(new Set());
// Inside timeupdate handler:
if (event.duration > 0) {
  const percent = Math.floor((event.currentTime / event.duration) * 100);
  [25, 50, 75, 100].forEach(milestone => {
    if (percent >= milestone && !trackedMilestones.current.has(milestone)) {
      trackedMilestones.current.add(milestone);
      track('video_progress', { webinarId, percent: milestone });
    }
  });
}

// On ended:
track('webinar_leave', { webinarId, reason: 'ended' });

// On CTA click (already exists, just add track):
track('cta_click', { webinarId, buttonText: cta.buttonText, url: cta.url });
```

**Step 5: Track CTA view in CTAOverlay**

In `src/components/cta/CTAOverlay.tsx`, add an `onCTAView` prop or track inline when CTA becomes visible:
```tsx
// Add prop:
onCTAView?: (cta: CTAEvent) => void;

// When matched CTA appears (in the useEffect where setActiveCTA is called):
if (matched && matched !== prevActive.current) {
  onCTAView?.(matched);
}
```

Wire from live page:
```tsx
onCTAView={(cta) => track('cta_view', { webinarId, buttonText: cta.buttonText })}
```

**Step 6: Verify**

Run: `npm run build`
Expected: Build succeeds. Events logged to console and saved to `data/events.json`.

**Step 7: Commit**

```bash
git add src/lib/tracking.ts src/app/api/track/route.ts src/app/webinar/[id]/page.tsx src/app/webinar/[id]/live/page.tsx src/components/cta/CTAOverlay.tsx
git commit -m "feat: add tracking events for full marketing funnel instrumentation"
```

---

### Task 10: Email Service + Templates

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/app/api/cron/reminders/route.ts`
- Modify: `src/app/api/register/route.ts` (send confirmation email)

**Context:** Uses SendGrid if `SENDGRID_API_KEY` env var is set, otherwise logs to console. No npm install needed — uses fetch to call SendGrid API directly.

**Step 1: Create email service**

Create `src/lib/email.ts`:

```ts
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@webinar.example.com';
const FROM_NAME = process.env.FROM_NAME || 'Webinar';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log(`[Email] Would send to ${to}: "${subject}"`);
    console.log(`[Email] Body: ${html.substring(0, 200)}...`);
    return true;
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: FROM_NAME },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('[Email] Send failed:', err);
    return false;
  }
}

// Email Templates

export function confirmationEmail(name: string, title: string, startTime: string, liveUrl: string): EmailParams {
  const date = new Date(startTime).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
  return {
    to: '', // filled by caller
    subject: `✅ 報名成功！${title}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，恭喜你成功報名！</h2>
        <p>📅 直播時間：${date}</p>
        <p>開播前我們會再次提醒你！</p>
        <a href="${liveUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:16px;">進入直播間</a>
      </div>
    `,
  };
}

export function reminderEmail(type: '24h' | '1h', name: string, title: string, liveUrl: string): EmailParams {
  const subject = type === '24h'
    ? `⏰ 明天見！${title} 即將開始`
    : `🔴 ${title} 1 小時後開始！`;
  const body = type === '24h'
    ? `<p>提醒你：${title} 明天開播！</p><p>準備好你的筆記本，明天見！</p>`
    : `<p>${title} 將在 1 小時後開始！</p><p>建議提前 5 分鐘進入，確保網路順暢。</p>`;

  return {
    to: '',
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，</h2>
        ${body}
        <a href="${liveUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin-top:16px;">👉 進入直播間</a>
      </div>
    `,
  };
}

export function followUpEmail(name: string, title: string, replayUrl: string, ctaUrl?: string): EmailParams {
  return {
    to: '',
    subject: `🎬 ${title} 重播連結`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Hi ${name}，感謝你參加今天的直播！</h2>
        <p>如果你錯過了一部分，這是重播連結：</p>
        <a href="${replayUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;margin:16px 0;">🔗 觀看重播</a>
        <p style="color:#666;">（重播 48 小時內有效）</p>
        ${ctaUrl ? `<p>今天講座中提到的限時優惠，還剩 24 小時：</p><a href="${ctaUrl}">👉 前往優惠頁面</a>` : ''}
      </div>
    `,
  };
}
```

**Step 2: Send confirmation email on registration**

In `src/app/api/register/route.ts`, after `createRegistration(...)`:

```ts
import { sendEmail, confirmationEmail } from '@/lib/email';

// After creating registration:
const liveUrl = `${request.nextUrl.origin}/webinar/${body.webinarId}/waiting?session=${body.sessionId}&name=${encodeURIComponent(body.name)}`;
const emailData = confirmationEmail(body.name, webinar.title, session.startTime, liveUrl);
sendEmail({ ...emailData, to: body.email }); // fire and forget
```

**Step 3: Create reminder cron endpoint**

Create `src/app/api/cron/reminders/route.ts` — scans upcoming sessions and sends reminders:

```ts
import { NextResponse } from 'next/server';
import { getAllWebinars, getRegistrationsByWebinar } from '@/lib/db';
import { sendEmail, reminderEmail } from '@/lib/email';

export async function GET() {
  const webinars = getAllWebinars();
  let sent = 0;

  for (const webinar of webinars) {
    if (webinar.status !== 'published') continue;

    for (const session of webinar.sessions) {
      const startTime = new Date(session.startTime).getTime();
      const now = Date.now();
      const hoursUntil = (startTime - now) / (1000 * 60 * 60);

      let type: '24h' | '1h' | null = null;
      if (hoursUntil > 23 && hoursUntil <= 25) type = '24h';
      if (hoursUntil > 0.5 && hoursUntil <= 1.5) type = '1h';

      if (!type) continue;

      const registrations = getRegistrationsByWebinar(webinar.id);
      for (const reg of registrations) {
        if (reg.sessionId !== session.id) continue;
        const liveUrl = `/webinar/${webinar.id}/waiting?session=${session.id}&name=${encodeURIComponent(reg.name)}`;
        const emailData = reminderEmail(type, reg.name, webinar.title, liveUrl);
        await sendEmail({ ...emailData, to: reg.email });
        sent++;
      }
    }
  }

  return NextResponse.json({ sent });
}
```

**Step 4: Verify**

Run: `npm run build`
Expected: Build succeeds. Without SENDGRID_API_KEY, emails log to console.

**Step 5: Commit**

```bash
git add src/lib/email.ts src/app/api/register/route.ts src/app/api/cron/reminders/route.ts
git commit -m "feat: add email service with SendGrid integration and reminder cron"
```

---

### Task 11: End Page + Video Ended Redirect

**Files:**
- Create: `src/app/webinar/[id]/end/page.tsx`
- Modify: `src/app/webinar/[id]/live/page.tsx` (redirect on video ended)

**Step 1: Create end page**

Create `src/app/webinar/[id]/end/page.tsx`:

A page that shows:
- Thank you message with the user's name
- Webinar title and speaker info
- Replay link (link back to live page with `?replay=true` param)
- CTA button repeated (from webinar's ctaEvents)
- Footer text

Fetch webinar data from API. Extract `name`, `session` from searchParams.

The CTA section should show the first CTA event's button/promo if available.

**Step 2: Redirect from live page on video ended**

In `src/app/webinar/[id]/live/page.tsx`, in `handlePlaybackEvent`:

```tsx
if (event.type === 'ended') {
  setIsPlaying(false);
  track('webinar_leave', { webinarId, reason: 'ended' });
  // Redirect to end page after short delay
  setTimeout(() => {
    router.push(`/webinar/${webinarId}/end?session=${session?.id}&name=${encodeURIComponent(userName)}`);
  }, 2000);
}
```

**Step 3: Verify**

Run: `npm run build`
Expected: When video ends, user is redirected to end page with CTA and replay link.

**Step 4: Commit**

```bash
git add src/app/webinar/[id]/end/page.tsx src/app/webinar/[id]/live/page.tsx
git commit -m "feat: add end page with replay link and auto-redirect on video end"
```

---

### Task 12: Webhook Push on Registration

**Files:**
- Modify: `src/lib/types.ts` (add webhookUrl to Webinar)
- Modify: `src/app/admin/page.tsx` (add webhook URL input)
- Modify: `src/app/api/register/route.ts` (fire webhook)

**Step 1: Add webhookUrl to Webinar type**

In `src/lib/types.ts`, add to `Webinar`:
```ts
webhookUrl?: string;
```

Add to `CreateWebinarRequest`:
```ts
webhookUrl?: string;
```

**Step 2: Add webhook URL input to admin form**

In `src/app/admin/page.tsx`, add to formData state:
```tsx
webhookUrl: webinar?.webhookUrl || '',
```

Add a new section "Webhook 整合" with a URL input field and helper text: "報名時自動 POST 資料到此 URL（適用於 Zapier、CRM 等）"

Wire into submission payload.

**Step 3: Fire webhook on registration**

In `src/app/api/register/route.ts`, after creating the registration:

```ts
// Fire webhook if configured
if (webinar.webhookUrl) {
  fetch(webinar.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'registration',
      webinar: { id: webinar.id, title: webinar.title },
      registration: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        sessionId: body.sessionId,
        registeredAt: new Date().toISOString(),
      },
    }),
  }).catch(() => { /* silent fail */ });
}
```

**Step 4: Verify**

Run: `npm run build`
Expected: Build succeeds. Webhook fires on registration if URL is configured.

**Step 5: Commit**

```bash
git add src/lib/types.ts src/app/admin/page.tsx src/app/api/register/route.ts
git commit -m "feat: add webhook push on registration for CRM integration"
```

---

## Final Verification

After all tasks complete:

1. `npm run build` — full build passes
2. `npm run lint` — no lint errors
3. Manual walkthrough: Landing → Register → Confirm (ICS + countdown) → Waiting (auto-redirect) → Live (chat + CTA + viewers) → End page
4. Check admin: create webinar, view registrations, export CSV
5. Verify `data/events.json` has tracking events

## Commit Summary

```
feat: add phone field to registration form
feat: add registration list and CSV export to admin
feat: add countdown timer and ICS calendar download to confirm page
feat: auto-redirect on countdown complete, change gate to 30min
feat: add configurable viewer count base and multiplier
feat: use configurable viewer count formula with base/multiplier
feat: add SSE chat backend with in-memory pub/sub broker
feat: add real-time chat sync via SSE EventSource
feat: add tracking events for full marketing funnel instrumentation
feat: add email service with SendGrid integration and reminder cron
feat: add end page with replay link and auto-redirect on video end
feat: add webhook push on registration for CRM integration
```
