# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A "pseudo-live" webinar platform MVP — plays pre-recorded video with real-time interactive features (auto-chat, CTA overlays, viewer count simulation) to create a live-stream experience. Built for the 北美華人 (North American Chinese) market; UI text is Simplified Chinese (zh-CN).

Reference platform: JoinLive (live.yongmingu.com)

## Workflow Rules
1. Read the codebase before modifying. Think through the problem first.
2. **Check in with me before major changes.** I will verify the plan.
3. Give high-level explanations of what you changed at each step.
4. Keep changes minimal and simple. Every change should impact as little code as possible.
5. **Maintain `docs/architecture.md`** — the living architecture document. When you make structural changes (new routes, components, data model changes, API changes), update the relevant section before finishing. Hooks will remind and enforce this.
6. **Never treat existing documentation or code definitions as proof of runtime behavior.** Verify by checking call sites and imports, not just definitions. Grep for actual usage.
7. Explain things in a beginner-friendly manner.
8. **IMPORTANT: All UI text must be internationalized.** Use translation keys, never hardcoded strings. See the `i18n` skill for details.
9. **Record non-obvious decisions** in `docs/decisions.md`. When choosing between alternatives, append: date, decision, and why. Keep entries to 3-5 lines.
To prevent inaccuracies caused by outdated training data, you are required to use web search tools when writing code for specific models. Always cross-reference parameters and implementation details with the most recent official documentation to accommodate the ever-changing nature of AI APIs.


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
- **Database:** JSON files in `/data` directory (MVP only, production target is PostgreSQL)
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
- `src/components/` — Reusable components organized by feature (`video/`, `chat/`, `cta/`, `countdown/`, `ui/`)
- `src/lib/` — Core utilities: `types.ts` (all TypeScript interfaces), `db.ts` (JSON database layer), `utils.ts` (date formatting, validation, `cn()` classname helper)
- `src/styles/` — `design-tokens.css` with CSS custom properties
- `data/` — Runtime JSON database files (webinars.json, registrations.json, chat-messages.json)
- `docs/` — PM specification documents (Chinese)

### API Routes

All under `src/app/api/`:
- `webinar/route.ts` — GET (list) / POST (create)
- `webinar/[id]/route.ts` — GET / PUT / DELETE
- `webinar/[id]/chat/route.ts` — GET (requires `sessionId` query param) / POST
- `register/route.ts` — POST (checks duplicate email per webinar)

### Database Layer (`src/lib/db.ts`)

JSON file-based storage with `readJsonFile`/`writeJsonFile` helpers. Auto-initializes sample data on first run. All CRUD functions are synchronous `fs` operations. The `generateId()` function uses timestamp + random string.

### Component Synchronization

The live room ties together three time-synced systems driven by video playback position:
- **VideoPlayer** — Video.js player with seeking disabled (anti-skip). Emits `onTimeUpdate` callbacks.
- **ChatRoom** — Displays auto-chat messages triggered at configured `timeSec` values (with randomized variance). Also accepts real user messages.
- **CTAOverlay** — Shows promotional overlay between `showAtSec` and `hideAtSec` with optional countdown timer.

### Data Models

All types are in `src/lib/types.ts`. Key interfaces: `Webinar`, `Session`, `AutoChatMessage`, `CTAEvent`, `Registration`, `ChatMessageData`.

A `Webinar` contains embedded arrays of `sessions`, `autoChat`, and `ctaEvents` — these are stored inline, not as separate collections.

## Design System

- Light luxury theme: warm ivory background (`#FAFAF7`), dark text (`#1A1A1A`)
- Neutral palette defined in `src/styles/design-tokens.css` (surface `#FFFFFF`, border `#E8E5DE`)
- Deep gold accent color: `#B8953F` (used for CTAs and highlights in globals.css)
- Fonts: Geist Sans / Geist Mono (loaded via Next.js)
- Minimal editorial aesthetic — warm ivory base, avoid decorative elements

## Important Constraints

- **No video seeking:** VideoPlayer intentionally blocks seeking, arrow keys, Home/End. This is a business requirement, not a bug.
- **No WebSocket yet:** Chat is simulated via auto-chat messages and polling. Socket.io integration is planned.
- **No auth:** Admin panel has no authentication in MVP.
- **North American Chinese locale:** Phone validation accepts US/Canada 10-digit format. Date formatting uses `zh-CN` locale.
- **Unsplash images:** `next.config.ts` allows remote images from `*.unsplash.com`.

## Spec Documents

- `SPEC.md` — Full PM specification (Chinese, ~36KB) covering all modules, flows, and planned features
- `api-spec.md` — API endpoint specification with request/response examples
- `AGENTS.md` — Tech stack decisions and MVP scope summary

## Documentation

Living documentation system — hooks enforce freshness automatically.

- `docs/architecture.md` — How the system works (auto-maintained via hooks)
- `docs/decisions.md` — Append-only architectural decision log
- `SPEC.md` — PM specification (frozen reference)
- `api-spec.md` — API design reference

**Hooks:** PostToolUse hook (`.claude/hooks/doc-update-check.sh`) reminds on file changes in critical paths. Stop hook verifies documentation freshness before turn ends.

**Rule:** Don't duplicate across documents. CLAUDE.md has the summary; `docs/architecture.md` has the details.
