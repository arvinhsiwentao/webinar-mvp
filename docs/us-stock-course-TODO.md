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

## ⛔ Phase 0 前提（上線前必補，目前是 placeholder）
- [ ] **`STRIPE_PRICE_US_STOCK_1PLUS3`** env — $1 SKU 的 Stripe Price ID（現為 `price_REPLACE_ME_US_STOCK_1PLUS3`）
- [ ] **`US_STOCK_CONTAINER_WEBINAR_ID`** env — 建一筆容器 `webinars` row，填它的 UUID（現為 `TODO_US_STOCK_CONTAINER_WEBINAR_UUID`）
      ⚠️ 沒填這個，結帳頁按「前往付款」會失敗（create-session 找不到容器 → 404）
- [ ] **`products.ts` 的 `us-stock-1plus3`** — `sheetName` / `productPackageId` / `salesCode` 換成 CMoney 真值（現為 `TODO_*`）；序號 Google Sheet 分頁要預填可用兌換序號
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
