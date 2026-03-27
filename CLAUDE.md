# CLAUDE.md

## 這是什麼

模擬直播（Simulive）研討會平台 — 播放預錄影片，搭配自動聊天、CTA 彈窗、觀眾數模擬，讓用戶相信自己在看真實直播。目標市場：北美華人，UI 簡體中文（zh-CN）。參考平台：JoinLive (live.yongmingu.com)

## 核心幻覺原則

所有功能設計必須維護「這是真實直播」的幻覺，無例外：

- ❌ 絕不顯示影片總時長
- ❌ 絕不允許用戶拖拉進度條到當前播放位置之後
- ❌ 絕不使用原生全螢幕（會暴露進度條）— 用 container-based fullscreen
- ✅ 進度只反映「開播以來經過的時間」
- ✅ 所有播放互動都當作即時直播處理

每次修改影片播放、聊天、觀眾數相關功能時，重新審視是否破壞了這個幻覺。

## 工作流程規則

1. 先讀程式碼再改。先想清楚再動手
2. **重大變更前先跟我確認**
3. 每步給高階說明，不要只丟程式碼
4. 改動最小化 — 影響範圍越小越好
5. **結構性變更後更新 `docs/architecture.md`**（hooks 會自動提醒）
6. **非顯而易見的決策記錄到 `docs/decisions.md`**（日期 + 決策 + 原因，3-5 行）
7. **不要把文件或定義當作運行時行為的證據** — 用 grep 驗證實際使用
8. 用初學者能理解的白話文解釋
9. 涉及外部 API 時，用 web search 查最新文件，不要依賴訓練資料
10. 用第一性原理思考。如果動機和目標不清晰，停下來討論。如果路徑不是最短的，告訴我並建議更好的辦法
11. 使用繁體中文寫文件

## 指令

```bash
npm run dev      # Dev server on localhost:3000
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
npm test         # Subtitle pipeline tests (tsx --test)
```

## 技術棧

| 類別 | 技術 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript (strict) |
| 樣式 | Tailwind CSS v4 (PostCSS plugin, `@import "tailwindcss"`) |
| 影片 | Video.js + HLS.js（動態載入，無 SSR） |
| 資料庫 | Supabase (Postgres) — service role key, server-side only |
| 影片託管 | Mux（Direct Upload + HLS 串流 + CDN） |
| 支付 | Stripe（Embedded Checkout） |
| 郵件 | SendGrid（fetch-based, 無 SDK） |
| 啟用碼 | Google Sheets API（預填啟用碼領取） |
| 分析 | GTM + GA4（19 個自訂事件） |
| Path alias | `@/*` → `./src/*` |

## 環境變數

| 變數 | 必要性 | 用途 |
|------|--------|------|
| `SUPABASE_URL` | 必要 | Supabase 連線 |
| `SUPABASE_SERVICE_ROLE_KEY` | 必要 | Supabase 服務金鑰 |
| `ADMIN_PASSWORD` | 必要 | 管理後台密碼 |
| `STRIPE_SECRET_KEY` | 必要 | Stripe 伺服器端金鑰 |
| `STRIPE_WEBHOOK_SECRET` | 必要 | Stripe webhook 簽名驗證 |
| `STRIPE_PRICE_ID` | 必要 | Stripe 商品價格 ID |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 必要 | Stripe 前端金鑰 |
| `MUX_TOKEN_ID` | 必要 | Mux API token |
| `MUX_TOKEN_SECRET` | 必要 | Mux API secret |
| `SENDGRID_API_KEY` | 選用 | 郵件發送（缺少時 console log） |
| `FROM_EMAIL` / `FROM_NAME` | 選用 | 寄件人資訊 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | 選用 | Google Sheets 啟用碼（缺少時 webhook 重試） |
| `CRON_SECRET` | 選用 | Cron job 認證 |
| `NEXT_PUBLIC_GTM_ID` | 選用 | Google Tag Manager |
| `NEXT_PUBLIC_BASE_URL` | 選用 | 公開 URL（郵件連結、Stripe 回調） |

## 頁面流程

```
Landing (/)  →  報名 (modal)  →  等候室 (/webinar/[id]/lobby)  →  直播間 (/webinar/[id]/live)  →  結束頁 (/webinar/[id]/end)
                                                                                                        ↓
                                                                                                   結帳 (/checkout/[webinarId])  →  付款確認 (/checkout/[webinarId]/return)
```

Landing page 硬編碼 webinar ID `1`。管理後台在 `/admin`。詳見 `docs/architecture.md`。

## 設計系統

淡雅象牙色基底 + 深金色強調。定義在 `src/styles/design-tokens.css`：背景 `#FAFAF7`、金色 `#B8953F`、文字 `#1A1A1A`。字體 Geist Sans/Mono。極簡圓角（2-8px）。

## 部署

- **平台：** Zeabur（容器化，持久 Node.js 進程，非 serverless）
- **意義：** 無 serverless timeout 限制，in-process scheduler 可用
- **不使用 `vercel.json`** — Cron 需外部 HTTP 觸發
- **Env vars** 在 Zeabur dashboard 設定

## 重要約束

- **禁止影片拖拉** — 商業需求，不是 bug
- **SSE 聊天**（非 WebSocket）— 記憶體 pub/sub broker
- **Admin 密碼認證** — `ADMIN_PASSWORD` + HMAC cookie（24h）。Middleware 保護 `/admin/*` 和 `/api/admin/*`
- **北美華人 locale** — 電話驗證 US/Canada 10 位數，日期 `zh-CN`
- **Remote images** — `next.config.ts` 允許 `*.unsplash.com` 和 `image.mux.com`

## 文件系統

- `docs/architecture.md` — 系統架構詳細文件（hooks 自動維護）
- `docs/decisions.md` — 架構決策日誌（只追加）

規則：CLAUDE.md 是摘要，architecture.md 是細節，兩者不重複。
