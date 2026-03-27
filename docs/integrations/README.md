# 第三方工具整合文件

本目錄記錄專案中所有第三方外部服務的技術文件。目標是讓接手的人（即使不熟悉這些工具）也能快速理解每個工具的用途、代碼位置和修改方式。

## 工具清單

| 文件 | 工具 | 一句話說明 |
|------|------|----------|
| [gtm-ga4.md](./gtm-ga4.md) | **GTM + GA4** | 數據追蹤 — 追蹤用戶行為、分析轉化漏斗。**包含完整鏈路說明（程式碼 / GTM 後台 / GA4 後台各自負責什麼）和修改指南** |
| [supabase.md](./supabase.md) | **Supabase** | 雲端資料庫 — 像一個超大的 Excel 檔案，存所有業務資料（6 張表） |
| [mux.md](./mux.md) | **Mux** | 影片管家 — 上傳影片、自動轉檔、串流播放給觀眾看 |
| [stripe.md](./stripe.md) | **Stripe** | 網路刷卡機 — 在網頁上收信用卡付款，雙重保險確認收款 |
| [sendgrid.md](./sendgrid.md) | **SendGrid** | 自動寄信機器人 — 報名確認、開播提醒、購買收據，4 種信件 |
| [google-sheets.md](./google-sheets.md) | **Google Sheets API** | 啟用碼倉庫 + 訂單同步 — 從試算表領啟用碼，每日同步訂單給業務團隊 |
| [video-player.md](./video-player.md) | **Video.js + HLS.js** | 影片播放器 — 播預錄影片但讓觀眾以為是真的直播（Simulive 幻覺機制） |

## 你是誰，先看哪份

| 你的角色 | 建議閱讀順序 |
|---------|------------|
| **剛加入的開發者** | 先看 [Supabase](./supabase.md)（了解資料結構）→ 再看你要負責的功能對應的工具 |
| **要改追蹤事件** | 看 [GTM + GA4](./gtm-ga4.md) 的「修改指南」和「三個節點各自負責什麼」 |
| **要改支付流程** | 先看 [Stripe](./stripe.md) → 再看 [Google Sheets](./google-sheets.md)（啟用碼是支付流程的一部分） |
| **要改影片播放** | 看 [Video.js](./video-player.md)，特別注意「幻覺機制」— 任何改動都要確認不會破壞直播假象 |
| **要改信件內容** | 看 [SendGrid](./sendgrid.md) 的「信件模板」章節 |

## 工具間的依賴關係

```
用戶報名
  → Supabase（存報名資料）
  → SendGrid（發確認信）

用戶觀看直播
  → Mux（提供影片串流）
  → Video.js（播放器 + 假直播幻覺）
  → GTM/GA4（追蹤觀看行為）

用戶購買
  → Stripe（處理付款）
  → Google Sheets（從試算表領取啟用碼）
  → Supabase（存訂單 + 啟用碼）
  → SendGrid（發購買確認信 + 啟用碼）
  → GTM/GA4（追蹤轉化）
```
