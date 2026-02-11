# Architecture

> Last verified: 2026-02-11

Living document. Hooks remind Claude to keep this current when structural changes are made.

## System Overview

Simulive (simulated-live) webinar platform. A pre-recorded video plays on a schedule while interactive features — auto-chat, CTA overlays, viewer count — create the feel of a live broadcast. Built for the Taiwan market (Traditional Chinese, zh-TW locale). The MVP uses JSON file storage and polling; production targets PostgreSQL and WebSocket.

## Page Flow & Routing

```
Landing Page  →  Registration  →  Confirm  →  Waiting Room  →  Live Room
/                (inline form)    /webinar/[id]  /webinar/[id]   /webinar/[id]/live
                                  (redirect)     (countdown)
```

| Route | Source File | Purpose |
|-------|-------------|---------|
| `/` | `src/app/page.tsx` | Hardcoded landing for webinar ID `1` ("Mike是麥克"). Registration form inline. |
| `/demo` | `src/app/demo/page.tsx` | Demo/preview page |
| `/webinar/[id]` | `src/app/webinar/[id]/page.tsx` | Webinar detail / registration entry point |
| `/webinar/[id]/confirm` | `src/app/webinar/[id]/confirm/page.tsx` | Post-registration confirmation with calendar download |
| `/webinar/[id]/waiting` | `src/app/webinar/[id]/waiting/page.tsx` | Pre-show countdown timer |
| `/webinar/[id]/live` | `src/app/webinar/[id]/live/page.tsx` | Live room: video + chat + CTA |
| `/admin` | `src/app/admin/page.tsx` | Admin panel (no auth in MVP) |

## Data Architecture

### Models (`src/lib/types.ts`)

| Interface | Key Fields | Notes |
|-----------|-----------|-------|
| `Webinar` | `id`, `title`, `videoUrl`, `duration`, `sessions[]`, `autoChat[]`, `ctaEvents[]`, `status` | Top-level entity. Embeds sessions, auto-chat, and CTA arrays inline. |
| `Session` | `id`, `startTime`, `status` | Scheduled broadcast slot within a webinar. |
| `AutoChatMessage` | `id`, `timeSec`, `name`, `message` | Bot message triggered at video timestamp. |
| `CTAEvent` | `id`, `showAtSec`, `hideAtSec`, `buttonText`, `url`, `showCountdown` | Promotional overlay with optional countdown. |
| `Registration` | `id`, `webinarId`, `sessionId`, `name`, `email`, `phone?` | One per email per webinar (duplicate check). |
| `ChatMessageData` | `id`, `webinarId`, `sessionId`, `name`, `message`, `timestamp`, `createdAt` | Real user chat message. |

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

All under `src/app/api/`:

| Endpoint | Methods | Source File | Notes |
|----------|---------|-------------|-------|
| `/api/webinar` | GET, POST | `src/app/api/webinar/route.ts` | List all / create new |
| `/api/webinar/[id]` | GET, PUT, DELETE | `src/app/api/webinar/[id]/route.ts` | Single webinar CRUD |
| `/api/webinar/[id]/chat` | GET, POST | `src/app/api/webinar/[id]/chat/route.ts` | GET requires `sessionId` query param |
| `/api/register` | POST | `src/app/api/register/route.ts` | Checks duplicate email per webinar |

### Utilities (`src/lib/utils.ts`)

- `formatDate`, `formatTime`, `formatDateTime` — `zh-TW` locale formatting
- `formatCountdown`, `getTimeUntil` — countdown math
- `generateICSContent` — calendar file generation
- `validateEmail`, `validatePhone` — phone expects Taiwan `09xxxxxxxx` format
- `cn(...classes)` — className join helper (like `clsx`)
- `isYouTubeUrl(url)` — detects YouTube video URLs (youtube.com, youtu.be, embed)
- `getVideoSourceType(url)` — returns Video.js MIME type (`video/youtube`, `application/x-mpegURL`, or `video/mp4`)

## Component Architecture

### Video Sync System

The live room (`src/app/webinar/[id]/live/page.tsx`) orchestrates three systems synced to video playback time:

```
VideoPlayer.onTimeUpdate(currentTime)
    ├── ChatRoom — triggers autoChat at configured timeSec
    └── CTAOverlay — shows/hides between showAtSec and hideAtSec
```

### Components

| Component | Source | Role |
|-----------|--------|------|
| `VideoPlayer` | `src/components/video/VideoPlayer.tsx` | Video.js + HLS.js player. **YouTube support** via `videojs-youtube` plugin — detects YouTube URLs and uses YouTube iframe tech under Video.js's unified API. Supports `youtube.com/watch?v=`, `youtu.be/`, and `youtube.com/embed/` formats. Dynamically imported (no SSR). **Seeking disabled** — blocks scrubbing, arrow keys, Home/End. Emits `onTimeUpdate`. |
| `ChatRoom` | `src/components/chat/ChatRoom.tsx` | Displays auto-chat messages at configured timestamps (with randomized variance). Accepts real user messages via API polling. |
| `CTAOverlay` | `src/components/cta/CTAOverlay.tsx` | Promotional overlay shown between `showAtSec`–`hideAtSec`. Optional countdown timer. |
| `CountdownTimer` | `src/components/countdown/CountdownTimer.tsx` | Waiting room countdown to session start time. |

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
| `--color-bg` | `#0a0a0a` | Page background |
| `--color-surface` | `#141414` | Card/panel background |
| `--color-surface-elevated` | `#1a1a1a` | Elevated surfaces |
| `--color-border` | `#262626` | Default borders |
| `--color-text` | `#fafafa` | Primary text |
| `--color-text-secondary` | `#a3a3a3` | Secondary text |
| `--color-gold` | `#C9A962` | Accent — CTAs, highlights, focus rings |
| `--color-gold-dim` | `rgba(201,169,98,0.15)` | Gold tint backgrounds |
| `--color-live` | `#ef4444` | Live indicator red |

- **Fonts:** Geist Sans / Geist Mono (via Next.js font loading)
- **Radii:** Subtle editorial — `2px` / `4px` / `8px`
- **Aesthetic:** Dark, minimal, editorial. No decorative elements. Gold accent for CTAs.

## Key Constraints

1. **No video seeking** — Business requirement. VideoPlayer blocks scrubbing, keyboard seeks, and programmatic seeking. Not a bug.
2. **No WebSocket** — Chat uses auto-chat messages + API polling. Socket.io planned for production.
3. **No authentication** — Admin panel is open. Auth planned for production.
4. **Taiwan locale** — Phone validation: `09xxxxxxxx`. Date formatting: `zh-TW` locale with Chinese weekdays.
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
- **Viewer count simulation** — Fake concurrent viewer display
- **Social sharing** — Share buttons and OG tags
- **Multi-language support** — Currently zh-TW only, no language switcher
- **Recording/replay** — Post-live replay functionality
