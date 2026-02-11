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

### 2026-02: Self-sustaining documentation system

Added `docs/architecture.md` (living architecture doc) and `docs/decisions.md` (this file). Claude Code hooks (PostToolUse + Stop) automatically remind and enforce documentation updates when structural changes are made. Goal: reduce doc drift without manual discipline.
