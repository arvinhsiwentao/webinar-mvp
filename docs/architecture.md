# Architecture

> Last verified: 2026-03-27

Living document. Hooks remind Claude to keep this current when structural changes are made.

## System Overview

Simulive 研討會平台。預錄影片按排程播放，搭配自動聊天、CTA 彈窗、觀眾數模擬，營造即時直播感。北美華人市場（zh-CN）。

**核心技術決策：**
- 資料庫：Supabase (Postgres)，server-side only，service role key
- 即時聊天：SSE（Server-Sent Events）via 記憶體 pub/sub broker（`chat-broker.ts`）
- 影片：Mux HLS 串流 + Video.js 播放器（禁止拖拉）
- 支付：Stripe Embedded Checkout + 雙重履約（webhook + polling fallback）

## Page Flow & Routing

Route groups：`(public)/`（觀眾頁面）、`(admin)/`（管理後台）

| Route | Purpose |
|-------|---------|
| `/` | Landing page，硬編碼 webinar ID `1`。Modal 報名。Hero 圖 + 倒數 + 權益 |
| `/demo` | 測試用直播間 |
| `/webinar/[id]/lobby` | 等候室：倒數計時、行事曆整合、30 分鐘入場門檻。自動偵測 evergreen 時段 |
| `/webinar/[id]/confirm` | 重定向 → `/lobby`（向下相容） |
| `/webinar/[id]/waiting` | 重定向 → `/lobby`（向下相容） |
| `/webinar/[id]/live` | 直播間：影片 + 4-tab 側邊欄（資訊/觀眾/聊天/優惠）+ CTA 疊層 |
| `/webinar/[id]/end` | 結束頁：銷售文案 + CTA + 社群分享 |
| `/checkout/[webinarId]` | 兩欄結帳：行銷文案 + Stripe Embedded Checkout |
| `/checkout/[webinarId]/return` | 付款確認頁：輪詢狀態、顯示啟用碼 |
| `/admin/login` | 管理員登入 |
| `/admin` | 管理後台：研討會 CRUD、報名名單、影片庫 |

## Data Architecture

### Models (`src/lib/types.ts`)

| Interface | 關鍵欄位 | 說明 |
|-----------|----------|------|
| `Webinar` | id, title, videoUrl, duration, autoChat[], ctaEvents[], evergreen?, viewerPeakTarget?, productPackageId?, salesCode? | 頂層實體。內嵌 autoChat 和 ctaEvents 陣列 |
| `EvergreenConfig` | enabled, dailySchedule[], immediateSlot{}, videoDurationMinutes, timezone | 動態時段生成配置 |
| `AutoChatMessage` | id, timeSec, name, message | 依影片時間觸發的機器人訊息 |
| `CTAEvent` | id, showAtSec, hideAtSec, buttonText, position?, color?, showCountdown | 促銷疊層，支援 on_video / below_video |
| `Registration` | id, webinarId, name, email, phone?, assignedSlot?, slotExpiresAt? | 每人每場唯一（email 查重） |
| `Order` | id, webinarId, email, stripeSessionId, activationCode?, status, productPackageId?, salesCode? | 狀態機：pending → paid → fulfilled |
| `VideoFile` | id, filename, muxAssetId, muxPlaybackId, playbackUrl, status, duration | Mux 上傳追蹤 |
| `ChatMessageData` | id, webinarId, name, message, timestamp | 真實用戶聊天訊息 |

### Storage Layer

- `src/lib/supabase.ts` — Supabase client（lazy-init proxy）
- `src/lib/db.ts` — CRUD 函數，自動 snake_case ↔ camelCase 轉換
- **Tables：** `webinars`, `registrations`, `chat_messages`, `orders`, `video_files`, `events`
- **JSONB 欄位：** `auto_chat`, `cta_events`, `highlights`, `subtitle_cues`, `evergreen`（隨 parent webinar 讀寫）
- **Atomic lock：** `updateOrderStatus(id, fromStatus, toStatus)` 防止重複履約

### Purchase Fulfillment

兩條履約路徑共用 `src/lib/fulfillment.ts`：

1. **Stripe webhook**（`/api/checkout/webhook`）— 主要路徑
2. **Session-status polling**（`/api/checkout/session-status`）— 備用路徑

流程：驗證付款 → atomic lock (pending→paid) → 從 Google Sheets 領取啟用碼 → 更新 order → 寄確認信。失敗時 rollback 為 pending 讓 Stripe 重試。

### Activation Codes

`src/lib/google-sheets.ts` 從預填的 Google Sheet 領取啟用碼（race-condition safe，最多 3 次重試）。`GOOGLE_SERVICE_ACCOUNT_KEY` 未設定時拋錯（無 fallback）。

## API Routes

### Public

| Endpoint | Methods | 說明 |
|----------|---------|------|
| `/api/webinar` | GET | 列出所有 webinar |
| `/api/webinar/[id]` | GET | 單一 webinar + registrationCount |
| `/api/webinar/[id]/chat` | GET, POST | 聊天訊息 CRUD + SSE 廣播 |
| `/api/webinar/[id]/chat/stream` | GET | SSE 即時聊天串流 |
| `/api/webinar/[id]/next-slot` | GET | 計算 evergreen 時段 |
| `/api/webinar/[id]/reassign` | POST | 錯過時段後重新指派 |
| `/api/register` | POST | 報名（email 查重、evergreen-aware、寄確認信） |
| `/api/checkout/create-session` | POST | 建立 Stripe Embedded Checkout session |
| `/api/checkout/session-status` | GET | 輪詢 Stripe 狀態 + 備用履約 |
| `/api/checkout/webhook` | POST | Stripe webhook 主要履約 |
| `/api/subtitles/generate` | POST | Whisper 轉錄 → 字幕生成（支援 CJK） |
| `/api/subtitles/logs` | GET | 字幕生成日誌 |
| `/api/cron/reminders` | GET | 24h/1h 郵件提醒（CRON_SECRET 保護） |
| `/api/cron/orders-sync` | GET | 訂單同步至 Google Sheets（CRON_SECRET 保護） |

### Admin（middleware 保護 `/admin/*` 和 `/api/admin/*`）

| Endpoint | Methods | 說明 |
|----------|---------|------|
| `/api/admin/login` | POST | 密碼認證，設定 session cookie |
| `/api/admin/logout` | POST | 清除 session cookie |
| `/api/admin/webinar` | GET, POST | 列出 / 建立 webinar |
| `/api/admin/webinar/[id]` | GET, PUT, DELETE | CRUD（GET 含 registrations） |
| `/api/admin/videos` | GET, POST | 影片庫 / 啟動 Mux Direct Upload |
| `/api/admin/videos/[id]` | PATCH, DELETE | 更新 / 刪除影片 |
| `/api/admin/videos/[id]/status` | GET | 上傳 + 轉碼狀態輪詢 |
| `/api/admin/videos/import` | POST | 匯入既有 Mux asset |
| `/api/admin/videos/mux-assets` | GET | 列出可匯入的 Mux assets |

## Component Architecture

### Video Sync System

直播間（`live/page.tsx`）將三個系統同步到影片播放時間：

```
VideoPlayer.onTimeUpdate(currentTime)
    ├── ChatRoom — 在 timeSec 觸發 autoChat 訊息
    ├── CTAOverlay — 在 showAtSec~hideAtSec 區間顯示
    └── ViewerSimulator — 按 3 階段曲線增減觀眾列表
```

### Live Room Access Gate

Client-side 狀態機控制進場：
- **PRE_EVENT**（>30min before）→ 重定向至 lobby
- **PRE_SHOW**（≤30min, before start）→ 顯示 PreShowOverlay
- **LIVE**（started）→ VideoPlayer + muted autoplay + UnmuteOverlay
- **ENDED**（video 結束）→ 重定向至 end page

`replay=true` 參數跳過所有門檻。

### Key Components

| Component | 功能 |
|-----------|------|
| `VideoPlayer` | Video.js + HLS。禁止拖拉、container-based fullscreen、muted autoplay、late-join seeking |
| `ChatRoom` | 自動訊息觸發 + 真實用戶訊息 + SSE 串流 + late-join backfill |
| `CTAOverlay` | 時間觸發的促銷疊層，支援 on_video/below_video、倒數計時 |
| `CountdownTimer` | 3D flip 動畫倒數，多種 variant |
| `RegistrationModal` | 報名表單 + 時段選擇 + 電話國碼選擇 |
| `SidebarTabs` | 4-tab 側邊欄（Info/Viewers/Chat/Offers） |
| `ViewersTab` | 模擬觀眾列表（由 useViewerSimulator hook 驅動） |
| `SubtitleOverlay` | 影片字幕疊層（binary search 定位 cue） |
| `PreShowOverlay` / `UnmuteOverlay` / `JoinOverlay` | 播放前狀態覆蓋層 |
| `BottomBar` | 固定底部欄：標題、LIVE 徽章、觀眾數 |

### Viewer Simulation (`src/lib/viewer-simulator.ts`)

觀眾數 = 模擬觀眾列表長度（list-driven）。~200 個擬真名字池。

3 階段曲線：
1. **Hot start**（t=0）：立即載入 ~35% peak 觀眾，避免空房間
2. **Ramp → Plateau**（0 → 80% duration）：漸增至 peak，有機抖動
3. **Decline**（80% → end）：線性下降至 60% peak

Admin 配置：`viewerPeakTarget`（峰值）、`viewerRampMinutes`（爬升時間）。Auto-chat 名字在列表中受保護。

## Evergreen Countdown System

動態生成時段，讓訪客永遠看到「即將開始」的研討會。

**時段類型：**
- **Anchor slots** — Admin 設定的每日重複時間，在配置的 timezone 中解讀
- **Immediate slots** — 下一個 anchor 太遠時動態注入，對齊 :00/:15/:30/:45

**用戶狀態機：**
```
首次訪問 → 指派時段 → PRE_REG → 報名 → CONFIRMED → 時段開始 → LIVE → 影片結束 → MISSED → 重新指派
```

**Late Join：** 遲到者進入時，影片自動快轉至 `(now - slotTime)` 秒，聊天回填已過的訊息。

**Sticky Session：** localStorage 儲存 `{ visitorId, assignedSlot, expiresAt, registered, email }`，確保重整後倒數一致。

**Timezone：** `src/lib/timezone.ts` — 所有用戶端時間顯示使用 admin 配置的 timezone（IANA 字串），非瀏覽器 timezone。

## Video Storage & Delivery

上傳流程：瀏覽器 → `@mux/upchunk`（分塊可恢復上傳）→ Mux 轉碼 → HLS 自適應串流 → `stream.mux.com` CDN

Webinar 的 `videoUrl` 儲存 Mux HLS URL。Admin 也可直接貼外部 MP4/HLS URL。

## Email (`src/lib/email.ts`)

SendGrid fetch-based（無 SDK）。`SENDGRID_API_KEY` 未設定時 console log。

| 模板 | 用途 |
|------|------|
| `confirmationEmail()` | 報名確認（speaker 頭像、活動資訊、權益列表） |
| `reminderEmail()` | 24h/1h 開場提醒 |
| `followUpEmail()` | 回放連結 + CTA |
| `purchaseConfirmationEmail()` | 訂單確認 + 啟用碼 + 操作步驟 |

## Analytics (GTM / GA4)

GTM 透過 `@next/third-parties/google` 注入。所有事件經 `trackGA4()` → `window.dataLayer.push()` → GTM → GA4。

**關鍵機制：**
- **SPA pageview：** `RouteChangeTracker` 在 client-side navigation 時推送 `page_view`
- **gclid 保留：** `GclidPreserver` 將 gclid/UTM 存入 sessionStorage + cookies（middleware 設定 server-side cookie 繞過 Safari ITP）
- **跨 session 歸因：** 報名時儲存 UTM/gclid，EDM/行事曆連結攜帶 `orig_*` 參數保留原始來源

**事件清單（19 個）：** `c_scroll_depth`, `c_signup_button_click`, `sign_up`, `c_add_to_calendar`, `c_lobby_entered`, `c_lobby_duration`, `c_lobby_abandon`, `c_enter_live`, `c_video_heartbeat`, `c_video_progress`, `c_chat_message`, `c_cta_view`, `c_cta_click`, `c_cta_dismiss`, `begin_checkout`, `c_webinar_complete`, `c_end_page_cta_click`, `c_share_click`, `purchase`

## Design System

定義在 `src/styles/design-tokens.css`。

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#FAFAF7` | 暖象牙色背景 |
| `--color-surface` | `#FFFFFF` | 卡片/面板背景 |
| `--color-border` | `#E8E5DE` | 暖色邊框 |
| `--color-text` | `#1A1A1A` | 主文字 |
| `--color-gold` | `#B8953F` | 深金色強調（CTA、focus ring） |
| `--color-live` | `#ef4444` | LIVE 紅色 |

字體 Geist Sans / Geist Mono。圓角 2px / 4px / 8px。

## Key Constraints

1. **禁止影片拖拉** — 商業需求。VideoPlayer 封鎖 scrubbing、鍵盤快捷鍵、程式化 seeking
2. **Container-based fullscreen** — fullscreen wrapper `<div>` 而非 `<video>`，防止行動裝置原生控制項暴露時長
3. **SSE 聊天** — 記憶體 pub/sub broker，WebSocket 規劃中
4. **Admin 密碼認證** — HMAC-signed cookie（24h 過期），middleware 保護 admin 路由
5. **`NEXT_PUBLIC_BASE_URL` 建議設定** — 郵件連結和 Stripe 回調使用，fallback 為 Host header → `https://mike.cmoney.cc`
6. **北美華人 locale** — 電話驗證 US/Canada 10 位數，日期 `zh-CN`
7. **無 i18n** — 所有 UI 文字硬編碼簡體中文

## Known Gaps

- Picture-in-Picture 浮動迷你播放器
- WebSocket 即時聊天
- 投票 / Q&A 互動功能
- 進階 admin 分析儀表板
- OG meta tags（社群分享預覽）
- 多語言支援
