# GTM + GA4（數據追蹤系統）

## 它是什麼

兩個 Google 的工具搭在一起用：

- **GTM**（Google Tag Manager，標籤管理器）— 一個「轉運站」。你的網頁把數據丟給它，它再決定要把數據送去哪裡。就像快遞站 —— 你把包裹丟給快遞站，快遞站幫你分揀、送到目的地
- **GA4**（Google Analytics 4，分析平台）— 一個「數據倉庫 + 報表工具」。收到數據後，它幫你存起來、做成圖表、讓你分析用戶行為

兩者的關係很簡單：

```
我們的網站 → 把事件丟給 GTM → GTM 轉發給 GA4 → GA4 做成報表給你看
```

為什麼要多一個 GTM，不直接送 GA4？因為**解耦** —— 以後如果你想換分析工具（比如加一個 Facebook Pixel），只需要在 GTM 後台加一條規則，程式碼完全不用動。GTM 就是那個「中間人」，讓我們不需要為每個分析工具改程式碼。

---

## 為什麼要追蹤？（第一性原理）

我們的商業模式是一條**轉化漏斗**：

```
看到廣告 → 進入網站 → 報名研討會 → 進等候室 → 進直播間 → 看影片 → 點購買 → 付款
```

每一步都會流失用戶。比如 100 人報名，可能只有 60 人進直播間，30 人看完影片，5 人付款。

追蹤的目的只有一個：**找到漏洞最大的那一步，然後去修它**。

- 很多人報名但沒進直播間？→ 可能是提醒信不夠有效
- 很多人進了直播間但 CTA 沒人點？→ 可能是 CTA 出現的時間不對
- 很多人開始結帳但沒付款？→ 可能是價格問題或結帳流程太複雜

沒有追蹤，這些全是瞎猜。有了追蹤，每一步都有數字，你知道該把精力花在哪裡。

---

## 完整鏈路：讓追蹤 work 需要哪些節點

要讓追蹤系統完整運作，需要**三個地方**各做各的事。缺任何一塊，數據就斷了：

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   1. 程式碼裡     │    │   2. GTM 後台     │    │   3. GA4 後台     │
│   （我們的網站）   │ →  │  （轉運站設定）    │ →  │  （數據倉庫設定）  │
│                  │    │                  │    │                  │
│ 負責：            │    │ 負責：            │    │ 負責：            │
│ 「什麼時候丟包裹」 │    │ 「包裹送去哪」     │    │ 「收到包裹怎麼用」 │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 節點 1：程式碼（我們的網站）

**做什麼**：在用戶做了某件事的時候，呼叫 `trackGA4(事件名, 參數)` 把數據推進 `window.dataLayer`（一個瀏覽器裡的暫存陣列）。

**白話文**：就是在「用戶做了某件事」的那個時間點，把一個「包裹」（= 事件名 + 相關資料）丟到轉運站門口的收件箱裡。

**在哪設定 / 修改**：改程式碼（後面「修改指南」章節會詳細說）。

### 節點 2：GTM 後台（Google Tag Manager 網頁後台）

**做什麼**：監聽 `dataLayer` 裡的事件，根據規則決定「這個事件要不要送去 GA4、怎麼送」。

**白話文**：快遞站的工作人員打開收件箱，看到包裹後，按照事先設好的規則，把包裹貼上地址標籤，送到 GA4。

**在哪設定 / 修改**：登入 [GTM 後台](https://tagmanager.google.com)，用圖形介面操作。

**GTM 裡面有三種東西需要設定**：

| 東西 | 白話說明 | 類比 |
|------|---------|------|
| **Tag（標籤）** | 「把這個事件送去 GA4」的動作指令 | 快遞單 —— 寫上「送到 GA4」 |
| **Trigger（觸發條件）** | 「什麼時候執行這個 Tag」的規則 | 分揀規則 —— 「看到名字叫 c_cta_click 的包裹，就貼快遞單」 |
| **Variable（變數）** | 事件裡帶的參數要怎麼取出來 | 開包裹看裡面裝了什麼 |

### 節點 3：GA4 後台（Google Analytics 網頁後台）

**做什麼**：收到 GTM 送來的事件後，存起來，讓你做報表、建漏斗、設轉化目標。

**白話文**：倉庫收到包裹，分類存放，然後讓你隨時查庫存、做銷售報表。

**在哪設定 / 修改**：登入 [GA4 後台](https://analytics.google.com)，用圖形介面操作。

**GA4 裡面通常需要設定**：

| 設定項目 | 白話說明 | 什麼時候需要設 |
|---------|---------|-------------|
| **轉化事件（Conversions）** | 告訴 GA4「這些事件是重要的轉化」 | 新增重要事件時（如 purchase） |
| **自訂維度（Custom Dimensions）** | 告訴 GA4「這些參數要另外記錄，讓我在報表裡篩選」 | 想在報表裡用某個參數做篩選時 |
| **漏斗報表（Funnel Reports）** | 用幾個事件串成一條漏斗，看每步的流失率 | 想分析用戶從報名到購買的每步流失 |
| **連結 Google Ads** | 讓 GA4 的轉化數據回傳給 Google Ads 優化廣告出價 | 有投 Google 廣告時 |

---

## 三個節點各自負責什麼 —— 完整對照表

| 你想做的事 | 在哪裡做 | 具體操作 |
|-----------|---------|---------|
| 新增一個追蹤事件 | **程式碼** | 在 `analytics.ts` 定義型別 + 在組件中呼叫 `trackGA4()` |
| 讓新事件被送到 GA4 | **GTM 後台** | 新增 Tag + Trigger（除非已有萬用規則） |
| 把某事件標記為「轉化」 | **GA4 後台** | Admin → Events → 把該事件標記為 Conversion |
| 新增自訂參數到報表 | **GA4 後台** | Admin → Custom Definitions → 新增 Custom Dimension |
| 建立轉化漏斗 | **GA4 後台** | Explore → Funnel Exploration |
| 把轉化回傳給 Google Ads | **GA4 後台** | Admin → Google Ads Links → 連結帳號 |
| 修改事件的參數 | **程式碼** | 改 `analytics.ts` 的型別 + 改呼叫處的參數 |
| 刪除一個追蹤事件 | **程式碼** | 移除型別定義 + 移除所有 `trackGA4()` 呼叫 |
| 改用另一個分析工具 | **GTM 後台** | 新增該工具的 Tag，程式碼不需要動 |
| 關閉所有追蹤 | **環境變數** | 移除 `NEXT_PUBLIC_GTM_ID` 即可，GTM 不會載入 |

---

## GTM 後台怎麼設（傻瓜式教學）

> 以下操作在 [tagmanager.google.com](https://tagmanager.google.com) 進行

### 目前的設定方式

我們的 GTM 容器可能已經設了一條「萬用規則」（All Custom Events trigger），能自動把所有 `c_` 開頭的事件送到 GA4。如果有這條規則，新增事件時 GTM 不需要額外設定。

**怎麼確認有沒有萬用規則**：

1. 登入 GTM 後台
2. 左側選 **Triggers**
3. 看有沒有一條 trigger 的條件是 `Event Name` → `matches RegEx` → `.*`（或類似的萬用規則）
4. 如果有 → 新增事件不需要動 GTM
5. 如果沒有 → 每新增一個事件，都要按下面的步驟加 Tag + Trigger

### 手動新增一個事件的 Tag + Trigger

**步驟 1：建立 Trigger（觸發條件）**

1. 左側選 **Triggers** → 右上角 **New**
2. Trigger Type 選 **Custom Event**
3. Event Name 填你的事件名（例如 `c_replay_click`）
4. 命名（例如「CE - c_replay_click」，CE 是 Custom Event 的縮寫）
5. 存檔

**步驟 2：建立 Tag（發送指令）**

1. 左側選 **Tags** → 右上角 **New**
2. Tag Type 選 **Google Analytics: GA4 Event**
3. Measurement ID 填你的 GA4 衡量 ID（格式像 `G-XXXXXXXXXX`）
4. Event Name 填同樣的事件名（`c_replay_click`）
5. 如果要帶參數：展開 **Event Parameters** → Add Row → 填參數名和值（值用 GTM 變數引用 dataLayer 裡的值）
6. Triggering 選剛才建的 Trigger
7. 命名（例如「GA4 - c_replay_click」）
8. 存檔

**步驟 3：發布**

1. 右上角 **Submit**
2. 填版本說明（例如「新增 c_replay_click 事件」）
3. **Publish**

> 沒有按 Publish 的話，設定只是草稿，不會生效。

### GTM Preview 模式（除錯用）

1. GTM 後台右上角 **Preview**
2. 輸入你的網站網址
3. 會開一個新視窗，左側顯示所有被觸發的事件
4. 點擊某個事件，可以看到它帶了什麼參數、觸發了哪些 Tag
5. 用這個模式確認新設定有沒有生效

---

## GA4 後台怎麼設（傻瓜式教學）

> 以下操作在 [analytics.google.com](https://analytics.google.com) 進行

### 把事件標記為轉化

1. 左側 **Admin**（齒輪圖示）
2. Property 欄位 → **Events**
3. 找到你的事件（例如 `purchase`）
4. 把右側的 **Mark as conversion** 開關打開

> 只有標記為轉化的事件，才會出現在 Google Ads 的轉化報表裡。

### 新增自訂維度（讓參數可以在報表裡篩選）

1. 左側 **Admin** → **Custom definitions**
2. **Create custom dimension**
3. Dimension name：填一個好記的名字（例如「CTA 按鈕文字」）
4. Scope：選 **Event**
5. Event parameter：填程式碼裡的參數名（例如 `cta_type`）
6. 存檔

> 為什麼要這步？GA4 預設只記錄事件名，不會自動把參數變成可篩選的維度。設了自訂維度後，你就能在報表裡篩選「哪個 CTA 按鈕被點最多」。

### 建立漏斗報表

1. 左側 **Explore** → **Blank** → 選 **Funnel exploration**
2. 設定步驟：
   - Step 1：`sign_up`（報名）
   - Step 2：`c_enter_live`（進入直播）
   - Step 3：`c_cta_click`（點擊 CTA）
   - Step 4：`purchase`（購買）
3. 按 **Apply** → 看到每步的人數和流失率

---

## 環境變數

| 變數名 | 做什麼用的 | 沒設定會怎樣 |
|--------|---------|-----------|
| `NEXT_PUBLIC_GTM_ID` | GTM 容器的 ID（格式像 `GTM-XXXXXXX`），告訴網頁「去載入哪個 GTM 容器」 | GTM 不會載入，所有追蹤事件照樣執行但數據不會被送出去，就像包裹丟了但快遞站沒開門 |

---

## 程式碼裡的核心文件

| 檔案 | 它負責什麼 |
|------|---------|
| `src/lib/analytics.ts` | 追蹤系統的「總控台」— `trackGA4()` 函數和所有事件的型別定義都在這裡 |
| `src/app/layout.tsx` | GTM 的啟動點 — 載入 `<GoogleTagManager>` 組件 |
| `src/components/analytics/RouteChangeTracker.tsx` | 頁面切換時自動送 `page_view`（不用手動處理） |
| `src/hooks/usePlaybackTracking.ts` | 影片觀看追蹤 — 每 60 秒心跳 + 進度里程碑（5%, 10%...100%） |

觸發事件的頁面：

| 頁面 | 相關事件 |
|------|---------|
| `src/app/(public)/page.tsx` | Landing 頁 — 滾動深度、報名按鈕點擊 |
| `src/components/registration/useRegistrationForm.ts` | 報名表單 — `sign_up` |
| `src/app/(public)/webinar/[id]/lobby/page.tsx` | 等候室 — 進入、離開、加日曆、進直播 |
| `src/app/(public)/webinar/[id]/live/page.tsx` | 直播間 — CTA 相關、聊天、結帳 |
| `src/app/(public)/webinar/[id]/end/page.tsx` | 結束頁 — 看完、CTA 點擊 |
| `src/app/(public)/checkout/[webinarId]/return/page.tsx` | 結帳確認 — purchase |

---

## 全部追蹤事件清單

### GA4 推薦事件（3 個）

這些是 Google 定義好的標準事件名，GA4 會自動識別它們的意義：

| 事件名 | 白話文：什麼時候觸發 | 帶什麼資料 |
|--------|-------------------|---------|
| `sign_up` | 用戶提交報名表單成功 | 報名方式、研討會 ID |
| `begin_checkout` | 用戶點了購買按鈕（直播間或結束頁的 CTA） | 金額（$599）、商品資訊、CTA 按鈕 ID |
| `purchase` | 付款確認成功（Stripe 說錢到了） | 交易 ID、金額、幣別、商品資訊 |

### 自訂事件（c_ 開頭，14 個正在使用）

為什麼用 `c_` 開頭？為了跟 GA4 的內建事件區分開來。`c` = custom（自訂）。

#### Landing 頁（首頁）

| 事件名 | 什麼時候觸發 | 自動還是手動 | 帶什麼資料 |
|--------|-----------|-----------|---------|
| `c_scroll_depth` | 頁面被滾動到 10%, 20%...100% 的位置 | 自動（瀏覽器監聽滾動） | 滾動百分比 |
| `c_signup_button_click` | 點了報名按鈕（打開報名表單之前） | 用戶點擊 | 按鈕位置（頂部 hero / 底部 footer） |

#### 等候室

| 事件名 | 什麼時候觸發 | 自動還是手動 | 帶什麼資料 |
|--------|-----------|-----------|---------|
| `c_lobby_entered` | 進入等候室頁面（每個觀看 session 只觸發一次） | 自動 | 研討會 ID、當前狀態（直播中/即將開始/已錯過） |
| `c_add_to_calendar` | 點了「加入日曆」按鈕 | 用戶點擊 | 日曆類型（iCal / Google 日曆） |
| `c_enter_live` | 進入直播間（按按鈕 / 倒數結束自動跳轉 / 從其他頁面導向） | 都有可能 | 進入方式（按鈕/倒數自動/重新導向） |
| `c_lobby_duration` | 離開等候室的那一刻 | 自動 | 在等候室待了幾秒、怎麼離開的（進直播 / 直接走人） |
| `c_lobby_abandon` | 沒進直播間就關掉頁面 | 自動 | 待了幾秒、離開播還差幾分鐘 |

#### 直播間

| 事件名 | 什麼時候觸發 | 自動還是手動 | 帶什麼資料 |
|--------|-----------|-----------|---------|
| `c_video_heartbeat` | 影片播放中每 60 秒 + 影片播完的最後一次 | 自動 | 當前播到幾秒、累計看了多久 |
| `c_video_progress` | 影片播到 5%, 10%, 15%...100% 的里程碑 | 自動 | 百分比 |
| `c_cta_view` | CTA 彈窗出現在畫面上 | 自動 | CTA 的 ID、按鈕文字、影片播到幾秒時出現 |
| `c_cta_click` | 用戶點了 CTA 按鈕 | 用戶點擊 | CTA ID、按鈕文字、影片播到幾秒、CTA 出現了幾秒才被點、從開播到現在看了多久 |
| `c_cta_dismiss` | 用戶關閉了 CTA 彈窗（不是點按鈕，而是按 X 關掉） | 用戶點擊 | CTA ID、影片播到幾秒 |
| `c_chat_message` | 用戶在聊天室發了一條訊息 | 用戶操作 | 影片播到幾秒時發的 |

#### 結束頁 + 結帳

| 事件名 | 什麼時候觸發 | 自動還是手動 | 帶什麼資料 |
|--------|-----------|-----------|---------|
| `c_webinar_complete` | 進入結束頁（代表影片看完了） | 自動 | 累計觀看秒數 |
| `c_end_page_cta_click` | 在結束頁點了 CTA 按鈕 | 用戶點擊 | 按鈕文字 |
| `c_purchase_confirmation` | 付款成功（跟 `purchase` 同時觸發） | 自動 | 交易 ID、訂單狀態 |

### 已定義但未實作的事件

| 事件名 | 狀態 | 說明 |
|--------|------|------|
| `c_share_click` | 型別已定義，程式碼未實作 | 分享按鈕功能還沒上線 |

---

## 歸因系統（追蹤用戶從哪來的）

### 為什麼需要歸因

如果你投了 Google 廣告和 Facebook 廣告，用戶付款時你想知道「這個客戶是從哪個廣告來的？」。這就是歸因。

### 怎麼運作

有 6 個重要事件會**自動附加用戶的來源資訊**：

`sign_up`、`begin_checkout`、`purchase`、`c_enter_live`、`c_webinar_complete`、`c_end_page_cta_click`

附加的資訊包括：

| 資訊 | 白話文 | 從哪裡讀 |
|------|--------|---------|
| `gclid` | Google 廣告的點擊 ID（Google Ads 用來追蹤轉化的） | 網址參數 |
| `utm_source` | 用戶從哪個平台來的（google、facebook、email…） | 網址參數 |
| `utm_medium` | 用什麼方式來的（點廣告 cpc、看 email、自然搜尋…） | 網址參數 |
| `utm_campaign` | 哪個活動帶來的（summer_sale、launch_2026…） | 網址參數 |
| `utm_content` | 點的是哪個廣告素材 | 網址參數 |
| `original_*` | 用戶「第一次」造訪時的來源（跟上面一樣，但是第一次的） | Cookie（長期保存） |

**讀取順序**：先讀 sessionStorage（當前這次造訪的資料），找不到再讀 Cookie（之前造訪留下的）。

---

## 用戶旅程 × 事件對照（方便查找）

```
Landing Page (/)
  ├── 自動：c_scroll_depth（滾動時）
  ├── 手動：c_signup_button_click（點報名按鈕）
  └── 手動：sign_up（提交報名表單）

等候室 (/webinar/[id]/lobby)
  ├── 自動：c_lobby_entered（進入頁面，一次）
  ├── 手動：c_add_to_calendar（點加日曆）
  ├── 自動/手動：c_enter_live（進直播間）
  ├── 自動：c_lobby_duration（離開時）
  └── 自動：c_lobby_abandon（沒進直播就離開）

直播間 (/webinar/[id]/live)
  ├── 自動：c_video_heartbeat（每 60 秒）
  ├── 自動：c_video_progress（每個里程碑）
  ├── 自動：c_cta_view（CTA 彈窗出現）
  ├── 手動：c_cta_click（點 CTA）→ 同時觸發 begin_checkout
  ├── 手動：c_cta_dismiss（關 CTA）
  └── 手動：c_chat_message（發聊天訊息）

結束頁 (/webinar/[id]/end)
  ├── 自動：c_webinar_complete（進入頁面）
  └── 手動：c_end_page_cta_click（點 CTA）→ 同時觸發 begin_checkout

結帳確認 (/checkout/[webinarId]/return)
  └── 自動：purchase + c_purchase_confirmation（付款成功）
```

---

# 修改指南

## 場景 1：新增一個追蹤事件

**例子**：想追蹤用戶點擊「重播」按鈕。

### 要做什麼，在哪做，為什麼

**第 1 步 — 程式碼：定義事件型別**

檔案：`src/lib/analytics.ts`

在 `GA4EventMap` 裡加一行：

```typescript
c_replay_click: {
  webinar_id: string;
  video_time_sec: number;
};
```

**為什麼**：TypeScript 會強制你在呼叫 `trackGA4('c_replay_click', ...)` 時提供正確的參數。打錯字的話，程式編譯時就會報錯，不用等到上線才發現追蹤數據不對。

**第 2 步 — 程式碼：在按鈕被點擊時呼叫**

找到「重播按鈕」所在的組件，在點擊事件裡加：

```typescript
import { trackGA4 } from '@/lib/analytics';

trackGA4('c_replay_click', {
  webinar_id: webinarId,
  video_time_sec: Math.round(currentTime),
});
```

**為什麼**：事件必須在用戶做那個動作的地方觸發。把追蹤放在錯的組件裡，數據就會不準。

**第 3 步 — 程式碼（可選）：如果是重要轉化事件，加入歸因列表**

在 `analytics.ts` 裡找到 `CONVERSION_EVENTS` 陣列，把事件名加進去。

**為什麼**：加入列表的事件會自動附帶 UTM / gclid 歸因參數。如果這個事件跟「用戶從哪來」無關，跳過這步。

**第 4 步 — GTM 後台（可能不需要）**

如果你的 GTM 已經有萬用規則（All Custom Events），這步可以跳過。

如果沒有：按照上面「GTM 後台怎麼設」章節，新增 Trigger + Tag + Publish。

**第 5 步 — GA4 後台（可選）**

如果想在 GA4 報表裡用這個事件的參數做篩選，去 GA4 後台新增 Custom Dimension。

**第 6 步 — 驗證**

| 工具 | 怎麼用 | 確認什麼 |
|------|--------|---------|
| 瀏覽器 Console | 開發環境自動印出所有事件，搜尋 `[GA4]` | 事件有沒有被觸發、參數對不對 |
| GTM Preview Mode | GTM 後台 → Preview → 輸入網址 | GTM 有沒有接到事件、Tag 有沒有被觸發 |
| GA4 DebugView | GA4 後台 → Admin → DebugView | 事件有沒有到達 GA4 |
| GA4 Realtime | GA4 後台 → Reports → Realtime | 即時數據有沒有出現 |

## 場景 2：修改現有事件的參數

只需要改程式碼，GTM 和 GA4 通常不用動。

1. **`analytics.ts`**：在該事件的型別裡加/改/刪參數
2. **呼叫處**：找到 `trackGA4(該事件名, ...)` 的地方，更新參數值
3. **GA4 後台**（可選）：如果新參數要能篩選，加 Custom Dimension

## 場景 3：刪除一個事件

1. 從 `analytics.ts` 的 `GA4EventMap` 裡刪掉型別 → TypeScript 編譯器會自動報錯告訴你哪些地方還在用
2. 刪掉所有報錯的 `trackGA4()` 呼叫
3. 如果在 `CONVERSION_EVENTS` 裡，一併刪掉
4. GTM 後台裡的 Tag/Trigger 可以停用或刪除（不刪也不影響，只是整潔問題）

## 場景 4：調整頁面結構（改 URL、搬組件）

追蹤事件是跟著**組件**走的，不是跟著 URL。所以：

- 搬組件到新頁面 → 追蹤事件跟著走，**不用改追蹤代碼**
- 刪了某個組件 → 裡面的追蹤事件也跟著消失，如果還需要就要在新組件裡重新加
- 改了 URL → `page_view` 自動更新（`RouteChangeTracker` 處理），**不用管**

## 場景 5：換 GTM 容器或 GA4 帳號

只改環境變數 `NEXT_PUBLIC_GTM_ID`，程式碼完全不用動。重新部署就生效。

---

## trackGA4() 工具函數怎麼運作

```
trackGA4('c_cta_click', { webinar_id: '1', cta_id: 'abc' })

→ 第 1 步：檢查是不是在瀏覽器裡（伺服器環境會跳過）
→ 第 2 步：如果不是正式環境，在 console 印出事件（方便除錯）
→ 第 3 步：如果是轉化事件，自動附上 UTM/gclid 歸因參數
→ 第 4 步：推進 window.dataLayer（GTM 的收件箱）
→ 第 5 步：如果 GTM 沒載入，靜默失敗（不會報錯，也不會影響網站功能）
```

---

## 注意事項

1. **事件命名規範**：自訂事件用 `c_` 前綴，跟 GA4 內建事件區分
2. **每個事件最多 25 個參數**：GA4 的限制，超過會被丟掉
3. **只能在瀏覽器呼叫**：`trackGA4` 依賴 `window.dataLayer`，伺服器端不能用
4. **GTM 沒載入不會報錯**：try-catch 包住了，靜默失敗
5. **頁面切換已自動處理**：`RouteChangeTracker` 會自動送 `page_view`，不需要手動處理

## 官方文件

- [GTM 開發者文件](https://developers.google.com/tag-manager)（GTM 的完整技術文件）
- [GA4 事件文件](https://developers.google.com/analytics/devguides/collection/ga4/events)（所有 GA4 事件的參考）
- [GA4 DebugView](https://support.google.com/analytics/answer/7201382)（怎麼用即時除錯工具）
- [GA4 Custom Dimensions](https://support.google.com/analytics/answer/10075209)（怎麼設自訂維度）
