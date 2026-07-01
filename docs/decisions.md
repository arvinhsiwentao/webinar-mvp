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

**Superseded by 2026-03-11 decisions below.** YouTube support was removed; only MP4/HLS via Cloudflare R2 is supported.

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

### 2026-02-26: Hot start + organic jitter for viewer count authenticity

**Decision:** Viewer count now starts at ~35% of peak (auto-derived, no new admin config) with all early auto-chat names pre-loaded. Added ±8% organic jitter per tick. Suppressed initial join message spam in ChatRoom.

**Why:** Previous 0→peak ramp caused chat-with-zero-viewers (auto-chat fires at t=3s but viewer count rounds to 0). Monotonic growth looked robotic. Users entered an "empty room" with no social proof. New model creates immediate FOMO on entry.

### 2026-02-24: Access Control and Muted Autoplay for Fake Live

Added client-side access gate to `/live` route with event state machine (PRE_EVENT/PRE_SHOW/LIVE/ENDED). Video auto-plays muted with click-to-unmute overlay to comply with browser autoplay policies while maintaining livestream illusion. Chose client-side gate over middleware since MVP has no auth and video URLs are already public — the goal is preventing accidental illusion-breaking, not security. `replay=true` query param provides bypass for end-page replay links.

### 2026-02-26: Background-tab autoplay recovery

**Decision:** Visibility handler now waits for `canplay` (readyState ≥ 3) before attempting play on tab return. The `autoplayBlocked` detection timeout is deferred to when the tab is actually visible — background tabs always block autoplay, so checking there was a false positive.

**Why:** Browsers defer media loading for background tabs. If the user backgrounded during countdown, the live page loaded with no video data buffered, causing both unmuted and muted play() to fail on tab return. The premature timeout also showed a manual play button before giving the recovery handler a chance.

### 2026-03-05 — Stripe Embedded Checkout over Hosted/Custom

Chose Stripe Embedded Checkout (`ui_mode: 'embedded'`) over hosted redirect (loses user context) and custom Payment Element (more PCI scope). Embedded mode keeps users on our domain while Stripe handles PCI compliance. Activation codes generated server-side via webhook, delivered by email — return page only confirms payment, doesn't show codes.

### 2026-03-06: Supabase over JSON files for data storage

Migrated from JSON file storage (`data/*.json` with `fs.readFileSync/writeFileSync`) to Supabase (hosted Postgres). JSON files couldn't handle concurrent writes — two registrations at the same time would clobber each other. Supabase solves this with real database transactions. Nested arrays (autoChat, ctaEvents, subtitleCues, evergreen) stored as JSONB columns since they're always read/written with the parent webinar. Service role key used server-side only.

### 2026-03-06: Simple password auth over Supabase Auth for admin

Added env-var-based password (`ADMIN_PASSWORD`) with HMAC-signed cookie session instead of full Supabase Auth. Only one admin user needed for MVP. Next.js middleware protects `/admin` and `/api/admin/*` routes. Login page at `/admin/login`. 24-hour session expiry.

### 2026-03-06: Admin panel field cleanup — 11 dead fields removed

Removed fields from Webinar type and admin form that were never consumed by any public page: subtitle, speakerBio, thumbnailUrl, prerollVideoUrl, heroEyebrowText, missedWebinarUrl, endPageCtaUrl, endPageCtaColor, viewerBaseCount, viewerMultiplier, CTAEvent.icon. Added 3 missing CTA fields (position, color, secondaryText) that runtime reads but the form never exposed.

### 2026-03-11: Supabase Storage for video hosting

**Decision:** Use Supabase Storage instead of YouTube embeds for video delivery.
**Why:** YouTube branding (logo, watermark, suggested videos) breaks the pseudo-live illusion.
Supabase is already in the stack, supports resumable uploads for large files (up to 5GB), and serves via CDN.
Admin panel gets drag-and-drop upload with a video library for easy switching.

## 2026-03-11: Migrate video storage from Supabase to Cloudflare R2

Supabase free tier has 50MB file upload limit (hard cap, no workaround). Cloudflare R2 free tier: 10GB storage, zero egress fees, 5GB per single upload. Video metadata stays in Supabase DB. Added paste-URL fallback for flexibility. Uses `@aws-sdk/client-s3` with presigned PUT URLs for browser-direct uploads.

### 2026-03-12 — Mux for video delivery (HLS adaptive streaming)

**Decision:** Add Mux as the video delivery layer on top of R2 storage. R2 remains the upload destination and backup; Mux handles transcoding and CDN delivery.

**Why:** R2's `r2.dev` subdomain has no CDN caching, causing video buffering. Mux provides automatic HLS adaptive bitrate, global CDN, and 100K free delivery minutes/month. Video.js + HLS.js already supports `.m3u8` URLs — zero player code changes needed.

**Alternatives rejected:** Cloudflare Stream ($60/mo at 1K viewers vs Mux ~$0.18), Bunny Stream (viable but Mux created Video.js — best compatibility), R2 custom domain (no HLS, needs domain on Cloudflare).

### 2026-03-12 — Stripe Payment Intent ID as order number

**Decision:** Use the Stripe Payment Intent ID (`pi_xxx`) as the order number displayed in purchase confirmation emails, instead of generating a custom order ID.

**Why:** Already captured at fulfillment (`stripePaymentIntentId`), no database migration needed. Provides a traceable link back to Stripe dashboard for customer service.

### 2026-03-12 — Google Sheets for activation code inventory

**Decision:** Switch activation codes from random generation to claiming pre-populated codes from a Google Sheet via the Sheets API. *(Note: random fallback was later removed — see 2026-03-13 entry.)*

**Why:** Business needs pre-determined activation codes (from CMoney platform). Google Sheets provides a simple, non-technical interface for the team to manage code inventory. Race condition handled by verify-after-write with max 3 retries.

### 2026-03-12: Remove R2, use Mux Direct Uploads
**Decision:** Removed Cloudflare R2 from video upload pipeline. Browser now uploads directly to Mux via `@mux/upchunk`.
**Why:** R2 was only a staging area for Mux to fetch from — the R2 copy was never accessed after Mux ingested it. Direct upload eliminates the double-transfer (browser→R2→Mux), reduces infra (5 env vars, 2 npm packages), and adds resumable chunked uploads.
**Trade-off:** No local backup of raw video. Mux retains the master (downloadable via `master_access` API).

### 2026-03-12: GA4 tracking audit fixes
**Decision:** Removed `join_group` event. Added lobby instrumentation (`c_lobby_entered`, `c_lobby_duration`, `c_lobby_abandon`). Added `c_purchase_confirmation` backup event. Added purchase fallback logging.
**Why:** `join_group` was redundant with `c_enter_live` (which fires at the decision point with entry_method context) and double-counted conversions. Lobby was a funnel blind spot. Purchase event is client-dependent (may not fire if browser closes after payment).
**Trade-off:** 3 more custom events to maintain. `c_purchase_confirmation` is not in CONVERSION_EVENTS (no attribution auto-attach) since the `purchase` event handles that.

### 2026-03-13: EDM links preserve original campaign attribution via orig_* params

**Decision:** Store utm/gclid at registration time in DB. EDM links carry both edm-specific utm (for GA4 last-click) and orig_* params (for original campaign analysis).

**Why:** Without this, users returning via EDM lose their original ad campaign attribution, making it impossible to measure which campaign drove the eventual conversion. Alternative was to not set EDM utm at all (preserving original via cookies), but that prevents measuring EDM effectiveness separately.

### 2026-03-13 — Remove fake activation code fallback, harden purchase fulfillment

**Decision:** Removed random activation code generator (`activation-codes.ts`). Google Sheets is now the only source. If unavailable, webhook fails and Stripe retries. Decoupled email from fulfillment — email failure no longer rolls back the order. Return page now displays the activation code directly with polling, making email a backup channel. Customer service email updated to `CMoney_overseas@cmoney.com.tw`.

**Why:** Fake codes can't be redeemed on CMoney — worse than an error. Silent email failure left customers with no code and no recourse. Showing the code on-screen eliminates single-point-of-failure on email delivery.

### 2026-03-13: Add inline fulfillment fallback to session-status route

Extracted fulfillment logic into shared `src/lib/fulfillment.ts`. Both the Stripe webhook and the session-status polling route can now trigger fulfillment. Atomic lock (`updateOrderStatus: pending → paid`) prevents double fulfillment. Previously, if the webhook didn't fire (local dev without `stripe listen`, deployment misconfiguration), orders stayed stuck at `pending` forever.

### 2026-03-17: Orders → Google Sheets sync approach

**Decision:** External HTTP cron (cron-job.org) calling `/api/cron/orders-sync` with CRON_SECRET bearer auth.
**Why:** Zeabur is containerized (not serverless) so no Vercel Cron available. External HTTP cron is simplest, follows existing reminders pattern, and is free. Also retrofitted CRON_SECRET onto existing `/api/cron/reminders` which had no auth.
**Alternatives rejected:** node-cron (process-internal, harder to debug), Supabase Edge Functions (separate Deno runtime), Google Apps Script (split codebase).

### 2026-03-17: Product package ID and sales code on orders

**Decision:** Store `productPackageId` and `salesCode` as webinar-level config, copied to order at fulfillment time.
**Why:** These values identify the product package and sales channel for each purchase. Stored at webinar level so they can vary per webinar. Copied to order at fulfillment so the order is a self-contained record even if webinar config changes later.

### 2026-03-23: Container-based fullscreen instead of native video fullscreen

**Decision:** In livestream mode, disable Video.js's native fullscreen button and replace with a custom button that fullscreens the wrapper `<div>`, not the `<video>` element. CSS fixed-position fallback for older iOS.
**Why:** On mobile (especially iOS Safari), native video fullscreen exposes browser controls (duration, seekable progress bar, pause) that reveal the video is pre-recorded. Fullscreening the container div keeps our custom Video.js controls (hidden progress, LIVE pill, blocked seeking) active on both iOS and Android.

### 2026-05-12: Google 一鍵填寫 — GIS + 後端驗 token，不建 session

**決策：** 報名 modal 加 Google Identity Services (GIS) 一鍵填寫按鈕。用戶選帳號後，前端拿 ID token 送 `/api/auth/google-verify`，後端用 `google-auth-library` 驗簽名後回 email/name，前端把值塞進表單。**驗完即丟，不發 cookie、不建 user table、不寫 session。** Email 鎖為 readonly（保證真實），name 可改（允許中文化），phone 不變。實際 submit 仍走原本 `/api/register`。
**Why:** 降低報名摩擦是主要目的，不是要做會員系統。選 GIS 而非 Supabase Auth / NextAuth 是因為它純前端、無 session 模型，跟現有 admin 密碼認證互不污染。`/api/register` origin-agnostic 設計剛好接得起來，evergreen / dedup / SendGrid / webhook 全部繼承。

### 2026-05-13: Post-webinar email 名單記錄到 Supabase + 即時 append Google Sheet

**決策：** 在 `/api/webinar/[id]/post-email` 寄信時 fire-and-forget 寫入新表 `post_webinar_email_recipients`（denormalize UTM from registrations 快照），Supabase insert 成功後**即時 append 一列到 Google Sheet**（`RETARGETING_SPREADSHEET_ID` env var、Retargeting tab）。**不走 cron**。
**Why:** 行銷部門需要「看過直播的有意願受眾」名單做 EDM + Google Ads/Meta Custom Audience，且想即時看到新名單不要等。Supabase 當 source of truth（即時、可分析），Sheet 是行銷便利鏡像。Sheet 寫入失敗只 log 不阻擋；用戶自行對照兩邊有無落差，DB 為準。UTM denormalize 避免日後 registrations 表更新後失去「轉換當下」歸因 snapshot。Dedup 重用 audit 機制 + DB unique constraint 雙保險，既有 3 個觸發 caller 完全不動。**取捨：** 放棄 cron clear-and-rewrite 的完美一致性，換取即時性 + 程式簡單性。

### 2026-06-11: 新增 us-stock-course（$1 / 1+3）直購漏斗 + GA4 事件隔離

**決策：** 在自控的 Next.js domain 新建一條與模擬直播無關的直購鏈路 `/us-stock-course/{author,news,feature}` → `/us-stock-course/checkout` → `/us-stock-course/checkout/return`，賣 $1 的「9 章課程 + 3 天 App VIP」(1+3)。免登入結帳（只填 email）、付款後秀序號 + 引導去 cmoney.tw 兌換。重用既有 Stripe Embedded Checkout + `fulfillOrder` 序號發放 + landing 元件 + 深色金色設計系統。3 切角共用 `UsStockCourseBody`，只差前導影片(Mux HLS)與 hook 文案(`ANGLE_CONFIG`)。結帳/兌換頁三切角共用，`angle` 走 `?angle=` query 做歸因。
**Why（為何要這條鏈路）：** 現有 webinar→$599 對冷流量轉換太差；CMoney 的 $1 LP 又因「立即購買強制先登入」把高摩擦放在付款前，冷流量大量流失。把登入挪到付款後（已付錢→sunk cost→登入摩擦趨近於零），並降門檻到 $1。
**GA4 事件隔離（關鍵）：** 兩條漏斗共用同一個 GA4 資源，若新漏斗沿用標準 `purchase`/`begin_checkout`，$1 成交會污染 webinar 的 Google Ads Smart Bidding（即使不同廣告帳號也一樣，根因在 GA4 事件層）。**決策：新漏斗完全不發 `purchase`/`begin_checkout`，改發專屬事件** `c_us_stock_course_begin_checkout`(進入購買頁) / `c_us_stock_course_add_payment_info`(Stripe 表單渲染) / `c_us_stock_course_purchase`(購買完成)，三者加進 `CONVERSION_EVENTS` 自動帶 gclid/utm；CTA 用 `c_us_stock_course_cta_click`、scroll depth `page:'us_stock_course_'+angle`、order metadata 標 `funnel:'us_stock_course'`。webinar 那邊零改動、轉換維持純淨。return 頁 purchase value 用真實 $1（不 fallback `DEFAULT_PRODUCT_PRICE=599`）。
**容器 webinar：** 訂單 FK 需掛一個隱形 `webinars` row（`US_STOCK_CONTAINER_WEBINAR_ID` env，用 UUID 不用數字索引——`getWebinarById` 數字版是按 created_at 第 N 筆會位移），永不出現在任何網址。
**前導影片：** 走 Mux HLS（`IntroVideoPlayer` 用 hls.js + 原生 controls，非鎖定版 VideoPlayer——行銷片要正常播放控制）。
**Phase 0 前提（非程式，上線前備齊）：** $1 Stripe Price ID(`STRIPE_PRICE_US_STOCK_1PLUS3`)、CMoney 兌換序號 Google Sheet 分頁 + 商品包/銷售碼（填 `products.ts` 的 `us-stock-1plus3`）、容器 webinar UUID、3 支 hook 上 Mux 取 playbackId 填 `ANGLE_CONFIG`、3 個轉換事件在 GA4 標為關鍵事件並匯入 $1 廣告帳號。
**取捨：** 新漏斗不發標準 GA4 電商事件 → 失去 GA4 內建 Monetization/購買漏斗報表，換取 Google Ads 出價乾淨隔離（對「兩條漏斗別互相打架」這個首要目標是正確取捨）。

### 2026-07-01: Landing 文案對齊最新直播母帶（20260629 Mike 銷講）

**決策：** 把 landing（`src/app/(public)/page.tsx`）與提醒信（`src/lib/email.ts`）的行銷文案改為對齊最新一版直播影片實際內容。三處重點：(1) 核心方法論從舊版「AI 六層架構」改為影片實際講的「**三四五攻守羅盤**」（判斷三問 / 狙擊四步法 / 五動口訣 選·配·放·守·調）；(2) 講師故事從查無實據的「32 歲負債 50 萬 → 43 歲財務自由」改為影片講得出來的「2023 年開槓桿一天虧 50 萬美金、35 歲還清一身債、沉下心兩年從『賭對』到『判斷對』」；(3) 一對一持倉分析拿掉「價值 $6,000+ USD」贈品框架，改軟性「有機會獲得診斷」。
**Why：** 影片母帶換版後方法論命名與生平數字都變了，舊文案會讓看完直播的用戶發現「報名頁講的跟影片不是同一套」而破壞信任。$6,000 這個數字影片沒有、且與結帳頁「一對一分析只對 $6,000+ 海外財富之旅學員開放」的定位自相矛盾，當報名贈品是誤導。email 大綱與 landing 同源，一併同步避免前後不一致。
**範圍：** 純文案替換，無結構變更（故不動 architecture.md）。P1「ETF 主題型 vs 進階型」、「40 分鐘 vs 實際 36 分」與 P2 強化項（金句標題、2000 萬觀看、四種不適合的人篩選區）未做，留待後續。
