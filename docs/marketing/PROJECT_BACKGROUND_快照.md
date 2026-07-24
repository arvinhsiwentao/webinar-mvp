<!-- 這是快照，不是正本。請勿直接編輯這個檔案。 -->
> 📸 **快照** — 自动同步自 `webinar-1plus3-marketing/PROJECT_BACKGROUND.md`，同步於 2026-07-24
> 要修改內容，請改**來源檔**，然後重跑 `sync-context.ps1`。
> 直接改這裡的話，下次同步會被覆蓋掉。

---
# 1+3 方案 — 專案背景

> Mike 美股投資 App **冷啟動破圈**專案總背景。
> 本檔案 = 跟新進團員 / Claude 對齊用的 single source of truth。
> 建立日期：2026-06-03

---

## 1. 專案目的

幫 Mike（YouTube 200K+ 創作者、美股投資人）**透過廣告破圈**，將既有 YouTube / 直播觀眾以外的冷流量導入付費社群，提高 App 使用者基數與 VIP 訂閱轉換。

破圈的工具：**「1+3」方案 — US$1 / 3 天 VIP 試用**

---

## 2. 「1+3」方案是什麼

**核心 offer**：US$1（一次性付款，不自動續扣）

|  | 拿到的東西 |
|---|---|
| 主商品 | **9 章 Mike 親錄美股投資線上課程**（永久持有）|
| 贈品（鉤子）| **3 天 App VIP 全功能體驗**（到期自動降回免費版，不扣款）|
| 後續 | 3 天內由 **Appier in-app message** 推播協助 onboarding / 活躍 / 留存 / 升級轉換 |

**$1 賣的「英雄」是課程**，App 3 天 VIP 是吸引人試用的「贈品鉤子」。

---

## 3. 兩條打法（兩種流量來源）

### 打法 A：直播流量回收（已上線）

**問題**：Mike 直播觀看率高、但結帳轉換率不佳。
**解法**：把看完直播 ≥23 min 但未購買 $599 課程的人，透過 EDM 引導到 **$1 LP**，降低試用門檻、用 3 天 App 體驗收回轉換。

- LP 連結：https://www.cmoney.tw/app/ItemContent.aspx?id=9094#instruction
- LP 截圖 / 設計稿：`LandingPage草圖_for_直播用戶/`
- 月流量：~120-130 人池子

### 打法 B：Google Ads 冷流量直投（新嘗試）⭐

**新角度**：**包裝成「線上課程 + 送 3 天 App」**（不再是「試用 App」）。
**理由**：冷流量對「App 試用」警戒度高；「買課程」比「試用 App」實體感更強、信任更高。

- 直接投廣到 $1 LP
- 用 **3 個切角 × 3 個獨立 LP** A/B 測試
- 3 LP 課程介紹 body 完全一樣，**只有前導影片 Hook 不同**

| Angle | LP 編號 | URL |
|---|---|---|
| 🅰️ **介紹作者**（信任）| LP_B1 = 17590 | https://www.cmoney.tw/course-media/17590/intro?platform=5 |
| 🅱️ **時事行情**（FOMO）| LP_B2 = 17607 | https://www.cmoney.tw/course-media/17607/intro?platform=5 |
| 🅲 **課程&功能**（理性）| LP_B3 = 17608 | https://www.cmoney.tw/course-media/17608/intro?platform=5 |

- LP 設計稿 / 圖片：`LandingPage草圖_for_廣告用戶/`
- 前導影片腳本：`前導片腳本/前導影片腳本_3切角_ABtest.md`

---

## 4. 3 個切角 × 對應受眾畫像

### 🅰️ 作者切角 — 介紹 Mike 是誰

**廣告主訴**：Mike 故事、白手起家、負債到財富自由、公開分享作法、做了 App 邀體驗

**典型受眾**：
- 28-45 歲、中產上班族（IT / 金融 / 醫療 / 工程）
- 美股經驗 0-3 年，買 ETF 為主、沒有方法論
- 已追過 Gary Vee / 楊應超 等創業者故事
- 心理 OS：「我想突破現狀、想看別人怎麼做的」
- 警戒度：中（會聽故事，但對「賣課」啟動戒心）

### 🅱️ 時事切角 — 震盪行情中的工具

**廣告主訴**：美伊戰爭 / SpaceX IPO 視頻直播快速掌握、震盪行情中 App 幫到你、即時操作分享、社團聊天室

**典型受眾**：
- 35-55 歲、男性主導
- **已有 5-50 萬美股部位**、3-15 年經驗
- 每天看財經新聞 / Reddit / Twitter、敏感於 Fed / 事件
- 心理 OS：「最近行情亂、不知道該不該動倉位」
- 警戒度：高（被廣告轟炸過）

### 🅲 功能切角 — App 系統工具

**廣告主訴**：12 板塊找 AI 趨勢股、語音/視頻直播、社團聊天室陪伴

**典型受眾**：
- 28-50 歲、工程師 / 數據分析師 / 醫師 / PM
- 美股經驗 1-10 年、自己研究、邏輯思維強
- 已用 Seeking Alpha / TradingView 等
- 心理 OS：「自己研究太花時間、需要系統化過濾器」
- 警戒度：最高（最挑剔）

---

## 5. LP 結構（實際線上版本 2026-06-03 截圖）

### LP_A (9094) — 直播流量

CMoney 用的是 `/app/ItemContent.aspx` 商品頁框架。

```
[CMoney 商品頁內建]
- 商品標題: 【Mike是麦克】美股App 3 天 VIP 完整体验，限时 USD $1 🔥
- 評分 + 銷售方案
- 原價 US$49 → 特價 US$1
- 立即購買 CTA
- 內容 tab: 使用說明 / 作者簡介 / 開箱文教學 / 人氣好評

[商品內容 longDesc body — 自己寫的 HTML]
1. Hero banner（USD $1 解锁 3 天 VIP 权限，紫色主視覺）
2. 你可能還沒解決的事（3 點痛點 + App 解法）
3. Mike 引言（$1 試用設計理念 + Mike 半身照）
4. 3 天 VIP 功能對比表（專業版 vs 免費版）
5. 直播回放（3 集精選）
6. 9 章教學 grid（3×3）
7. 5 步驟上手
8. 試看影片 + WhatsApp 客服
9. FAQ
```

### LP_B (17590 / 17607 / 17608) — 廣告冷流量

CMoney 用的是 `/course-media/{id}/intro` 課程頁框架。**3 LP body 完全相同，只有前導影片不同**。

```
[CMoney course-media 內建區]
- 課程標題: $1 美股入门套餐｜9 单元 + 3 天 App VIP权限
- 講師 chips: Mike是麦克 + 美股大叔 / YouTube / 视频
- 已购買 N 人
- 原價 US$49 → 特價 US$1
- 立即購買 CTA

[前導影片 — 3 LP 不同 angle hook]
- LP_B1 = 🅰️ 作者切角
- LP_B2 = 🅱️ 時事切角
- LP_B3 = 🅲 功能切角
- 60-90 秒 Mike 親述、收口統一導到 $1 立即購買

[介紹頁 body — 3 LP 完全相同]
1. Mike portrait hero（40 分钟，从 0 开始 / 带你看懂大盘，挑出趋势股）
2. 学员好评（多位學員評論卡）
3. 你是不是也常常这样？（痛點 3 卡）
4. 课程三大目标（4 步驟投資框架：大盘 → 板块 → 个股 → 买点）
5. 附贈 App 介紹（Mike是麦克 App + 專業版 vs 免費版 對比表）
6. 直播回放（5 集精選 + 大字 hook）
7. App 內預錄影片（試看預告）
8. 課程介紹 grid（8 章/單元）
9. 5 步驟上手
10. QR code 下載 App + WhatsApp 客服
```

> ⚠️ **實際章節數是 8 章/單元**，不是 9 章（雖然標題寫「9 单元」可能包含序章 CH0）。要確認。
> ⚠️ 章節清單（從 grid 看到）：投资逻辑总纲、大盘节奏判读、12 板块框架、板块交集打分、6 种选股策略、即时市场动态、更多学习资源、30 天日常

---

## 6. 後續 onboarding：Appier in-app message

冷流量買完 $1 進入 3 天試用期後：

- **Day 1**：Welcome + 引導下載 App + 啟動 VIP
- **Day 1-3**：Appier 推播協助
  - **活躍**：每天提醒打開首頁、看大盤、進選股頁
  - **留存**：推播 Mike 即時操作、直播提醒、社團熱度
  - **轉換**：第 3 天推送專屬升級優惠碼（月 / 季 / 年方案）
- **Day 4 開始**：App 自動降回免費版、不扣款

---

## 7. 核心方法論（課程教什麼）

### 4 步驟選股框架

```
看大盘 → 找风口 → 挑个股 → 找买点
```

| 步驟 | 學到什麼 |
|---|---|
| 大盘 | 看清市场风向，掌握现在该不该出手 |
| 板块 | 分辨哪些板块站在风口、钱正往哪流 |
| 个股 | 从板块里挑出真正值得押的几支股 |
| 买点 | 判断估值与时机，不被情绪牵着走 |

### 12 板塊系統（核心差異化）

- 全美股 9000+ 支 → 收斂為 **12 個板塊**
- **AI 在中心**、強因果 4 條 + 弱因果 3 條 + 雙匯流 1 條 + 獨立 3 條
- 12 個板塊（由上到下重視程度排序）：
  - 🟡 AI 產業鏈
  - 🟠 能源電力核能 / 軍工國防 / 網絡安全
  - ⬜ 太空 / 機器人自動駕駛 / AI 醫療 / 量子計算
  - 🔘 貴金屬 / 基建 / 生物科技 / 金融科技

### 板塊交集打分

- 規則：**交集越多板塊 + 板塊分數越高 → 重視程度越高**
- 案例：PLTR（軍工 + AI 軟件）/ RKLB（軍工 + 太空）/ TSLA（AI 軟件 + 機器人）/ NVDA（AI 算力 分數最高）
- App 自動算分，看「個股重視程度分數」即可

---

## 8. Mike 個人 credentials

- 32 歲負債 50 萬美金，43 歲實現財務自由
- YouTube **200K+ 訂閱**
- **3000+** 付費會員社群
- 著《人生重啟》投資暢銷書
- CMoney 簽約美股分析師
- 曾受邀電視財經節目分享投資策略

---

## 9. 檔案地圖

```
1_plus_3_landingpage/
├── PROJECT_BACKGROUND.md        ★ 本檔（專案總背景）
├── README.md                    工作區索引
├── 01_AUDIENCE_AND_IA_PLAN.md   原始受眾畫像 + IA
│
├── Appier_Onboarding規劃/       ⭐ 購買後 onboarding/活化/升級策略
│   ├── README.md                    索引
│   ├── APPIER_ONBOARDING_STRATEGY.md  主策略（3 狀態機 × days 分桶）
│   └── EDM_PRE_APP_SEQUENCE.md       下載前 EDM 序列（Track 1）
│
├── LP_A_FRAMEWORK.md            LP_A 框架（直播流量）
├── LP_A_COPY.md                 LP_A 文案
├── LP_A_IMAGE_BRIEFS.md         LP_A 圖片需求
├── LP_A_cmoney_longdesc.html    LP_A 上 CMoney 的 HTML
│
├── LP_B_FRAMEWORK.md            LP_B 框架（廣告冷流量）
├── LP_B_COPY.md                 LP_B 文案（10 sections）
├── LP_B_INTRO_VIDEOS.md         LP_B 前導影片腳本（舊版）
├── SECTION_VISUAL_PLAN.md       LP_B 每 section 視覺規劃
│
├── STYLE_GUIDE.md               視覺風格指南
├── STYLE_GUIDE_GEMINI.md        給 Gemini 讀的 style guide
│
├── 前導片腳本/
│   └── 前導影片腳本_3切角_ABtest.md  ⭐ 最新前導影片腳本（A/B test）
│
├── LandingPage草圖_for_直播用戶/        LP_A 圖片素材
├── LandingPage截圖_for_直播用戶/        LP_A 上線後截圖
├── LandingPage草圖_for_廣告用戶/        LP_B 圖片素材 + 生圖腳本
│
├── 廣告素材圖/
│   ├── 00_廣告素材_背景與素材策略.md
│   └── 廣告素材生成Skill_1plus3/
│
├── 輪播圖/                          CMoney 既有輪播圖（風格參考）
├── 範例/                            參考範例圖
└── prompts/                         圖片生成 prompts
```

---

## 10. 關鍵 URL 快查

| 資源 | URL |
|---|---|
| LP_A（直播流量）| https://www.cmoney.tw/app/ItemContent.aspx?id=9094#instruction |
| LP_B1 作者切角 | https://www.cmoney.tw/course-media/17590/intro?platform=5 |
| LP_B2 時事切角 | https://www.cmoney.tw/course-media/17607/intro?platform=5 |
| LP_B3 功能切角 | https://www.cmoney.tw/course-media/17608/intro?platform=5 |

---

## 11. 專案測試假設

| Hypothesis | 怎麼驗證 |
|---|---|
| 「課程包裝」比「App 試用」對冷流量轉換率更高 | LP_B (課程包裝) vs LP_A (試用包裝) 同 $1 同 3 天，看 CTR + 結帳率 |
| 3 切角中某 angle 顯著勝出 | LP_B1 / B2 / B3 跑同期 Google Ads，比 CTR + 結帳率 + scroll depth |
| Appier in-app message 能把 3 天試用拉到 30%+ VIP 轉換 | 對照組 vs 有推播組，看升級率 |
| 「12 板塊找 AI 趨勢股」這個訴求對冷流量最強 | LP_B3 功能切角預期 CTR 最高（若假設成立）|

---

## 12. 下一步

- [ ] LP_B1 / B2 / B3 全部上線（圖片資產 + 前導影片）
- [ ] Google Ads campaign 設定（3 angle × 多組創意）
- [ ] Appier in-app message 排程設定
- [ ] 跑 2 週數據後 review 切角表現 → 決定主推 angle
