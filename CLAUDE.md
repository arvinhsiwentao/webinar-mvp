# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A "pseudo-live" webinar platform MVP — plays pre-recorded video with real-time interactive features (auto-chat, CTA overlays, viewer count simulation) to create a live-stream experience. Built for the 北美華人 (North American Chinese) market; UI text is Simplified Chinese (zh-CN).
All of your functionality should be designed specific for users to think this is an actual livestream instead of a fake on. Relentlessly analyse your design for this goal and reiterate your design if you spot anything that hinters this criteria. 
Reference platform: JoinLive (live.yongmingu.com)

## Workflow Rules
1. Read the codebase before modifying. Think through the problem first.
2. **Check in with me before major changes.** I will verify the plan.
3. Give high-level explanations of what you changed at each step.
4. Keep changes minimal and simple. Every change should impact as little code as possible.
5. **Maintain `docs/architecture.md`** — the living architecture document. When you make structural changes (new routes, components, data model changes, API changes), update the relevant section before finishing. Hooks will remind and enforce this.
6. **Never treat existing documentation or code definitions as proof of runtime behavior.** Verify by checking call sites and imports, not just definitions. Grep for actual usage.
7. Explain things in a beginner-friendly manner.
8. **Record non-obvious decisions** in `docs/decisions.md`. When choosing between alternatives, append: date, decision, and why. Keep entries to 3-5 lines.
9. To prevent inaccuracies caused by outdated training data, you are required to use web search tools when writing code for specific models. Always cross-reference parameters and implementation details with the most recent official documentation to accommodate the ever-changing nature of AI APIs.
10. 请使用第一性原理思考。你不能总是假设我非常清楚自己想要什么和该怎么得到。请保持审慎，从原始需求和问题出发，如果动机和目标不清晰，停下来和我讨论。如果目标清晰但是路径不是最短，告诉我，并且建议更好的办法
11. 使用繁體中文寫文件

## Principles to Follow
This application simulates a live streaming experience using prerecorded videos. All video playback must strictly preserve the illusion of a live broadcast at all times.
Enforce the following without exception:
- ❌ Never display the total/full duration of any video.
- ❌ Never allow users to seek or drag the progress bar beyond the current live playhead position.
- ✅ Progress should only reflect elapsed time since the stream "started", not the video's actual length.
- ✅ Treat every playback interaction as if it were a real-time live feed — no skipping ahead, no revealing future content.

# Commands

```bash
npm run dev      # Dev server on localhost:3000
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

## Testing

```bash
npm test         # Subtitle pipeline tests (tsx --test)
```

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 (PostCSS plugin, `@import "tailwindcss"` syntax)
- **Video:** Video.js + HLS.js (dynamically imported — no SSR)
- **Database:** Supabase (hosted Postgres) via `@supabase/supabase-js` — service role key, server-side only
- **Path alias:** `@/*` → `./src/*`

## Architecture

### User Journey (page flow)

```
Landing Page → Registration → Confirm → Waiting/Lobby → Live Room → End
/              (modal)         /webinar/[id]/confirm  /webinar/[id]/lobby  /webinar/[id]/live  /webinar/[id]/end
                                                      /webinar/[id]/waiting (pre-start gate)

Additional routes: /checkout/[webinarId] (Stripe checkout), /checkout/[webinarId]/return, /demo
```

The root `/` is the only landing page, hardcoded for webinar ID `1` ("Mike是麥克"). There is no `/webinar/[id]` landing page — the `[id]` namespace only contains post-registration sub-routes (lobby, live, end).

### Key Directories

- `src/app/` — Next.js App Router pages and API routes, organized by route groups: `(public)/` (visitor-facing) and `(admin)/` (admin panel)
- `src/components/` — Reusable components organized by feature (`video/`, `chat/`, `cta/`, `countdown/`, `ui/`, `analytics/`, `evergreen/`, `live/`, `registration/`, `sidebar/`, `subtitles/`)
- `src/lib/` — Core utilities: `types.ts` (all TypeScript interfaces), `db.ts` (Supabase CRUD layer), `supabase.ts` (client init), `utils.ts` (date formatting, validation, `cn()`), `email.ts` (SendGrid templates), `analytics.ts` (typed GA4 helper), `chat-broker.ts` (SSE pub/sub singleton), `evergreen.ts` (slot generation), `viewer-simulator.ts` (simulated viewer list hook), `stripe.ts` (Stripe client), `video-upload.ts` (Mux Direct Upload + UpChunk orchestration), `google-sheets.ts` (Google Sheets activation code claiming), `mux.ts` (Mux API client), `fulfillment.ts` (order fulfillment logic), `timezone.ts` (timezone utilities)
- `src/styles/` — `design-tokens.css` with CSS custom properties
- `docs/` — Architecture docs, decision log, and archived plan documents (Chinese)

### API Routes

All under `src/app/api/`:

**Public:**
- `webinar/route.ts` — GET (list all)
- `webinar/[id]/route.ts` — GET (single + registrationCount)
- `webinar/[id]/chat/route.ts` — GET / POST (messages by webinar)
- `webinar/[id]/chat/stream/route.ts` — GET (SSE real-time stream)
- `webinar/[id]/next-slot/route.ts` — GET (evergreen slot computation)
- `webinar/[id]/reassign/route.ts` — POST (reassign missed session)
- `register/route.ts` — POST (duplicate email check, evergreen-aware)
- `checkout/create-session/route.ts` — POST (Stripe Embedded Checkout)
- `checkout/session-status/route.ts` — GET (poll Stripe session)
- `checkout/webhook/route.ts` — POST (Stripe webhook fulfillment)
- `subtitles/generate/route.ts` — POST (subtitle generation)
- `subtitles/logs/route.ts` — GET (subtitle logs)
- `cron/reminders/route.ts` — GET (email reminder cron, CRON_SECRET protected)
- `cron/orders-sync/route.ts` — GET (daily orders → Google Sheets sync, CRON_SECRET protected)

**Admin (protected by middleware):**
- `admin/login/route.ts` — POST (authenticate)
- `admin/logout/route.ts` — POST (clear session)
- `admin/webinar/route.ts` — GET / POST (list/create)
- `admin/webinar/[id]/route.ts` — GET / PUT / DELETE (full CRUD)
- `admin/videos/route.ts` — GET / POST (video library, Mux Direct Upload)
- `admin/videos/[id]/route.ts` — PATCH / DELETE (update/delete video)

### Database Layer (`src/lib/db.ts`)

Supabase-backed async CRUD functions with automatic snake_case (DB) ↔ camelCase (TypeScript) mapping. Client initialized in `src/lib/supabase.ts` with lazy-init proxy. Tables: `webinars`, `registrations`, `chat_messages`, `orders`, `events`, `video_files`. Nested arrays (autoChat, ctaEvents, etc.) stored as JSONB columns.

### Component Synchronization

The live room ties together three time-synced systems driven by video playback position:
- **VideoPlayer** — Video.js player with seeking disabled (anti-skip). Emits `onTimeUpdate` callbacks.
- **ChatRoom** — Displays auto-chat messages triggered at configured `timeSec` values (with randomized variance). Also accepts real user messages.
- **CTAOverlay** — Shows promotional overlay between `showAtSec` and `hideAtSec` with optional countdown timer.

### Data Models

All types are in `src/lib/types.ts`. Key interfaces: `Webinar`, `EvergreenConfig`, `AutoChatMessage`, `CTAEvent`, `Registration`, `ChatMessageData`, `Order`, `VideoFile`, `WebinarSubtitleCue`.

A `Webinar` contains embedded arrays of `autoChat` and `ctaEvents` — stored inline, not as separate collections. Scheduling uses the evergreen system exclusively (no static sessions).

## Design System

- Light luxury theme: warm ivory background (`#FAFAF7`), dark text (`#1A1A1A`)
- Neutral palette defined in `src/styles/design-tokens.css` (surface `#FFFFFF`, border `#E8E5DE`)
- Deep gold accent color: `#B8953F` (used for CTAs and highlights in globals.css)
- Fonts: Geist Sans / Geist Mono (loaded via Next.js)
- Minimal editorial aesthetic — warm ivory base, avoid decorative elements

## Deployment

- **Platform:** Zeabur (zeabur.com) — containerized deployment (not serverless)
- **Build:** Zeabur auto-detects Next.js via zbpack, builds a Docker container image
- **Runtime:** Persistent Node.js process (long-lived container, not ephemeral functions)
- **Implication:** No serverless timeout limits; `node-cron` and in-process schedulers work because the process stays alive
- **No `vercel.json`:** Zeabur does not support Vercel-specific config. Cron scheduling requires either in-process scheduler or external HTTP cron service.
- **Env vars:** Configured in Zeabur dashboard for production

## Important Constraints

- **No video seeking:** VideoPlayer intentionally blocks seeking, arrow keys, Home/End. This is a business requirement, not a bug.
- **No WebSocket yet:** Chat is simulated via auto-chat messages and polling. Socket.io integration is planned.
- **Admin password auth:** `ADMIN_PASSWORD` env var + HMAC-signed cookie session (24h expiry). Middleware at `src/middleware.ts` protects `/admin/*` and `/api/admin/*`. Login page at `/admin/login`.
- **North American Chinese locale:** Phone validation accepts US/Canada 10-digit format. Date formatting uses `zh-CN` locale.
- **Remote images:** `next.config.ts` allows remote images from `*.unsplash.com` and `image.mux.com`.

## Spec Documents

- `docs/plans/08_Webinar完整規格書_PM版.md` — Full PM specification (Chinese)
- Archived plan documents in `docs/plans/` (dated by feature)

## Documentation

Living documentation system — hooks enforce freshness automatically.

- `docs/architecture.md` — How the system works (auto-maintained via hooks)
- `docs/decisions.md` — Append-only architectural decision log
- `docs/plans/08_Webinar完整規格書_PM版.md` — PM specification (frozen reference)

**Hooks:** PostToolUse hook (`.claude/hooks/doc-update-check.sh`) reminds on file changes in critical paths. Stop hook verifies documentation freshness before turn ends.

**Rule:** Don't duplicate across documents. CLAUDE.md has the summary; `docs/architecture.md` has the details.
