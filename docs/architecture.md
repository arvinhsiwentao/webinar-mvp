# Architecture

> Last verified: 2026-02-26

Living document. Hooks remind Claude to keep this current when structural changes are made.

## System Overview

Simulive (simulated-live) webinar platform. A pre-recorded video plays on a schedule while interactive features — auto-chat, CTA overlays, viewer count — create the feel of a live broadcast. Built for the 北美華人 (North American Chinese) market (Simplified Chinese, zh-CN locale). The MVP uses JSON file storage and polling; production targets PostgreSQL and WebSocket.

## Page Flow & Routing

```
Landing Page  →  Registration  →  Lobby              →  Live Room          →  End
/                (modal)          /webinar/[id]/lobby    /webinar/[id]/live    /webinar/[id]/end
```

The root `/` is the only landing page — a single-purpose entry point hardcoded to webinar ID `1`. There is no `/webinar/[id]` landing page; the dynamic `[id]` namespace only contains the post-registration sub-routes (lobby, live, end).

Pages are organized into **route groups** — parenthesized folders that are invisible in the URL but provide independent layouts:

- `(public)/` — Viewer-facing pages (light luxury ivory theme)
- `(admin)/` — Admin dashboard (separate layout, future auth boundary)

Each group has its own `layout.tsx`. The root `src/app/layout.tsx` provides only `<html>`, `<body>`, and fonts.

| Route | Source File | Purpose |
|-------|-------------|---------|
| `/` | `src/app/(public)/page.tsx` | Single landing page for webinar ID `1` ("Mike是麥克"). Modal registration. Sections: Hero → Credibility → Problem → Benefits → Urgency. |
| `/demo` | `src/app/(public)/demo/page.tsx` | Demo/preview page |
| `/webinar/[id]/lobby` | `src/app/(public)/webinar/[id]/lobby/page.tsx` | Event lobby: unified layout with progress bar, webinar info, social proof (registration count), highlights, calendar card. Phase A (>30min): success banner, calendar emphasis. Phase B (≤30min): gold "即将开始" badge, prominent CTA button above countdown. Auto-redirects to live at T=0. |
| `/webinar/[id]/confirm` | Redirect stub → `/lobby` | Backward compatibility |
| `/webinar/[id]/waiting` | Redirect stub → `/lobby` | Backward compatibility |
| `/webinar/[id]/live` | `src/app/(public)/webinar/[id]/live/page.tsx` | Live room: video + 4-tab sidebar (Info/Viewers/Chat/Offers) + on-video CTA |
| `/webinar/[id]/end` | `src/app/(public)/webinar/[id]/end/page.tsx` | Dark sales page with purple CTA, social sharing, replay link |
| `/admin` | `src/app/(admin)/admin/page.tsx` | Admin panel (no auth in MVP) |

## Data Architecture

### Models (`src/lib/types.ts`)

| Interface | Key Fields | Notes |
|-----------|-----------|-------|
| `Webinar` | `id`, `title`, `videoUrl`, `duration`, `autoChat[]`, `ctaEvents[]`, `status`, `evergreen?`, `viewerPeakTarget?`, `viewerRampMinutes?`, `heroImageUrl?`, `promoImageUrl?`, `disclaimerText?`, `endPageSalesCopy?`, `endPageCtaText?`, `endPageCtaUrl?`, `endPageCtaColor?`, `sidebarDescription?` | Top-level entity. Embeds auto-chat and CTA arrays inline. Extended with landing/end/sidebar fields. Uses `evergreen` config for dynamic scheduling. Viewer simulation configured via `viewerPeakTarget` and `viewerRampMinutes`. |
| `EvergreenConfig` | `enabled`, `dailySchedule[]`, `immediateSlot{}`, `videoDurationMinutes`, `timezone`, `displaySlotCount` | Configures dynamic slot generation. Daily anchor times + immediate slot injection for perpetual urgency. |
| `EvergreenSlot` | `slotTime`, `type` | Computed session slot — either `'anchor'` (daily recurring) or `'immediate'` (dynamically injected). |
| `AutoChatMessage` | `id`, `timeSec`, `name`, `message` | Bot message triggered at video timestamp. |
| `CTAEvent` | `id`, `showAtSec`, `hideAtSec`, `buttonText`, `url`, `showCountdown`, `position?`, `color?`, `secondaryText?` | Promotional overlay with optional countdown. Supports on-video or below-video positioning. |
| `Registration` | `id`, `webinarId`, `name`, `email`, `phone?`, `assignedSlot?`, `slotExpiresAt?`, `reassignedFrom?` | One per email per webinar (duplicate check). Evergreen fields store computed slot times. |
| `ChatMessageData` | `id`, `webinarId`, `name`, `message`, `timestamp`, `createdAt` | Real user chat message. |

### Storage Layer (`src/lib/db.ts`)

JSON file-based. Files live in `/data` at project root:

- `data/webinars.json` — all webinar records
- `data/registrations.json` — all registrations
- `data/chat-messages.json` — real user chat messages

Key functions:
- `readJsonFile<T>(filename, default)` / `writeJsonFile<T>(filename, data)` — generic JSON I/O with `fs.readFileSync`/`writeFileSync`
- `generateId()` — `Date.now()-randomString` format
- `initializeSampleData()` — seeds a demo webinar if `webinars.json` is empty
- `getWebinarById(id)` — tries exact `id` match first, then treats numeric IDs as 1-based array index

### API Routes

Routes are split into **public** (read-only + user actions) and **admin** (write operations) namespaces. This enables future auth middleware via a single matcher on `/api/admin/:path*`.

#### Public Routes (`src/app/api/`)

| Endpoint | Methods | Source File | Notes |
|----------|---------|-------------|-------|
| `/api/webinar` | GET | `src/app/api/webinar/route.ts` | List all webinars |
| `/api/webinar/[id]` | GET | `src/app/api/webinar/[id]/route.ts` | Single webinar + `registrationCount` |
| `/api/webinar/[id]/chat` | GET, POST | `src/app/api/webinar/[id]/chat/route.ts` | GET/POST by webinar ID |
| `/api/register` | POST | `src/app/api/register/route.ts` | Checks duplicate email per webinar. Evergreen-aware: accepts `assignedSlot`, computes `slotExpiresAt`. |
| `/api/webinar/[id]/next-slot` | GET | `src/app/api/webinar/[id]/next-slot/route.ts` | Computes upcoming evergreen slots from config. Returns `slots[]`, `countdownTarget`, `expiresAt`. |
| `/api/webinar/[id]/reassign` | POST | `src/app/api/webinar/[id]/reassign/route.ts` | Reassigns a registered user to the next available slot (for missed sessions). |

#### Admin Routes (`src/app/api/admin/`)

| Endpoint | Methods | Source File | Notes |
|----------|---------|-------------|-------|
| `/api/admin/webinar` | GET, POST | `src/app/api/admin/webinar/route.ts` | List all / create new |
| `/api/admin/webinar/[id]` | GET, PUT, DELETE | `src/app/api/admin/webinar/[id]/route.ts` | Full CRUD, GET includes registrations |

### Utilities (`src/lib/utils.ts`)

- `formatDate`, `formatTime`, `formatDateTime` — `zh-CN` locale formatting
- `formatCountdown`, `getTimeUntil` — countdown math
- `generateICSContent` — calendar file generation
- `validateEmail`, `validatePhone` — phone accepts North American 10-digit format (with optional +1)
- `cn(...classes)` — className join helper (like `clsx`)
- `isYouTubeUrl(url)` — detects YouTube video URLs (youtube.com, youtu.be, embed)
- `getVideoSourceType(url)` — returns Video.js MIME type (`video/youtube`, `application/x-mpegURL`, or `video/mp4`)

## Component Architecture

### Video Sync System

The live room (`src/app/webinar/[id]/live/page.tsx`) orchestrates three systems synced to video playback time:

```
VideoPlayer.onTimeUpdate(currentTime)
    ├── ChatRoom — triggers autoChat at configured timeSec
    ├── CTAOverlay — shows/hides between showAtSec and hideAtSec
    └── ViewerSimulator — grows/shrinks viewer list following 3-phase attendance curve
```

### Viewer Count System (`src/lib/viewer-simulator.ts`)

The viewer count is **list-driven** — the displayed number equals the length of the simulated viewer list. No independent formula.

The `useViewerSimulator` hook manages a stateful name list following a 3-phase attendance curve tied to video playback time:

1. **Hot start** (t=0): Instantly loads ~35% of `peakTarget` viewers (30-40% with random variance). Auto-chat sender names are prioritized in the initial pool. No join messages generated for this initial batch.
2. **Ramp-up** (0 → `rampMinutes`): easeOutQuad growth from base (~35% of peak) to `peakTarget`, with ±8% organic jitter per tick (biased upward during ramp to avoid stalling)
3. **Plateau** (`rampMinutes` → 80% of duration): stable at peak with churn swaps and ±8% jitter for natural fluctuation
4. **Decline** (80% → 100%): linear drop to 60% of peak (floored at 30% of peak)

Key behaviors:
- **Hot start:** Users never enter an "empty room" — base viewers and auto-chat names are pre-loaded instantly
- **Organic jitter:** ±8% of peak per tick creates natural fluctuation (e.g., 58→62→57→63 instead of flat 60)
- **Chat-viewer sync:** Auto-chat sender names are always in the viewer list before their first message fires
- **Late join fast-forward:** When `initialTimeSec > 0`, computes snapshot at that point (floored at base count)
- **Auto-chat protection:** Names from auto-chat messages are protected from removal during ramp and plateau
- **Stable list:** Joins append to end, leaves remove from middle — no reshuffling
- **Cooldown:** Removed names wait 120s (video time) before becoming available again
- **Admin config:** `viewerPeakTarget` (peak count) and `viewerRampMinutes` (ramp time) per webinar

### Live Room Access Gate

The live page enforces timing-based access control via a client-side event state machine:

- **PRE_EVENT** (>30 min before start): Redirects to `/lobby`
- **PRE_SHOW** (<=30 min, before start): Shows PreShowOverlay in video area, rest of live room visible
- **LIVE** (after start): VideoPlayer with muted autoplay + UnmuteOverlay
- **ENDED** (after video duration): Redirects to `/end`

The `replay=true` query parameter bypasses all gates (used by the end page replay link).

### Components

| Component | Source | Role |
|-----------|--------|------|
| `VideoPlayer` | `src/components/video/VideoPlayer.tsx` | Video.js + HLS.js player. **YouTube support** via `videojs-youtube` plugin. Dynamically imported (no SSR). **Seeking disabled** — blocks scrubbing, arrow keys, Home/End. Emits `onTimeUpdate`. Supports `initialTime` prop for late-join video seeking. `livestreamMode` prop hides controls and enables muted autoplay. |
| `ChatRoom` | `src/components/chat/ChatRoom.tsx` | Displays auto-chat messages at configured timestamps (with randomized variance). Accepts real user messages via API polling. Supports `initialTime` prop for late-join chat backfill. |
| `MissedSessionPrompt` | `src/components/evergreen/MissedSessionPrompt.tsx` | Shows missed session message with countdown to next slot and reassignment button. |
| `CTAOverlay` | `src/components/cta/CTAOverlay.tsx` | Promotional overlay with `position` support (`on_video`/`below_video`), configurable `color`, and `secondaryText`. |
| `CountdownTimer` | `src/components/countdown/CountdownTimer.tsx` | Countdown to session start time with `onComplete` callback. |
| `RegistrationModal` | `src/components/registration/RegistrationModal.tsx` | Full-screen modal overlay for registration. Triggered by landing page CTAs. |
| `SidebarTabs` | `src/components/sidebar/SidebarTabs.tsx` | 4-tab container (Info/Viewers/Chat/Offers) for live room sidebar. Dark theme. |
| `InfoTab` | `src/components/sidebar/InfoTab.tsx` | Webinar info tab: promo image, speaker info, description. |
| `ViewersTab` | `src/components/sidebar/ViewersTab.tsx` | Renders the simulated viewer list from `useViewerSimulator` hook. Shows host badge, current user, and active viewers. |
| `OffersTab` | `src/components/sidebar/OffersTab.tsx` | Time-based offer cards that activate with CTA events. |
| `UnmuteOverlay` | `src/components/video/UnmuteOverlay.tsx` | Click-to-unmute overlay for muted autoplay compliance. Shows over video when audio is muted. |
| `PreShowOverlay` | `src/components/video/PreShowOverlay.tsx` | Pre-event countdown shown in the video area for users who enter the live room before the event starts (within 30 min gate). |
| `JoinOverlay` | `src/components/live/JoinOverlay.tsx` | Pre-playback overlay: "connecting..." → "ready to join" transition. |
| `BottomBar` | `src/components/live/BottomBar.tsx` | Fixed bottom bar: title, date, LIVE badge, viewer count. |

### UI Library (`src/components/ui/`)

Shared primitives:
- `Button.tsx` — styled button component
- `Badge.tsx` — status/tag badges
- `Input.tsx` — form input
- `Card.tsx` — content card container

## Design System

Defined in `src/styles/design-tokens.css` as CSS custom properties.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#FAFAF7` | Warm ivory page background |
| `--color-surface` | `#FFFFFF` | Card/panel background |
| `--color-surface-elevated` | `#F5F5F0` | Elevated surfaces |
| `--color-border` | `#E8E5DE` | Warm default borders |
| `--color-text` | `#1A1A1A` | Primary text |
| `--color-text-secondary` | `#6B6B6B` | Secondary text |
| `--color-gold` | `#B8953F` | Deep gold accent — CTAs, highlights, focus rings |
| `--color-gold-dim` | `rgba(184,149,63,0.08)` | Gold tint backgrounds |
| `--color-live` | `#ef4444` | Live indicator red |

- **Fonts:** Geist Sans / Geist Mono (via Next.js font loading)
- **Radii:** Subtle editorial — `2px` / `4px` / `8px`
- **Aesthetic:** Light, minimal, editorial. Warm ivory base. Deep gold accent for CTAs.

## Evergreen Countdown System

The evergreen system dynamically generates session slots so visitors always see a webinar starting soon. Core logic lives in `src/lib/evergreen.ts`.

### Slot Generation

Two slot types work together:
- **Anchor slots** — Admin-configured daily recurring times (e.g., 8:00 AM, 9:00 PM). Creates realistic schedule appearance.
- **Immediate slots** — Dynamically injected when the next anchor is too far away (> `maxWaitMinutes`). Snaps to round clock boundaries (:00, :15, :30, :45).

`generateEvergreenSlots(config)` produces a sorted list of upcoming slots for display.

### User State Machine

```
FIRST_VISIT → assign slot → PRE_REG → register → CONFIRMED → slot time → LIVE → video ends → MISSED
                                                                                              ↓
                                                                               "预约下一场" → CONFIRMED (new slot)
```

State determined by `getEvergreenState(assignedSlot, expiresAt, registered)` in `src/lib/evergreen.ts`.

### Late Join

When a user enters after their slot started but before it expired (slot + video duration):
- **Video**: Seeks to `(now - slotTime)` seconds via `initialTime` prop on `VideoPlayer`
- **Chat**: Backfills all auto-chat messages with `timeSec <= elapsedSeconds` (rendered without animation)
- **CTAs**: Follow video position as normal (no change needed)

### Sticky Session (Client-Side)

`localStorage` key `webinar-{id}-evergreen` stores: `{ visitorId, assignedSlot, expiresAt, registered, registrationId }`. Ensures consistent countdown across page refreshes.

### Admin Configuration

The admin panel (`WebinarForm.tsx`) exposes evergreen settings: daily anchor times, immediate slot interval/buffer/trigger threshold, timezone, and display slot count. Evergreen is always enabled (the `Session` type was removed).

## Key Constraints

1. **No video seeking** — Business requirement. VideoPlayer blocks scrubbing, keyboard seeks, and programmatic seeking. Not a bug.
2. **No WebSocket** — Chat uses auto-chat messages + API polling. Socket.io planned for production.
3. **No authentication** — Admin panel is open. Auth planned for production.
4. **North American Chinese locale** — Phone validation: US/Canada 10-digit format. Date formatting: `zh-CN` locale.
5. **i18n required** — All UI text must use translation keys, never hardcoded strings.
6. **Unsplash images** — `next.config.ts` allows remote images from `*.unsplash.com`.
7. **Dynamic video import** — Video.js imported client-side only to avoid SSR issues.

## Known Gaps vs SPEC.md

Modules defined in SPEC.md but **not yet implemented**:

- **Picture-in-Picture (PiP)** — Floating mini-player when scrolling
- **WebSocket real-time chat** — Currently simulated with polling + auto-chat
- **Polls / Q&A** — Interactive engagement features
- **Email reminders** — Pre-webinar notification system
- **Advanced admin** — Full CRUD dashboard, analytics, session management
- **Social sharing OG tags** — Share buttons added to end page, but OG meta tags not yet implemented
- **Multi-language support** — Currently zh-CN only, no language switcher
- **Recording/replay** — Post-live replay functionality
