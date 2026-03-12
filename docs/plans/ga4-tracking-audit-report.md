# 偽直播研討會平台 — 埋點審核與廣告追蹤優化報告

**審核日期：** 2026-03-12
**審核範圍：** GA4 事件埋點、GTM 配置、Google Ads 轉換追蹤、歸因機制
**平台：** 北美華人偽直播研討會平台（產品售價 $599 USD）
**GTM 容器：** GTM-N26ZGZKC
**追蹤架構：** 客戶端 `dataLayer.push()` → GTM → GA4（無伺服器端追蹤）

---

## 埋點盤點表（技術盤點）

### 總覽
- **總事件數**: 16 個 GA4 事件（4 個推薦事件 + 12 個自訂事件）+ 2 個歸因機制
- **追蹤入口**: `src/lib/analytics.ts` 的 `trackGA4()` 函數
- **類型安全**: TypeScript `GA4EventMap` mapped type 確保參數正確性
- **環境區分**: 生產環境推送至 GTM dataLayer；開發環境 console.log

---

### 1. 落地頁 (Landing Page) — `src/app/(public)/page.tsx`

| # | 事件名稱 | 觸發條件 | 事件參數 | 程式碼位置 |
|---|---------|---------|---------|-----------|
| A | `c_scroll_depth` | 滾動達 10%, 20%, ...100% 各觸發一次 | `{ percent: number, page: "landing" }` | L125-141 |
| B | `c_signup_button_click` | 點擊 Hero 區「觀看講座」按鈕 | `{ button_position: "hero", webinar_id: "1" }` | L164-172 |
| C | `c_signup_button_click` | 點擊 Footer 區「鎖定名額」按鈕 | `{ button_position: "footer", webinar_id: "1" }` | L359-364 |

**程式碼片段：**
```typescript
// 滾動追蹤（IntersectionObserver）
trackGA4('c_scroll_depth', { percent: m, page: 'landing' })

// 按鈕點擊
trackGA4('c_signup_button_click', { button_position: source, webinar_id: DEFAULT_WEBINAR_ID })
```

---

### 2. 註冊流程 (Registration) — `src/components/registration/useRegistrationForm.ts`

| # | 事件名稱 | 觸發條件 | 事件參數 | 程式碼位置 |
|---|---------|---------|---------|-----------|
| D | `sign_up` | 表單提交成功，後端驗證通過 | `{ method: "webinar_registration_hero"/"webinar_registration_footer"/"webinar_registration", webinar_id: string }` | L54-57 |

**程式碼片段：**
```typescript
trackGA4('sign_up', {
  method: source ? `webinar_registration_${source}` : 'webinar_registration',
  webinar_id: String(webinarId)
})
```

---

### 3. 等候室 (Lobby) — `src/app/(public)/webinar/[id]/lobby/page.tsx`

| # | 事件名稱 | 觸發條件 | 事件參數 | 程式碼位置 |
|---|---------|---------|---------|-----------|
| E | `c_enter_live` | 倒計時完成後自動進入 | `{ webinar_id, entry_method: "countdown_auto" }` | L82-85 |
| F | `c_enter_live` | 點擊「進入直播間」按鈕 | `{ webinar_id, entry_method: "button" }` | L87-89 |
| G | `c_enter_live` | 瀏覽器 tab 返回 foreground 且倒計時已過 | `{ webinar_id, entry_method: "countdown_auto" }` | L94-108 |
| H | `c_enter_live` | 進入 lobby 時 evergreen 狀態為 LIVE | `{ webinar_id, entry_method: "redirect_live" }` | L44-48 |
| I | `c_add_to_calendar` | 點擊 Google 日曆按鈕 | `{ method: "google", webinar_id }` | L304-309 |
| J | `c_add_to_calendar` | 點擊 iCal 下載按鈕 | `{ method: "ical", webinar_id }` | L110-127 |

---

### 4. 直播間 (Live Room) — `src/app/(public)/webinar/[id]/live/page.tsx`

| # | 事件名稱 | 觸發條件 | 事件參數 | 程式碼位置 |
|---|---------|---------|---------|-----------|
| K | `join_group` | 進入直播間頁面（mount 觸發一次） | `{ group_id: webinarId, webinar_id: webinarId }` | L225-230 |
| L | `c_video_heartbeat` | 影片播放中，每 60 秒觸發 | `{ webinar_id, current_time_sec, watch_duration_sec }` | L236-251 |
| M | `c_video_progress` | 影片進度達 5%, 10%, 15%...100% | `{ webinar_id, percent: number }` | L254-267 |
| N | `c_chat_message` | 用戶在聊天室送出訊息 | `{ webinar_id, video_time_sec }` | L297-315 |
| O | `c_cta_view` | CTA 浮窗進入可見狀態 | `{ webinar_id, cta_id, cta_type, video_time_sec }` | L523-541 |
| P | `c_cta_dismiss` | 用戶關閉 CTA 浮窗 | `{ webinar_id, cta_id, cta_type, video_time_sec }` | L523-541 |
| Q | `begin_checkout` | 點擊 CTA 按鈕開始結帳 | `{ currency: "USD", value: 599, items: GA4Item[], cta_id, video_time_sec, source: "live" }` | L374-411 |
| R | `c_video_heartbeat` | 影片播放結束（最終心跳） | `{ webinar_id, current_time_sec, watch_duration_sec }` | L275-291 |

---

### 5. 結束頁 (End Page) — `src/app/(public)/webinar/[id]/end/page.tsx`

| # | 事件名稱 | 觸發條件 | 事件參數 | 程式碼位置 |
|---|---------|---------|---------|-----------|
| S | `c_webinar_complete` | 進入結束頁（自動觸發） | `{ webinar_id, watch_duration_sec? }` | L25-48 |
| T | `c_end_page_cta_click` | 點擊結束頁 CTA 按鈕 | `{ webinar_id, button_text }` | L107-112 |
| U | `begin_checkout` | 結束頁 CTA 點擊（同時觸發） | `{ currency: "USD", value: 599, items: GA4Item[], source: "end" }` | L113-118 |
| V | `c_share_click` | 點擊 Facebook 分享按鈕 | `{ webinar_id, platform: "facebook" }` | L155-166 |
| W | `c_share_click` | 點擊 Twitter 分享按鈕 | `{ webinar_id, platform: "twitter" }` | L167-176 |

---

### 6. 結帳完成 (Purchase) — `src/app/(public)/checkout/[webinarId]/return/page.tsx`

| # | 事件名稱 | 觸發條件 | 事件參數 | 程式碼位置 |
|---|---------|---------|---------|-----------|
| X | `purchase` | Stripe 結帳成功返回頁面（useRef 防重複） | `{ transaction_id, value, currency, items: GA4Item[] }` | L34-49 |

---

### 7. 歸因機制 — `src/components/analytics/GclidPreserver.tsx`

| 機制 | 觸發條件 | 儲存位置 | 儲存項目 |
|------|---------|---------|---------|
| GCLID 保存 | URL 包含 `gclid` 參數 | sessionStorage | `gclid` |
| UTM 保存 | URL 包含 `utm_source` 參數 | sessionStorage | `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` |

---

### 8. 追蹤參數標準化

| 參數名 | 類型 | 說明 | 使用事件 |
|--------|------|------|---------|
| `webinar_id` | string | 研討會 ID | 所有事件 |
| `video_time_sec` | number | 影片播放位置（秒） | begin_checkout, c_cta_view, c_cta_dismiss, c_chat_message |
| `current_time_sec` | number | 當前播放位置（秒） | c_video_heartbeat |
| `watch_duration_sec` | number | 總觀看時間（秒） | c_video_heartbeat, c_webinar_complete |
| `percent` | number | 百分比（0-100） | c_scroll_depth, c_video_progress |
| `currency` | string | 貨幣代碼（USD） | begin_checkout, purchase |
| `value` | number | 金額 | begin_checkout, purchase |
| `items` | GA4Item[] | 商品陣列 | begin_checkout, purchase |
| `transaction_id` | string | Stripe session ID | purchase |
| `button_position` | string | 按鈕位置（hero/footer） | c_signup_button_click |
| `entry_method` | string | 進入方式 | c_enter_live |
| `method` | string | 日曆/註冊方式 | sign_up, c_add_to_calendar |
| `platform` | string | 社交平台 | c_share_click |
| `source` | string | 結帳來源（live/end） | begin_checkout |

---

### 9. 未實作的追蹤

| 項目 | 狀態 |
|------|------|
| Facebook/Meta Pixel | ❌ 未實作 |
| TikTok Pixel | ❌ 未實作 |
| LinkedIn Insight Tag | ❌ 未實作 |
| 伺服器端事件追蹤 | ❌ 未實作（/api/track 已移除） |
| GA4 Measurement Protocol | ❌ 未實作 |
| 管理後台追蹤 | ❌ 未實作 |

---

## 行銷投手專家審核報告

### 第一部分：用戶旅程漏斗完整性評估

#### 漏斗階段對照表

| 漏斗階段 | 對應事件 | 完整性 | 評語 |
|---------|---------|--------|------|
| **曝光/點擊** | Google Ads 自動追蹤 | ⚠️ 部分 | GCLID 已捕獲但未回傳，歸因鏈斷裂 |
| **落地頁瀏覽** | `page_view` (GA4自動) + `c_scroll_depth` | ✅ 良好 | 滾動深度 10% 遞增，能判斷頁面參與度 |
| **註冊意圖** | `c_signup_button_click` | ✅ 良好 | 區分 hero/footer 位置，可用於按鈕 A/B 測試 |
| **註冊完成** | `sign_up` | ⚠️ 部分 | 缺少表單開始填寫事件，無法計算表單放棄率 |
| **等候室** | `c_add_to_calendar` | ⚠️ 薄弱 | 缺少等候室頁面停留、離開頁面等事件 |
| **進入直播** | `join_group` + `c_enter_live` | ⚠️ 重複風險 | 兩個事件語義重疊，且 join_group 可能重複觸發 |
| **觀看參與** | `c_video_heartbeat` + `c_video_progress` | ✅ 良好 | 心跳 60 秒 + 進度 5% 遞增，數據粒度足夠 |
| **互動參與** | `c_chat_message` + `c_cta_view` + `c_cta_dismiss` | ✅ 良好 | CTA 顯示/關閉/點擊都有追蹤 |
| **結帳意圖** | `begin_checkout` | ✅ 良好 | 包含 source 區分來源（live/end），有 video_time_sec |
| **購買完成** | `purchase` | ⚠️ 有風險 | value 可能硬編碼，transaction_id 來源需確認 |
| **購後行為** | （無） | ❌ 缺失 | 無 thank you page 事件、無交叉銷售追蹤 |

---

#### 1. Google Ads Smart Bidding 轉換信號評估

**結論：勉強可用，但有重大風險。**

Smart Bidding（如 tROAS、tCPA）依賴兩個關鍵要素：

- **準確的轉換價值：** `purchase` 事件的 `value` 有時硬編碼為 599，如果未來有折扣碼、分期付款或多產品線，此值將失真，直接導致 ROAS 計算錯誤。
- **完整的歸因鏈：** GCLID 已捕獲到 sessionStorage 但**從未附加到轉換事件**。這意味著 Google Ads 可能依賴 cookie-based 歸因（GA4 linking），而非最精準的 GCLID 匹配。若用戶跨設備或清除 cookie，轉換將歸因失敗。

**風險等級：高。** 在 $599 客單價下，每一筆漏歸因的轉換都代表近千美元的 ROAS 失真。

#### 2. GA4 漏斗分析能力

**結論：主漏斗可建構，但中間階段有盲區。**

可建構的漏斗：
```
page_view → c_signup_button_click → sign_up → c_enter_live → begin_checkout → purchase
```

**盲區：**
- 無 `form_start` 事件 → 無法計算表單放棄率
- 等候室無獨立頁面載入/離開事件 → 無法精確計算出席率
- 缺少精確的影片退出時間點（心跳 60 秒間隔 = 最多 59 秒誤差）

#### 3. 再行銷受眾建立能力

**結論：基礎受眾可建立，但精細分群不足。**

| 受眾 | 可否建立 | 依據 |
|------|---------|------|
| 落地頁訪客（未註冊） | ✅ | page_view 有但 sign_up 無 |
| 已註冊未出席 | ⚠️ 困難 | 需交叉比對，GA4 原生不支援排除型受眾 |
| 看了 X% 影片 | ✅ | c_video_progress percent 參數 |
| 看到 CTA 但未點擊 | ⚠️ 困難 | 有 c_cta_view 但需排除 begin_checkout |
| 開始結帳未完成 | ✅ | begin_checkout 有但 purchase 無 |
| 高互動觀眾 | ✅ | c_chat_message |

**關鍵缺失：** 沒有 User ID 貫穿整個旅程。用戶註冊後關閉瀏覽器、隔天再來看直播，GA4 會視為兩個不同用戶。

#### 4. 廣告素材 A/B 測試數據支撐

- ✅ `c_signup_button_click` 的 `button_position` 可測試不同 CTA 位置效果
- ✅ `c_scroll_depth` 可評估不同落地頁版本的參與度
- ❌ 缺少「落地頁變體」標識，無法在 GA4 中直接比較 A/B 版本
- ❌ 缺少流量來源維度附加在關鍵事件上

---

### 第二部分：關鍵缺失與風險

#### 🔴 嚴重風險（直接影響廣告花費效率）

**風險 1：GCLID/UTM 歸因斷裂**
- 現狀：GCLID 和 UTM 保存到 sessionStorage，但從未附加到任何轉換事件
- 量化影響：以 $599 客單價，假設月 20 筆轉換，30% 歸因失敗 = **每月約 $3,600 ROAS 失真**
- Smart Bidding 因此可能系統性低估轉換率 → 出價過低 → 錯失流量

**風險 2：purchase 事件 value 硬編碼**
- 若有折扣/分期/多產品，ROAS 將計算錯誤
- Google Ads value-based bidding 將基於錯誤數據優化

**風險 3：join_group 重複觸發**
- 頁面重新整理可能重複觸發
- 若設為次要轉換，會灌水轉換數
- 漏斗「出席率」將被高估

#### 🟡 中等風險

**風險 4：缺少用戶身份貫穿**
- 跨 session 用戶旅程無法串聯
- GA4 User Lifetime 報表無法使用

**風險 5：等候室階段追蹤空白**
- 無法計算「註冊到出席」轉換率（偽直播平台最關鍵的中間指標之一）

**風險 6：缺少 Facebook/Meta Pixel**
- 北美華人社群 Facebook 使用率高，缺少此渠道是增長瓶頸

#### 🟢 低風險

**風險 7：無伺服器端追蹤**
- Ad Blocker 使用率約 25-30%，部分轉換丟失

**風險 8：percent 參數名稱衝突**
- `c_scroll_depth` 和 `c_video_progress` 都用 `percent`，GA4 同名參數映射到同一維度

---

### 第三部分：GTM/GA4 配置建議

#### 1. GA4 自訂維度設定

**Event-scoped 自訂維度：**

| 維度名稱 | 參數名稱 | 對應事件 | 用途 |
|---------|---------|---------|------|
| Webinar ID | `webinar_id` | 所有事件 | 區分不同研討會表現 |
| Button Position | `button_position` | c_signup_button_click | CTA 位置 A/B 測試 |
| Entry Method | `entry_method` | c_enter_live | 進入直播方式分析 |
| Video Progress | `percent` | c_video_progress | 觀看深度分析 |
| CTA ID | `cta_id` | c_cta_view, c_cta_dismiss, begin_checkout | CTA 效果分析 |
| CTA Type | `cta_type` | c_cta_view, c_cta_dismiss | CTA 類型比較 |
| Video Time (sec) | `video_time_sec` | begin_checkout, c_cta_view | 最佳 CTA 出現時機分析 |
| Checkout Source | `source` | begin_checkout | 直播間 vs 結束頁結帳 |
| Watch Duration (sec) | `watch_duration_sec` | c_webinar_complete | 觀看時長分析 |
| Share Platform | `platform` | c_share_click | 社交分享渠道 |
| Calendar Method | `method` | c_add_to_calendar | 日曆加入方式 |
| Scroll Percent | `percent` | c_scroll_depth | 落地頁參與度 |

**User-scoped 自訂維度（需新增埋點）：**

| 維度名稱 | 參數名稱 | 用途 |
|---------|---------|------|
| Registration ID | `registration_id` | 跨 session 用戶識別 |
| Registration Date | `registration_date` | 生命週期分析 |
| Traffic Source (first) | `first_traffic_source` | 首次觸達渠道 |

> ⚠️ **參數名稱衝突：** `c_scroll_depth` 和 `c_video_progress` 都用 `percent`。建議分別改為 `scroll_percent` 和 `video_percent`。

#### 2. GA4 轉換事件標記

| 事件 | 設為轉換 | 理由 |
|------|---------|------|
| `purchase` | ✅ 是 | 主要商業轉換 |
| `begin_checkout` | ✅ 是 | 結帳意圖，Smart Bidding 重要信號 |
| `sign_up` | ✅ 是 | 漏斗上層轉換，CPA 優化 |
| `c_enter_live` | ✅ 是 | 直播出席是關鍵中間指標 |
| `join_group` | ❌ 否 | 先修復重複問題 |

#### 3. Google Ads 轉換動作建議

**主要轉換（Primary）— 用於 Smart Bidding 出價：**

| 轉換動作 | GA4 事件 | 計數 | 轉換價值 | 歸因窗口 |
|---------|---------|------|---------|---------|
| 購買完成 | `purchase` | 每次一筆 | 動態（事件 value） | 點擊後 30 天 |

> **高客單價策略：** 只設一個主要轉換。設太多會稀釋信號。
>
> **進階建議：** 每月轉換量不足 30 筆時，考慮暫時將 `sign_up` 提升為主要轉換，用 tCPA 先累積數據。待月轉換 >30 筆後，切換為以 `purchase` 為主的 tROAS。這是高客單價產品的「階梯式」出價策略。

**次要轉換（Secondary）— 僅觀察用：**

| 轉換動作 | GA4 事件 | 用途 |
|---------|---------|------|
| 註冊完成 | `sign_up` | 觀察漏斗上層轉換率 |
| 出席直播 | `c_enter_live` | 觀察出席率 |
| 開始結帳 | `begin_checkout` | 觀察結帳意圖 |
| 影片觀看 50% | 自訂事件 | 觀察內容參與度 |

#### 4. 再行銷受眾建議

| 受眾名稱 | 條件 | 有效期 | 用途 |
|---------|------|--------|------|
| 落地頁訪客-未註冊 | page_view 且 NOT sign_up | 30 天 | 「您錯過了上次的研討會」 |
| 已註冊-未出席 | sign_up 且 NOT c_enter_live | 14 天 | 「您的專屬席位仍然保留」 |
| 高參與觀眾 | c_video_progress percent ≥ 50 | 30 天 | 直接推產品 |
| 看到 CTA-未結帳 | c_cta_view 且 NOT begin_checkout | 14 天 | 限時優惠 |
| **結帳放棄者** | begin_checkout 且 NOT purchase | **7 天** | **最高價值受眾** |
| 已購買客戶 | purchase | 540 天 | 排除受眾 + Lookalike 種子 |
| 互動用戶 | c_chat_message | 30 天 | 高參與度 Lookalike 種子 |

> **結帳放棄者是 $599 產品最有價值的再行銷受眾。** ROAS 通常是冷流量的 5-10 倍。

---

### 第四部分：優先級修復建議

#### P0 — 立即修復（直接影響廣告花費效率）

##### P0-1：修復 GCLID/UTM 歸因鏈 ⏱️ 2-4h

**問題：** GCLID 和 UTM 存入 sessionStorage 但從未附加到轉換事件。

**方案 A（推薦，在 GTM 中處理）：**
1. GTM 建立 Custom JavaScript 變數，從 sessionStorage 讀取 GCLID/UTM
2. 所有轉換事件的 GA4 Tag 中附加這些變數作為 event parameter

**方案 B（更穩健，在代碼中處理）：**
修改 `trackGA4()` 在 dataLayer.push 前自動從 sessionStorage 讀取並附加歸因參數。

**額外建議：** 將 GCLID 存入 first-party cookie（有效期 90 天），因為 sessionStorage 關閉瀏覽器即消失，但 GCLID 歸因窗口為 30-90 天。

**預計影響：** Google Ads 歸因準確度提升 20-40%

##### P0-2：purchase value 動態化 ⏱️ 1-2h

**修復：** purchase 事件的 value 必須從 Stripe checkout session 的 `amount_total` 動態讀取，加入 fallback 到 599 + 警告日誌。

**驗證：** GTM Preview Mode 完成測試購買，確認 value 與 Stripe Dashboard 一致。

##### P0-3：修復 join_group 重複觸發 ⏱️ 1h

**方案 A：** sessionStorage 標記 `join_group_fired_[webinarId]`，已觸發則跳過。
**方案 B（推薦）：** 淘汰 `join_group`，統一用 `c_enter_live`，減少語義重疊。

---

#### P1 — 本週內修復（影響數據品質和優化效率）

##### P1-1：新增 User ID 貫穿 ⏱️ 3-4h

註冊成功後將 `registration_id` 存入 localStorage，所有後續 dataLayer.push 附加 `user_id`。GTM 配置 GA4 Config Tag 的 User Properties。

**影響：** 跨 session 用戶旅程串聯率提升至 80%+

##### P1-2：新增表單互動事件 ⏱️ 2h

- `c_form_start` — 首次聚焦表單欄位
- `c_form_field_complete` — 完成欄位（blur 觸發），參數：field_name

**用途：** 計算表單放棄率，找出問題欄位

##### P1-3：新增等候室追蹤 ⏱️ 2h

- `c_lobby_view` — 等候室載入，參數：webinar_id, minutes_until_start
- `c_lobby_return` — 用戶再次回到等候室，參數：webinar_id, visit_count

**用途：** 計算真實出席率，評估提醒郵件效果

##### P1-4：解決 percent 參數名衝突 ⏱️ 1h

- `c_scroll_depth` → `scroll_percent`
- `c_video_progress` → `video_percent`

---

#### P2 — 兩週內完成（提升追蹤可靠性）

##### P2-1：新增影片退出事件 ⏱️ 3h

- `c_video_exit` — beforeunload/visibilitychange 觸發
- 使用 `navigator.sendBeacon()` 確保數據送出
- 參數：webinar_id, current_time_sec, watch_duration_sec, video_percent

##### P2-2：Server-side GTM ⏱️ 8-12h

- Google Cloud Run 部署 GTM Server Container
- First-party subdomain（track.yourdomain.com）
- 繞過 Ad Blocker（北美 25-30% 使用率）
- 為未來 Meta CAPI 做準備

**影響：** 數據捕獲率提升 20-30%

##### P2-3：購後確認事件 ⏱️ 1h

- `c_purchase_confirmed` — Thank you page 載入
- 作為 `purchase` 的確認信號，交叉驗證數據

---

#### P3 — 月內規劃（擴展追蹤能力）

##### P3-1：Meta Pixel + Conversions API ⏱️ 4-6h

透過 GTM 安裝 Meta Pixel，標準事件映射：
- sign_up → CompleteRegistration
- begin_checkout → InitiateCheckout
- purchase → Purchase

##### P3-2：Enhanced Conversions ⏱️ 3-4h

purchase 和 sign_up 事件附加 hashed 用戶數據（email, phone），啟用 Google Ads Enhanced Conversions。

##### P3-3：Lookalike 受眾種子 ⏱️ 1h

待轉換數據 100+ 筆後建立 Similar Audiences。

---

### 修復優先級總覽

| 優先級 | 項目 | 預計工時 | 影響面 |
|--------|------|---------|--------|
| **P0-1** | GCLID/UTM 歸因修復 | 2-4h | 廣告歸因準確度 |
| **P0-2** | purchase value 動態化 | 1-2h | ROAS 計算 |
| **P0-3** | join_group 去重 | 1h | 數據準確度 |
| **P1-1** | User ID 貫穿 | 3-4h | 跨 session 分析 |
| **P1-2** | 表單互動事件 | 2h | 註冊轉換優化 |
| **P1-3** | 等候室追蹤 | 2h | 出席率分析 |
| **P1-4** | percent 參數名衝突 | 1h | 數據品質 |
| **P2-1** | 影片退出事件 | 3h | 內容優化 |
| **P2-2** | Server-side GTM | 8-12h | 數據捕獲率 |
| **P2-3** | 購後確認事件 | 1h | 數據驗證 |
| **P3-1** | Meta Pixel + CAPI | 4-6h | 渠道擴展 |
| **P3-2** | Enhanced Conversions | 3-4h | 歸因提升 |
| **P3-3** | Lookalike 受眾 | 1h | 受眾擴展 |

**P0 總計：4-7 小時** — 建議在下一次廣告投放前完成。

---

### 結語

此平台的埋點基礎已具備合理的漏斗覆蓋度，16 個事件涵蓋了從落地頁到購買的主要節點。然而，**三個 P0 問題（歸因斷裂、value 硬編碼、事件重複）直接影響廣告花費效率，必須在擴大投放前修復。**

以 $599 客單價，每一筆漏歸因的轉換都代表顯著的預算浪費。修復 P0 的 ROI 極高：4-7 小時開發，可能挽回每月數千美元的 ROAS 失真。

**建議執行順序：P0（本週）→ P1（下週）→ P2（兩週內）→ P3（月內規劃）**
