# us-stock-course（$1 / 1+3 直購漏斗）— 進度與待辦

> 建立：2026-06-11。實作完成、`npm run build` 通過。本檔追蹤「還沒做完 / 上線前要補」的事。
> 設計細節見 `docs/architecture.md` → 「us-stock-course 漏斗」；決策見 `docs/decisions.md` 2026-06-11；
> 完整計畫見 `C:\Users\user1\.claude\plans\us-stock-course-polished-papert.md`。

## ✅ 已完成（程式）
- 路由 `/us-stock-course/{author,news,feature}`（SSG）、`/checkout`、`/checkout/return`
- 共用 body `UsStockCourseBody`、`IntroVideoPlayer`（Mux HLS + hls.js + 原生 controls）
- 精簡結帳（免登入、固定 $1 SKU）、兌換頁（序號 + cmoney.tw 5 步，深色金色）
- `products.ts` 加 `us-stock-1plus3`（不在 `getAllProducts()`）
- `create-session` 參數化 return_url（`funnel:'us_stock_course'`）+ order metadata 標 funnel
- `StickyNav` 加 `navItems`/`ctaLabel` prop
- GA4 專屬事件 `c_us_stock_course_*`（begin_checkout / add_payment_info / purchase / cta_click），purchase value 用真實 $1
- 文件：architecture.md / decisions.md / CLAUDE.md 已更新

## ⛔ Phase 0 前提（上線前必補）
- [x] **`STRIPE_PRICE_US_STOCK_1PLUS3`** — ✅ 2026-06-12 `price_1ThJmaGXZySy2dKhrUjpvgE8`（LIVE，$1 one-time，product `prod_UghAD8vcugFhRx`「Mike是麦克 - US$1 美股入门课」）。已寫入 `.env.local`
- [x] **`US_STOCK_CONTAINER_WEBINAR_ID`** — ✅ 2026-06-12 `147249ab-97d6-4f6c-9043-88ebcc10834c`（隱形 draft 容器，`scripts/create-us-stock-container.ts`）。已寫入 `.env.local`。create-session 已驗證回 `cs_live_…`
- [x] **`products.ts` 的 `us-stock-1plus3`** — ✅ 2026-06-12 `productPackageId=68713`（權限包）、`salesCode=3320`（銷售）；**發兩組序號**（codeSheets）：課程 `掘金1+3_課程序號` + App `掘金1+3_App序號`。fulfillment 改成支援一商品多 sheet（`fulfillment.ts`）
- [x] **序號 Sheet 內容** — ✅ 2026-06-12 兩分頁各 12 組假序號可用（`scripts/check-us-stock-codes.ts` 驗證）。在試算表 `1W9tK97n004XI7UbN_VuECcb_ZVVWmwa31sWRadBxZOQ`。
- [x] **沙盒隔離測試環境** — ✅ live key 不動；新增 us-stock 專屬 sandbox key：`STRIPE_US_STOCK_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_US_STOCK_PUBLISHABLE_KEY`，test price `price_1ThJrjGXZySy2dKh1421gni3`。`getStripeForFunnel`/`getStripeForSessionId`（`lib/stripe.ts`）依 funnel / `cs_test_` 前綴分流。create-session 已驗證回 `cs_test_`。

### 🔧 Zeabur 環境變數（在 dashboard 設定）
> 變數**名稱固定用正式的**，值可先放測試的（程式只認名稱）。其他既有的 app 變數（`STRIPE_SECRET_KEY`、`SUPABASE_*`、`STRIPE_WEBHOOK_SECRET`、舊 `STRIPE_PRICE_*`）webinar 漏斗已在用，不用動。

| 變數名 | 測試階段值 | 正式（LIVE）值 |
|---|---|---|
| `STRIPE_PRICE_US_STOCK_1PLUS3` | `price_1ThJrjGXZySy2dKh1421gni3`（test） | `price_1ThJmaGXZySy2dKhrUjpvgE8`（live） |
| `STRIPE_US_STOCK_SECRET_KEY` | `sk_test_…`（見本機 `.env.local`） | **刪除**（沒此 key → 自動 fallback live `STRIPE_SECRET_KEY`） |
| `NEXT_PUBLIC_STRIPE_US_STOCK_PUBLISHABLE_KEY` | `pk_test_…`（見 `.env.local`） | **刪除** |
| `US_STOCK_CONTAINER_WEBINAR_ID` | `147249ab-97d6-4f6c-9043-88ebcc10834c` | 同左（不變） |
| `NEXT_PUBLIC_BASE_URL` | `https://mike.cmoney.cc` | 同左（不變） |

- **金流分流邏輯**：有設 `STRIPE_US_STOCK_SECRET_KEY` → 走沙盒；刪掉 → 走 live。轉正式只動 2 件事：刪兩個 `*_US_STOCK_*` key + price 換 live。
- ⚠️ `NEXT_PUBLIC_*` 是 **build 時編進前端**，Zeabur 改完要 **重新 build/redeploy** 才生效。
- ⚠️ 沙盒測試時兩個序號分頁仍是**假序號**，換真序號前勿開真實廣告。

### 🔄 測完上線（us-stock 切回 LIVE）
- [ ] `.env.local` 刪掉 `STRIPE_US_STOCK_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_US_STOCK_PUBLISHABLE_KEY` 兩行（funnel 自動 fallback 回 live `stripe`）
- [ ] `STRIPE_PRICE_US_STOCK_1PLUS3` 改回 LIVE `price_1ThJmaGXZySy2dKhrUjpvgE8`
- [ ] Zeabur 正式環境設這 env：`STRIPE_PRICE_US_STOCK_1PLUS3`（live）、`US_STOCK_CONTAINER_WEBINAR_ID`、`NEXT_PUBLIC_BASE_URL=https://mike.cmoney.cc`（email 教學連結 = 此網域；不設則 fallback 也是 mike.cmoney.cc）
- 註：本機 email 連結是 `localhost` 屬正常（`.env.local` 的 `NEXT_PUBLIC_BASE_URL`）；return 頁按鈕是相對路徑、自動跟網域。FROM_NAME us-stock 寄件者已用程式覆蓋成「Mike US$1美股入门课」，不需設 env。
- [ ] 容器 webinar UUID 在正式 Supabase 也要存在（目前那筆是同一個 prod DB，已 OK）
- [ ] webhook：us-stock 走 polling fulfillment 即可；若要 webhook 補強，需另設 live webhook（現有 webhook 用 live secret，會處理 live us-stock 訂單）
- ⚠️ 正式 LIVE：完整測試購買 = 真實 $1（可退）。
- [x] **`ANGLE_CONFIG[*].introVideoHls`** — ✅ 2026-06-11 3 支 hook 已上 Mux 並填入；poster 用 Mux thumbnail。Asset/playback：author `hUPl34zJltX96FmBOKOw372UC8N00Qi9lB6mjByCV13M`、news `qzsDylu8pTAFI8xRhqavri1z9dTcmSHt6TZEAtXwZsw`、feature `Q36DQ9ig9XZd5ObGj7lxeBNmleDSEUC7cfFv01wmmp7c`。上傳腳本 `scripts/upload-intro-videos-to-mux.ts`
- [ ] **GA4 後台** — 把 `c_us_stock_course_begin_checkout` / `_add_payment_info` / `_purchase` 標成「關鍵事件」→ 匯入 $1 的 Google Ads 帳號當轉換動作

## 🧪 後端端到端測試（尚未執行）
> 需先備齊上面 Stripe 測試 price + Sheet 測試序號 + 容器 row。步驟見計畫 §7。
- [ ] Stripe 測試模式 + `stripe listen --forward-to localhost:3000/api/checkout/webhook`
- [ ] `/us-stock-course/author?gclid=TEST&utm_*` → 頁面渲染、GTM DebugView 有 `c_us_stock_course_begin_checkout`（進結帳頁時）
- [ ] 填 email → Stripe 表單渲染 → `c_us_stock_course_add_payment_info`
- [ ] 刷 `4242 4242 4242 4242` → 導向 return → `c_us_stock_course_purchase`（value=1、帶 gclid/utm）恰一次；序號顯示 + 複製 + cmoney.tw 5 步
- [ ] DB：order `webinar_id`=容器 UUID、pending→paid→fulfilled、`metadata.funnel='us_stock_course'`、`metadata.source='us_stock_course_author'`；Sheet 該列標記已領；確認信寄出
- [ ] 冪等：同 email 再買 → 409 已購面板；重刷 return → 同碼、不重複 purchase
- [ ] 失敗演練：清空 Sheet 分頁 → 付款 → order rollback pending → return 顯示處理中/timeout；回填 + `cron/orders-sync` 補單

## 🎨 前端待辦
- [x] ~~暫時 poster 佔位~~ → 已改用各影片的 Mux thumbnail（`image.mux.com/{id}/thumbnail.webp`），不需自備封面圖；如要客製封面再換
- [ ] **文案迭代流程**：先定 **author 切角**（hero 標題/副標/hook + body 各區塊文案），定版後 **news / feature 比照辦理**（只改 `ANGLE_CONFIG` 的 hero/hook，body 共用）
- [ ] 看完整體版型後可能微調：配色、CTA 文字、區塊順序、hero 影片框比例

## 📌 備註
- 新漏斗**刻意不發**標準 `purchase`/`begin_checkout`，避免污染 webinar 的 Google Ads Smart Bidding（同一 GA4 資源）。改動任何事件前先看 decisions.md 2026-06-11。
- 網址全程不出現 "webinar"；容器 webinar 是隱形 DB row。
