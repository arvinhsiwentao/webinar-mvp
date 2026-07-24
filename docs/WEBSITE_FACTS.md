# WEBSITE_FACTS — 給行銷側看的網站事實

> **這份文件的定位：**行銷側需要知道、但**只有讀程式碼才會知道**的網站事實。
> 它會被快照到 `Desktop\webinar-1plus3-marketing\WEBSITE_FACTS_快照.md`，讓行銷 AI 不必跨 repo 讀原始碼。
>
> **SOT 在這裡。**改了路由 / GA4 事件 / SKU / 場次之後，順手更新本檔，然後跑行銷專案的 `sync-context.ps1`。
>
> 最後驗證：2026-07-14（每一條都用 grep 從程式碼確認過）
> 2026-07-24 更新：AI Mike（Webinar 3）大改版相關條目（新增 `/activation-tutorial`、Webinar 3 結帳只留 $599、`bundle` 商品名、post-webinar 門檻 34 分）

---

## 1. 線上頁面

| 網址 | 是什麼 | 程式碼 |
|---|---|---|
| `/` | **Webinar 1** landing（真人主講影片） | `src/app/(public)/page.tsx` |
| `/free-webinar` | **Webinar 3** landing（HeyGen AI 分身主講）— A/B 對照組 | `src/app/(public)/free-webinar/page.tsx` |
| `/webinar/{1,3}/lobby` `/live` `/end` | 等候室 → 直播間 → 結束頁 | `src/app/(public)/webinar/[id]/` |
| `/checkout/{webinarId}` | 課程結帳（Stripe Embedded）。**Webinar 3 只留 $599 組合包**（`only599` 條件，強制選 bundle）；Webinar 1 仍是 4 方案 | `src/app/(public)/checkout/[webinarId]/page.tsx` |
| `/activation-tutorial` | **App 內啟用圖文教學**（下載→更多→啟用序號→看課程），含 Mux 操作影片。購買確認信與購買成功頁都導到這 | `src/app/(public)/activation-tutorial/page.tsx` |
| `/us-stock-course/author` | **$1 漏斗 LP** — 作者切角 | `src/app/(public)/us-stock-course/[angle]/` |
| `/us-stock-course/news` | 同上 — 時事切角 | 同上 |
| `/us-stock-course/feature` | 同上 — 功能切角 | 同上 |
| `/us-stock-course/checkout` | $1 結帳（免登入，只填 email） | — |
| `/us-stock-course/checkout/return` | 付款後顯示啟用序號 + 引導去 cmoney.tw 兌換 | — |
| `/us-stock-course/tutorial` | 啟用教學（手機版 19 步 / 電腦版 10 步） | — |

## 2. ⚠️ 3 個切角現在「共用同一支前導片和同一套 hero 文案」

**這一條跟 `PROJECT_BACKGROUND.md` 講的不一樣，以程式碼為準。**

`PROJECT_BACKGROUND.md` 寫「3 LP 課程介紹 body 完全一樣，**只有前導影片 Hook 不同**」。
但程式碼（`src/lib/usStockCourse.ts:87`）現在是：

```
const SHARED_INTRO_HLS = 'https://stream.mux.com/Hy02CXc024kEbiWUjnS8WsWnx9Vq8IUXDgiF9b5h24wjs.m3u8';
// All 3 angles share the same intro hook video (single unified hook).
```

三個切角**共用同一支前導片 + 同一套 hero 文案**，實際差異只剩：

| 切角 | QR code | App onelink（歸因用） |
|---|---|---|
| `author` | `/images/us-stock/qr-author.webp` | `https://cmoneymike.onelink.me/ZEaW/w7ntvnjd` |
| `news` | `/images/us-stock/qr-news.webp` | `https://cmoneymike.onelink.me/ZEaW/w873ef51` |
| `feature` | `/images/us-stock/qr-feature.webp` | `https://cmoneymike.onelink.me/ZEaW/yub9ufpa` |

**行銷意涵：**目前線上的 A/B 差異只在**廣告端**（不同 campaign 導不同 angle URL），**落地頁本身是同一個**。如果要恢復「每個切角不同前導片」的設計，得改 `ANGLE_CONFIG` 的 `introVideoHls`。

## 3. ⚠️⚠️ GA4 事件隔離規則（最容易踩爆的雷）

**$1 漏斗絕對不能發 `purchase` / `begin_checkout`。**

兩條漏斗共用同一個 GA4 資源。若 $1 漏斗沿用標準電商事件，$1 成交會污染 webinar（$599）的 Google Ads Smart Bidding —— **即使用不同廣告帳號也一樣，根因在 GA4 事件層。**

| 漏斗 | 用的事件 |
|---|---|
| **Webinar（$599）** | `purchase`、`begin_checkout`、`c_cta_click`、`c_enter_live`、`c_webinar_complete`、`c_end_page_cta_click`、`c_confirm_click` |
| **$1 漏斗** | `c_us_stock_course_begin_checkout`（進購買頁）、`c_us_stock_course_add_payment_info`（Stripe 表單渲染）、`c_us_stock_course_purchase`（購買完成）、`c_us_stock_course_cta_click` |

**任何新的追蹤需求都必須遵守這條分界。**要加 $1 漏斗的事件，一律用 `c_us_stock_course_` 前綴。

**取捨（已知）：**$1 漏斗因此**沒有** GA4 內建的 Monetization / 購買漏斗報表。這是刻意換來「兩條漏斗出價不互相打架」。

## 4. ⚠️ BigQuery 取 `webinar_id` 的雷

GA4 把**數字 id（`'1'` / `'3'`）存進 `int_value`**，**UUID 存進 `string_value`**，而且數字那批是多數。

只讀 `string_value` 會漏掉大半資料。查詢必須：

```sql
COALESCE(string_value, CAST(int_value AS STRING))
```

## 5. A/B 場次對應

| 標籤 | 主講 | Landing | UUID |
|---|---|---|---|
| **Webinar 1** | 真人 | `/` | `50ddbae7-c89b-406a-b0c3-afe154b3671c` |
| **Webinar 3** | HeyGen AI 分身 | `/free-webinar` | `dbdf8b45-5f80-47d3-82c0-4a10a184dee4` |

**「Webinar 2」跳過不用** —— created_at 索引 2 被 $1 漏斗的隱形容器 webinar 佔用了（標題「請勿刪除」，永不出現在任何網址，只是讓 $1 訂單的 FK 有地方掛）。

對帳：`orders.webinar_id` 存的是 UUID → Webinar 3 的訂單 = `WHERE webinar_id = 'dbdf8b45-...'`

## 6. 商品與價格

| 商品 ID | 名稱 | 價格 | 賣在哪 |
|---|---|---|---|
| `us-stock-1plus3` | $1 美股入门套餐｜9 章课程 + 3 天 App VIP | **$1**（原價標 $49） | `/us-stock-course/checkout` |
| `bundle` | 实战组合包－Mike App年方案 + ETF/期权课程 | $599 | `/checkout/{webinarId}`（Webinar 3 唯一方案） |
| `etf-options` | ETF+期权课程组合 | $249 | 同上 |
| `options` | 期权策略课程 | $99 | 同上 |
| `app-monthly` | MIKE是麦克 APP 月方案 | $49 | 同上 |

**$1 商品一次發兩組序號**（`codeSheets`）：
- 课程启用序号 ← Google Sheet 分頁 `掘金1+3_課程序號`
- App 3 天 VIP 启用序号 ← Google Sheet 分頁 `掘金1+3_App序號`

權限包編號 `68713`、銷售編號 `3320`。

## 7. 文案改在哪（行銷改文案 → 工程要動的檔案）

| 文案 | 程式碼位置 | SOT 文件 |
|---|---|---|
| $1 LP 頁面（3 切角） | `src/lib/usStockCourse.ts`（`ANGLE_CONFIG` + body 常數） | 行銷專案 `LP_B_COPY.md` |
| Webinar 1 landing | `src/app/(public)/page.tsx`（inline） | — |
| Webinar 3 landing | `src/app/(public)/free-webinar/page.tsx`（inline） | — |
| 各種信件 | `src/lib/email.ts`、`src/lib/webinar-email-content.ts` | — |

**注意：**LP_B 文案在程式碼裡是**寫死的 TS 常數**，不是從 markdown 讀的。改 `LP_B_COPY.md` **不會**自動生效，要工程手動同步過去。

## 8. Post-webinar EDM 三道觸發

看完直播的人會收到導向 $1 LP 的 EDM。三個觸發點：
1. 點 CTA
2. 走到結束頁
3. 離開時觀看時長 ≥ 34 分鐘（原 23 分，2026-07-24 調高；`live/page.tsx` 全域，非分場）

去重靠 audit log + DB unique constraint。名單即時寫進 Supabase `post_webinar_email_recipients`，並同步 append 到 Google Sheet（行銷用）。

**注意：**Webinar 1 的 post-webinar EDM 目前是**停寄信、但仍記錄再行銷名單**的狀態。

## 9. 影片託管

網站的影片**全部走 Mux HLS 串流**。上 Mux 的來源是 **Google Drive 公開下載網址**，不是本機檔案 —— `scripts/upload-*.ts` 把 Drive URL 丟給 Mux，Mux 自己去抓。

要換影片：上傳 Drive → 拿 file ID → 改腳本 → 跑 → 拿 playbackId 填進程式碼。

母帶備份在 `Desktop\webinar-media`（純封存，網站不讀）。

## 10. 部署

Zeabur（容器化，持久 Node.js 進程）。**不是 serverless**，所以沒有 timeout 限制、in-process scheduler 可用。Env vars 在 Zeabur dashboard 設。

---

## 相關專案

| 專案 | 位置 |
|---|---|
| **webinar-1plus3-marketing** | `Desktop\webinar-1plus3-marketing` — 行銷素材與策略。其總背景快照在本 repo `docs/marketing/PROJECT_BACKGROUND_快照.md` |
| **webinar-media** | `Desktop\webinar-media` — 母帶與簡報封存 |
| **ads-ai-agent** | `Desktop\ads-ai-agent` — 廣告投放 AI Agent + 成效儀表板 |
