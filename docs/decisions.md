# Architectural Decisions

Append-only log. When choosing between alternatives, add an entry below.

Format: `### YYYY-MM-DD: Title` + what was decided and why (3-5 lines max).

---

### 2025-01: Next.js App Router over Pages Router

Chose App Router (Next.js 16) for server components, nested layouts, and the modern routing convention. Pages Router is legacy at this point, and App Router's file-based routing maps naturally to the webinar flow.

### 2025-01: JSON files over SQLite for MVP storage

JSON files in `/data` with synchronous `fs` read/write. Simpler than SQLite — no driver dependencies, no migrations, trivially inspectable. Acceptable for single-server MVP with low concurrency. Production target is PostgreSQL.

### 2025-01: Video.js + HLS.js for video playback

Video.js provides a mature player with plugin ecosystem. HLS.js handles adaptive bitrate streaming. Both are dynamically imported to avoid SSR issues. Alternative (Plyr) had weaker HLS support.

### 2025-01: Tailwind CSS v4 with design tokens

Tailwind v4 via PostCSS plugin with `@import "tailwindcss"` syntax. Design tokens defined as CSS custom properties in `src/styles/design-tokens.css` rather than extending Tailwind config — keeps the token layer framework-agnostic.

### 2025-01: Seeking disabled as business requirement

The simulive model requires viewers to watch linearly (no skipping ahead) to maintain the "live" illusion and ensure CTA/chat timing works. VideoPlayer blocks scrubbing, arrow keys, and programmatic seeks. This is intentional, not a bug.

### 2026-02-11: YouTube video support via videojs-youtube plugin

**Decision:** Use `videojs-youtube` Video.js tech plugin instead of raw iframe embed.

**Why:** Preserves the unified Video.js player API so that seeking prevention, `onTimeUpdate` callbacks (for auto-chat and CTA sync), and playback event tracking all continue to work without separate YouTube-specific code paths. The alternative (raw iframe) would have required reimplementing all time-synced features.

### 2026-02-24: Evergreen countdown — hybrid schedule approach

**Decision:** Use daily anchor times + immediate slot injection instead of pure interval-based or pure fixed scheduling.

**Why:** Pure intervals (every 15 min) look unrealistic — real webinars don't run every 15 minutes. Pure anchor times (2-3/day) create long waits with no urgency. The hybrid approach shows immediate urgency via injected slots while displaying a realistic daily schedule via anchor times. Immediate slots only appear when the next anchor is > `maxWaitMinutes` away. Server-side calculation prevents clock manipulation.

**Alternatives rejected:** (1) Fixed intervals only — too frequent, looks fake. (2) Anchor times only — max wait could be hours. (3) Client-side calculation — vulnerable to clock manipulation.

### 2026-02: Self-sustaining documentation system

Added `docs/architecture.md` (living architecture doc) and `docs/decisions.md` (this file). Claude Code hooks (PostToolUse + Stop) automatically remind and enforce documentation updates when structural changes are made. Goal: reduce doc drift without manual discipline.

### 2026-02-24: Merge Confirm + Waiting into Event Lobby

Merged the Confirmation Page (`/confirm`) and Waiting Room (`/waiting`) into a single Event Lobby (`/lobby`). The two pages had duplicate functionality (countdown, calendar buttons, data fetching). The lobby uses a two-phase UI: celebration mode (>30 min) and urgency mode (<=30 min). Old routes become redirect stubs for backward compatibility with bookmarks and sent emails.

### 2026-02-25: Remove Session (场次) system — evergreen-only scheduling

**Decision:** Deleted the `Session` type, `sessions[]` array, `sessionId` field, and all `isEvergreen` conditional branches. Evergreen is now the sole (implicit) scheduling mode.

**Why:** Sessions were dead code — all user flows ran through evergreen. The static session dates (Feb 9-11) were in the past, and disabling evergreen broke registration, lobby, and live. Two components (`SessionSelector.tsx`, `DateCards.tsx`) had zero imports. Removing ~200 lines of unused branching simplifies every page and API route.

### 2026-02-25: Viewer count redesign — list-driven simulation

**Decision:** Replaced the independent viewer count formula (`base + real × multiplier ± 5%`) with a list-driven simulation where `viewerCount = viewers.length`. The 觀眾 tab shows the actual simulated viewer list, and the header count reflects it exactly.

**Why:** The old formula produced counts (e.g., 105) completely disconnected from the ~40-name pool in the 觀眾 tab, breaking immersion. The new design ensures the count always matches visible evidence. Admin configures `viewerPeakTarget` and `viewerRampMinutes` instead of `viewerBaseCount` and `viewerMultiplier`. Name pool expanded to 200+ names. 3-phase attendance curve (ramp-up, plateau, decline) with auto-chat name sync and late-join fast-forward.

### 2026-02-24: Access Control and Muted Autoplay for Fake Live

Added client-side access gate to `/live` route with event state machine (PRE_EVENT/PRE_SHOW/LIVE/ENDED). Video auto-plays muted with click-to-unmute overlay to comply with browser autoplay policies while maintaining livestream illusion. Chose client-side gate over middleware since MVP has no auth and video URLs are already public — the goal is preventing accidental illusion-breaking, not security. `replay=true` query param provides bypass for end-page replay links.
