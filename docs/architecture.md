# Architecture

> Last verified: 2026-03-18

Living document. Hooks remind Claude to keep this current when structural changes are made.

## System Overview

Simulive (simulated-live) webinar platform. A pre-recorded video plays on a schedule while interactive features — auto-chat, CTA overlays, viewer count — create the feel of a live broadcast. Built for the 北美華人 (North American Chinese) market (Simplified Chinese, zh-CN locale). Data stored in Supabase (hosted Postgres). Chat uses SSE (Server-Sent Events) via in-memory pub/sub broker (`src/lib/chat-broker.ts`). WebSocket planned for production.

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
| `/` | `src/app/(public)/page.tsx` | Single landing page for webinar ID `1` ("Mike是麦克"). Modal registration. Sections: Hero → Speaker Intro (hardcoded bio copy) → Schedule/Countdown → Benefits → Urgency. Post-registration redirect threads `email` param to lobby URL for downstream checkout pre-fill. |
| `/demo` | `src/app/(public)/demo/page.tsx` | Demo/preview page |
| `/webinar/[id]/lobby` | `src/app/(public)/webinar/[id]/lobby/page.tsx` | Event lobby: unified layout with progress bar, webinar info, social proof (registration count), highlights, calendar card. Phase A (>30min): success banner, calendar emphasis. Phase B (≤30min): gold "即将开始" badge, prominent CTA button above countdown. Auto-redirects to live at T=0. **Slot resolution:** Reads `slot` from query param; when missing (e.g. old calendar links), detects currently-live slots from the evergreen daily schedule or fetches the next upcoming slot via `/api/webinar/[id]/next-slot`. **Email passthrough:** Reads `email` from query param (set by email/calendar links) and threads it to live/end/calendar URLs so checkout works even without localStorage. Calendar invites (ICS + Google Calendar) include lobby URL with `slot`, `name`, `email`, and UTM params (`utm_source=calendar`, `utm_medium=ical|google`, `utm_campaign=webinar_reminder`) in both description text and URL/location fields. |
| `/webinar/[id]/confirm` | Redirect stub → `/lobby` | Backward compatibility |
| `/webinar/[id]/waiting` | Redirect stub → `/lobby` | Backward compatibility |
| `/webinar/[id]/live` | `src/app/(public)/webinar/[id]/live/page.tsx` | Live room: video + 4-tab sidebar (Info/Viewers/Chat/Offers) + on-video CTA |
| `/webinar/[id]/end` | `src/app/(public)/webinar/[id]/end/page.tsx` | Dark sales page with purple CTA, social sharing, replay link |
| `/checkout/[webinarId]` | `src/app/(public)/checkout/[webinarId]/page.tsx` | Two-column checkout: marketing copy + Stripe Embedded Checkout form. Reads email/name/source from query params. **Email fallback:** If `email` param is missing (e.g. shared link), shows an inline email input form before rendering Stripe checkout. **Change email:** Users can switch to a different email mid-checkout, which re-creates the Stripe session via key remount. |
| `/checkout/[webinarId]/return` | `src/app/(public)/checkout/[webinarId]/return/page.tsx` | Post-payment return page. Polls session status, displays activation code directly on screen, shows success or error. Email is a backup delivery channel. |
| `/admin/login` | `src/app/(admin)/admin/login/page.tsx` | Admin login page (`ADMIN_PASSWORD` env var) |
| `/admin` | `src/app/(admin)/admin/page.tsx` | Admin panel (password-protected) |

## Data Architecture

### Models (`src/lib/types.ts`)

| Interface | Key Fields | Notes |
|-----------|-----------|-------|
| `Webinar` | `id`, `title`, `videoUrl`, `duration`, `autoChat[]`, `ctaEvents[]`, `status`, `evergreen?`, `viewerPeakTarget?`, `viewerRampMinutes?`, `heroImageUrl?`, `promoImageUrl?`, `disclaimerText?`, `endPageSalesCopy?`, `endPageCtaText?`, `endPageCtaUrl?`, `endPageCtaColor?`, `sidebarDescription?`, `productPackageId?`, `salesCode?` | Top-level entity. Embeds auto-chat and CTA arrays inline. Extended with landing/end/sidebar fields. Uses `evergreen` config for dynamic scheduling. Viewer simulation configured via `viewerPeakTarget` and `viewerRampMinutes`. `productPackageId` (商品包編號) and `salesCode` (銷售代碼) configure fulfillment metadata per webinar. |
| `EvergreenConfig` | `enabled`, `dailySchedule[]`, `immediateSlot{}`, `videoDurationMinutes`, `timezone`, `displaySlotCount` | Configures dynamic slot generation. Daily anchor times + immediate slot injection for perpetual urgency. |
| `EvergreenSlot` | `slotTime`, `type` | Computed session slot — either `'anchor'` (daily recurring) or `'immediate'` (dynamically injected). |
| `AutoChatMessage` | `id`, `timeSec`, `name`, `message` | Bot message triggered at video timestamp. |
| `CTAEvent` | `id`, `showAtSec`, `hideAtSec`, `buttonText`, `showCountdown`, `position?`, `color?`, `secondaryText?` | Promotional overlay with optional countdown. Supports on-video or below-video positioning. Clicks navigate to internal checkout page. |
| `Registration` | `id`, `webinarId`, `name`, `email`, `phone?`, `assignedSlot?`, `slotExpiresAt?`, `reassignedFrom?` | One per email per webinar (duplicate check). Evergreen fields store computed slot times. |
| `ChatMessageData` | `id`, `webinarId`, `name`, `message`, `timestamp`, `createdAt` | Real user chat message. |
| `Order` | `id`, `webinarId`, `email`, `name`, `stripeSessionId`, `stripePaymentIntentId?`, `activationCode?`, `status`, `amount`, `currency`, `metadata?`, `createdAt`, `paidAt?`, `fulfilledAt?`, `productPackageId?`, `salesCode?` | Stripe checkout order. Status: `pending` → `paid` → `fulfilled`. Activation code generated on fulfillment. `productPackageId` and `salesCode` copied from webinar config at fulfillment time. |

### Storage Layer (Supabase)

Supabase (hosted Postgres) replaces the previous JSON file storage. Server-side only — no client SDK.

- `src/lib/supabase.ts` — Supabase client initialized with service role key (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars)
- `src/lib/db.ts` — Async CRUD functions with automatic snake_case (DB) ↔ camelCase (TypeScript) mapping. Includes `updateOrderStatus(id, fromStatus, toStatus)` for atomic status transitions (used by webhook to prevent duplicate fulfillment).
- `scripts/supabase-schema.sql` — Full schema definition (tables, indexes, RLS policies)
- `scripts/migrate-to-supabase.ts` — One-time data migration from JSON files

**Activation codes:** `src/lib/google-sheets.ts` — Claims pre-populated activation codes from a Google Sheet via the Sheets API. Throws an error when `GOOGLE_SERVICE_ACCOUNT_KEY` is not configured (no fallback — Stripe retries the webhook).

#### Purchase Fulfillment

Two fulfillment paths (shared `src/lib/fulfillment.ts`):
1. **Stripe webhook** (`/api/checkout/webhook`) — primary, triggered by Stripe on payment
2. **Session-status polling** (`/api/checkout/session-status`) — fallback, triggered by return page polling

Both use `updateOrderStatus(id, 'pending', 'paid')` as an atomic lock — only one caller wins the race. Safe against double fulfillment.

**Tables:** `webinars`, `registrations`, `chat_messages`, `orders` (the `events` table exists but is no longer written to — tracking moved to GTM/GA4)

**JSONB columns:** Nested arrays that are always read/written with the parent webinar are stored as JSONB columns rather than separate tables: `auto_chat`, `cta_events`, `highlights`, `subtitle_cues`, `evergreen`.

### API Routes

Routes are split into **public** (read-only + user actions) and **admin** (write operations) namespaces. Admin routes are protected by password auth middleware (`src/middleware.ts`) matching `/admin/*` and `/api/admin/*`.

#### Public Routes (`src/app/api/`)

| Endpoint | Methods | Source File | Notes |
|----------|---------|-------------|-------|
| `/api/webinar` | GET | `src/app/api/webinar/route.ts` | List all webinars |
| `/api/webinar/[id]` | GET | `src/app/api/webinar/[id]/route.ts` | Single webinar + `registrationCount` |
| `/api/webinar/[id]/chat` | GET, POST | `src/app/api/webinar/[id]/chat/route.ts` | GET/POST chat messages. Resolves numeric `[id]` to webinar UUID via `getWebinarById` before DB operations (chat_messages.webinar_id is UUID). |
| `/api/register` | POST | `src/app/api/register/route.ts` | Checks duplicate email per webinar. Evergreen-aware: accepts `assignedSlot`, computes `slotExpiresAt`. Sends confirmation email with lobby URL. Base URL derived from `NEXT_PUBLIC_BASE_URL` → `Host`/`x-forwarded-proto` headers → hardcoded fallback. |
| `/api/webinar/[id]/next-slot` | GET | `src/app/api/webinar/[id]/next-slot/route.ts` | Computes upcoming evergreen slots from config. Returns `slots[]`, `countdownTarget`, `expiresAt`. |
| `/api/webinar/[id]/reassign` | POST | `src/app/api/webinar/[id]/reassign/route.ts` | Reassigns a registered user to the next available slot (for missed sessions). |
| `/api/checkout/create-session` | POST | `src/app/api/checkout/create-session/route.ts` | Creates Stripe Embedded Checkout session. Checks duplicate purchase, creates pending Order. Returns `clientSecret`. |
| `/api/checkout/session-status` | GET | `src/app/api/checkout/session-status/route.ts` | Polls Stripe session status. Fallback fulfillment path — if webhook hasn't fired yet and Stripe confirms payment, triggers `fulfillOrder()`. Return page polls this to display activation code on screen. |
| `/api/checkout/webhook` | POST | `src/app/api/checkout/webhook/route.ts` | Stripe webhook handler. Primary fulfillment on `checkout.session.completed`: calls `fulfillOrder()`. Email sent separately (failure does not roll back fulfillment). Rolls back to pending on code-claim failure so Stripe retries. |
| `/api/webinar/[id]/chat/stream` | GET | `src/app/api/webinar/[id]/chat/stream/route.ts` | SSE real-time chat stream via `chat-broker.ts` |
| `/api/subtitles/generate` | POST | `src/app/api/subtitles/generate/route.ts` | Generate subtitles for video |
| `/api/subtitles/logs` | GET | `src/app/api/subtitles/logs/route.ts` | Fetch subtitle generation logs |
| `/api/cron/reminders` | GET | `src/app/api/cron/reminders/route.ts` | Send scheduled email reminders. CRON_SECRET protected. Base URL derived from `NEXT_PUBLIC_BASE_URL` → `Host`/`x-forwarded-proto` headers → `https://mike.cmoney.cc` fallback. |
| `/api/cron/orders-sync` | GET | `src/app/api/cron/orders-sync/route.ts` | Daily orders → Google Sheets sync. CRON_SECRET protected. |

#### Admin Routes (`src/app/api/admin/`)

| Endpoint | Methods | Source File | Notes |
|----------|---------|-------------|-------|
| `/api/admin/webinar` | GET, POST | `src/app/api/admin/webinar/route.ts` | List all / create new |
| `/api/admin/webinar/[id]` | GET, PUT, DELETE | `src/app/api/admin/webinar/[id]/route.ts` | Full CRUD, GET includes registrations |
| `/api/admin/login` | POST | `src/app/api/admin/login/route.ts` | Authenticate with ADMIN_PASSWORD, set session cookie |
| `/api/admin/logout` | POST | `src/app/api/admin/logout/route.ts` | Clear session cookie |

### Email Templates (`src/lib/email.ts`)

SendGrid-based email service (fetch, no SDK). Gracefully degrades to console log when `SENDGRID_API_KEY` is absent.

| Template | Function | Purpose |
|----------|----------|---------|
| Registration confirmation | `confirmationEmail()` | Brand-aligned HTML EDM (ivory + gold design system). Includes speaker header, event details card (date/time), 5 benefit highlights (financial freedom path, stock picks, passive income, market timing, APP guided execution), gold CTA, and urgency reminder. Table-based layout for cross-client compatibility. |
| 24h / 1h reminder | `reminderEmail()` | Pre-session reminder with lobby link |
| Follow-up / replay | `followUpEmail()` | Post-session replay link + optional CTA |
| Purchase confirmation | `purchaseConfirmationEmail()` | Order details, activation code box, product links, step-by-step instructions |

All templates use inline CSS for email client compatibility. Confirmation email mirrors the landing page design system (`#B8953F` gold accent, `#FAFAF7` ivory bg, `#E8E5DE` borders).

### Utilities (`src/lib/utils.ts`)

- `formatDate`, `formatTime`, `formatDateTime` — `zh-CN` locale formatting
- `formatCountdown`, `getTimeUntil` — countdown math
- `generateICSContent` — calendar file generation (ICS `DESCRIPTION` + `URL` fields)
- `buildEmailLink` — EDM link builder with UTM + original attribution preservation
- `validateEmail`, `validatePhone` — phone accepts North American 10-digit format (with optional +1)
- `cn(...classes)` — className join helper (like `clsx`)
- `getVideoSourceType(url)` — returns Video.js MIME type (`application/x-mpegURL` or `video/mp4`)

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

The `NAME_POOL` (~180 names) is curated to mimic realistic North American Chinese (北美华人) naming patterns: Chinese full names with proper surnames (林嘉欣, 陈思远), English names popular in the diaspora (Vivian, Jasmine, Winston), mixed format (Cindy 陈, Tony 李), and a few natural nicknames (嘉嘉, 湾区老王). Avoids textbook placeholders (李明), celebrity names, and robotic 小X/阿X patterns.

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
| `VideoPlayer` | `src/components/video/VideoPlayer.tsx` | Video.js + HLS.js player. Supports MP4 and HLS sources. Dynamically imported (no SSR). **Seeking disabled** — blocks scrubbing, arrow keys, Home/End. Emits `onTimeUpdate`. Supports `initialTime` prop for late-join video seeking. `livestreamMode` prop hides controls and enables muted autoplay. |
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

## Analytics (GTM / GA4)

All tracking goes through **GTM** via `@next/third-parties/google` (`GoogleTagManager` component in root layout, gated on `NEXT_PUBLIC_GTM_ID` env var). Every event uses `trackGA4()` → `window.dataLayer.push()` → GTM → GA4. No server-side event storage.

**Event inventory (19 events):**

| GA4 Event | Type | Page | Trigger |
|---|---|---|---|
| `c_scroll_depth` | Custom | Landing | 10% scroll intervals |
| `c_signup_button_click` | Custom | Landing | CTA button click |
| `sign_up` | Recommended | Registration | Form submit success |
| `c_add_to_calendar` | Custom | Lobby | Google/iCal click |
| `c_lobby_entered` | Custom | Lobby | Page load (measures reg→lobby conversion) |
| `c_lobby_duration` | Custom | Lobby | Page exit (duration_sec + exit_type: enter_live/abandon) |
| `c_lobby_abandon` | Custom | Lobby | pagehide before entering live (duration + minutes_until_start) |
| `c_enter_live` | Custom | Lobby | Enter live room (button/countdown/redirect) |
| `c_video_heartbeat` | Custom | Live Room | Every 60s while playing (uses ref to avoid interval reset) |
| `c_video_progress` | Custom | Live Room | 5% milestone intervals |
| `c_chat_message` | Custom | Live Room | User sends message |
| `c_cta_view` | Custom | Live Room | CTA overlay appears |
| `c_cta_click` | Custom | Live Room | CTA overlay button click (`cta_position`, `cta_visible_duration_sec`, `session_watch_duration_sec`) |
| `c_cta_dismiss` | Custom | Live Room | CTA overlay dismissed |
| `begin_checkout` | Recommended | Live + End | CTA purchase click (includes `source`, `cta_id`) |
| `c_webinar_complete` | Custom | End Page | Page mount (includes `watch_duration_sec` via sessionStorage) |
| `c_end_page_cta_click` | Custom | End Page | CTA button click |
| `c_share_click` | Custom | End Page | Facebook/Twitter share |
| `purchase` | Recommended | Checkout Return | Stripe session confirmed complete |
| `c_purchase_confirmation` | Custom | Checkout Return | Backup event alongside purchase (cross-check vs DB orders) |

**gclid preservation:** `GclidPreserver` component stores gclid/UTM params in sessionStorage on first page load so Google Ads attribution survives client-side navigation.

**Files:** `src/lib/analytics.ts` (typed GA4 event map + `trackGA4()` function), `src/components/analytics/GclidPreserver.tsx`

### Attribution Tracking (Cross-Session)

Registration captures the user's current UTM/gclid parameters and stores them on the `registrations` table. When generating links that cross session boundaries (EDM emails, calendar events), the system appends:
- Current touchpoint UTM (e.g. `utm_source=edm&utm_medium=email` or `utm_source=calendar&utm_medium=google`)
- `orig_source`, `orig_medium`, `orig_campaign`, `orig_content`, `orig_gclid` — original campaign attribution preserved from registration

**Post-registration redirect:** Landing page (`page.tsx`) threads `email` param into the lobby redirect URL, ensuring calendar links created during the initial lobby visit carry the email.
**EDM links:** `buildEmailLink()` in `utils.ts` reads attribution from the registration record (server-side). Also includes `email` param so users landing from email links have their email threaded through the page chain to checkout.
**Calendar links:** `getLobbyUrlWithUtm()` in `lobby/page.tsx` reads attribution from sessionStorage/cookie (client-side). Also includes `email` param when available.

**Email resolution priority** (at checkout): localStorage sticky session > URL `email` param > inline email input form.

`GclidPreserver` parses both standard `utm_*` and `orig_*` params. GA4 conversion events automatically attach `original_*` custom dimensions via `getAttribution()` in `analytics.ts`.

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

`localStorage` key `webinar-{id}-evergreen` stores: `{ visitorId, assignedSlot, expiresAt, registered, registrationId, email }`. Ensures consistent countdown across page refreshes. The `email` field is set at registration time; for users entering via email/calendar links (different device/browser), `email` is threaded via URL search params instead.

### Admin Configuration

The admin panel (`WebinarForm.tsx`) exposes evergreen settings: daily anchor times, immediate slot interval/buffer/trigger threshold, timezone, and display slot count. Evergreen is always enabled (the `Session` type was removed).

## Video Storage & Delivery

Videos are uploaded directly to **Mux** via Mux Direct Uploads. The browser uses `@mux/upchunk` for chunked, resumable uploads — no intermediary storage. The server creates a Mux Direct Upload URL, the browser streams the file to Mux, and Mux auto-creates an asset and transcodes to HLS adaptive bitrate (360p–1080p). The client polls a status endpoint for upload completion and transcoding (up to 2 hours to accommodate large/long videos). Mux serves video via its global CDN at `stream.mux.com`. The webinar's `videoUrl` stores the Mux HLS URL (`https://stream.mux.com/{PLAYBACK_ID}.m3u8`).

Upload flow: Browser → Mux Direct Upload (`@mux/upchunk`, chunked/resumable) → Mux transcodes → Status polling (max 2h) → Ready

**Chunking strategy:** Chunk size scales dynamically with file size to reduce HTTP request count for large uploads — 5MB (<1GB), 16MB (1-5GB), 32MB (5-10GB), 64MB (>10GB). Each chunk retries up to 10 times with a 3-second delay. UpChunk's offline/online detection pauses and auto-resumes uploads on network loss.

**Limits:** Max upload size 20GB (client-side enforced). Mux quality tier: `basic` (720p max renditions). Designed to support videos up to ~3 hours in duration.

**Fallback:** Admin can paste any external MP4/HLS URL directly, bypassing the upload flow.

**Admin API routes:**

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/admin/videos` | GET, POST | List video library / initiate upload (returns Mux Direct Upload URL) |
| `/api/admin/videos/[id]` | PATCH, DELETE | Update metadata / delete video file |
| `/api/admin/videos/mux-assets` | GET | List Mux assets available for import (excludes already-imported) |
| `/api/admin/videos/import` | POST | Import an existing Mux asset into the local video library |

**Admin UI:** The `VideoManager` component replaces the old URL text field in the webinar form, providing drag-and-drop upload with a video library picker. Only MP4 and HLS sources are supported.

## Key Constraints

1. **No video seeking** — Business requirement. VideoPlayer blocks scrubbing, keyboard seeks, and programmatic seeking. Not a bug.
2. **No WebSocket** — Chat uses SSE (Server-Sent Events) via `chat-broker.ts` pub/sub broker + auto-chat messages. Socket.io planned for production.
3. **Admin password auth** — `ADMIN_PASSWORD` env var + HMAC-signed cookie session (24h expiry). Middleware at `src/middleware.ts` protects `/admin/*` and `/api/admin/*`. Login page at `/admin/login`.
4. **`NEXT_PUBLIC_BASE_URL` recommended in production** — Email links (confirmation, reminders) and Stripe checkout prefer this env var for public-facing URLs. If unset, routes fall back to the request's `Host` header + `x-forwarded-proto` (set by reverse proxies like Zeabur), then to a hardcoded `https://mike.cmoney.cc` default.
5. **North American Chinese locale** — Phone validation: US/Canada 10-digit format. Date formatting: `zh-CN` locale.
6. **No i18n framework** — All UI text is hardcoded Simplified Chinese (zh-CN). i18n planned for future.
7. **Unsplash images** — `next.config.ts` allows remote images from `*.unsplash.com`.
8. **Dynamic video import** — Video.js imported client-side only to avoid SSR issues.

## Known Gaps vs SPEC.md

Modules defined in SPEC.md but **not yet implemented**:

- **Picture-in-Picture (PiP)** — Floating mini-player when scrolling
- **WebSocket real-time chat** — Currently simulated with polling + auto-chat
- **Polls / Q&A** — Interactive engagement features
- **Advanced admin** — Full CRUD dashboard, analytics, session management
- **Social sharing OG tags** — Share buttons added to end page, but OG meta tags not yet implemented
- **Multi-language support** — Currently zh-CN only, no language switcher
- **Recording/replay** — Post-live replay functionality
