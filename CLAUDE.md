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
9. **Record non-obvious decisions** in `docs/decisions.md`. When choosing between alternatives, append: date, decision, and why. Keep entries to 3-5 lines.
10. To prevent inaccuracies caused by outdated training data, you are required to use web search tools when writing code for specific models. Always cross-reference parameters and implementation details with the most recent official documentation to accommodate the ever-changing nature of AI APIs.
11. 请使用第一性原理思考。你不能总是假设我非常清楚自己想要什么和该怎么得到。请保持审慎，从原始需求和问题出发，如果动机和目标不清晰，停下来和我讨论。如果目标清晰但是路径不是最短，告诉我，并且建议更好的办法
## Commands

```bash
npm run dev      # Dev server on localhost:3000
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

No test framework is configured yet.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 (PostCSS plugin, `@import "tailwindcss"` syntax)
- **Video:** Video.js + HLS.js (dynamically imported — no SSR)
- **Database:** Supabase (hosted Postgres) via `@supabase/supabase-js` — service role key, server-side only
- **Path alias:** `@/*` → `./src/*`

## Architecture

### User Journey (page flow)

```
Landing Page → Registration → Lobby → Live Room → End
/              (modal)         /webinar/[id]/lobby  /webinar/[id]/live  /webinar/[id]/end
```

The root `/` is the only landing page, hardcoded for webinar ID `1` ("Mike是麥克"). There is no `/webinar/[id]` landing page — the `[id]` namespace only contains post-registration sub-routes (lobby, live, end).

### Key Directories

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — Reusable components organized by feature (`video/`, `chat/`, `cta/`, `countdown/`, `ui/`, `analytics/`, `evergreen/`, `live/`, `registration/`, `sidebar/`, `subtitles/`)
- `src/lib/` — Core utilities: `types.ts` (all TypeScript interfaces), `db.ts` (Supabase CRUD layer), `supabase.ts` (client init), `utils.ts` (date formatting, validation, `cn()`), `email.ts` (SendGrid templates), `tracking.ts` (event tracking + GA4 dual-fire), `analytics.ts` (typed GA4 helper), `chat-broker.ts` (SSE pub/sub singleton), `evergreen.ts` (slot generation), `viewer-simulator.ts` (simulated viewer list hook), `stripe.ts` (Stripe client), `r2.ts` (Cloudflare R2 client), `video-upload.ts` (client-side upload orchestration), `activation-codes.ts` (code generation)
- `src/styles/` — `design-tokens.css` with CSS custom properties
- `data/` — Legacy JSON files (pre-Supabase migration artifacts, not used at runtime)
- `docs/` — PM specification documents (Chinese)

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
- `track/route.ts` — POST (event tracking)
- `subtitles/generate/route.ts` — POST (subtitle generation)
- `subtitles/logs/route.ts` — GET (subtitle logs)
- `cron/reminders/route.ts` — GET (email reminder cron)

**Admin (protected by middleware):**
- `admin/login/route.ts` — POST (authenticate)
- `admin/logout/route.ts` — POST (clear session)
- `admin/webinar/route.ts` — GET / POST (list/create)
- `admin/webinar/[id]/route.ts` — GET / PUT / DELETE (full CRUD)
- `admin/videos/route.ts` — GET / POST (video library, R2 presigned upload)
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

## Important Constraints

- **No video seeking:** VideoPlayer intentionally blocks seeking, arrow keys, Home/End. This is a business requirement, not a bug.
- **No WebSocket yet:** Chat is simulated via auto-chat messages and polling. Socket.io integration is planned.
- **Admin password auth:** `ADMIN_PASSWORD` env var + HMAC-signed cookie session (24h expiry). Middleware at `src/middleware.ts` protects `/admin/*` and `/api/admin/*`. Login page at `/admin/login`.
- **North American Chinese locale:** Phone validation accepts US/Canada 10-digit format. Date formatting uses `zh-CN` locale.
- **Unsplash images:** `next.config.ts` allows remote images from `*.unsplash.com`.

## Spec Documents

- `SPEC.md` — Full PM specification (Chinese, ~36KB) covering all modules, flows, and planned features
- `api-spec.md` — API endpoint specification with request/response examples
- `AGENTS.md` — Tech stack decisions and MVP scope summary (legacy reference)

## Documentation

Living documentation system — hooks enforce freshness automatically.

- `docs/architecture.md` — How the system works (auto-maintained via hooks)
- `docs/decisions.md` — Append-only architectural decision log
- `SPEC.md` — PM specification (frozen reference)
- `api-spec.md` — API design reference

**Hooks:** PostToolUse hook (`.claude/hooks/doc-update-check.sh`) reminds on file changes in critical paths. Stop hook verifies documentation freshness before turn ends.

**Rule:** Don't duplicate across documents. CLAUDE.md has the summary; `docs/architecture.md` has the details.
