# Supabase（線上資料庫服務）

## 它是什麼

Supabase 是一個「雲端資料庫管家」—— 你可以把它想像成一個放在雲端的超大 Excel 檔案。就像 Excel 裡有很多工作表（Sheet），每張表存不同類型的資料，Supabase 裡也有很多「資料表」，分別存研討會資訊、用戶報名紀錄、訂單等等。

跟 Excel 不同的是，Supabase 背後用的是 PostgreSQL（一種專業的資料庫系統，比 Excel 更快、更安全、能處理更多人同時存取）。但你不需要自己架設或維護這個資料庫 —— Supabase 幫你託管在雲端，我們只需要透過程式跟它溝通就好。

## 在專案中做什麼

Supabase 在我們的專案裡負責三件事：

1. **存所有資料** —— 研討會設定、誰報了名、誰買了單、聊天內容、影片檔案資訊，全部存在這裡。就像店裡的總帳本
2. **讓程式能讀寫資料** —— 透過 REST API（一種標準的網路溝通方式，程式對資料庫說「幫我查 XX」或「幫我新增一筆 YY」）來存取資料
3. **只讓伺服器存取** —— 用一把特殊的鑰匙（Service Role Key）確保只有我們的伺服器能碰資料庫，用戶的瀏覽器碰不到

## 需要設定的密碼和金鑰

就像進保險箱需要鑰匙，程式要連上 Supabase 也需要兩把「鑰匙」。這些叫做環境變數（Environment Variables，存在伺服器上的機密設定值，程式啟動時會讀取）：

| 鑰匙名稱 | 做什麼用的 |
|------|------|
| `SUPABASE_URL` | Supabase 的「地址」—— 告訴程式去哪裡找到我們的資料庫，就像郵寄需要地址一樣 |
| `SUPABASE_SERVICE_ROLE_KEY` | 資料庫的「萬能鑰匙」—— 有了它就能讀寫所有資料。**絕對不能外洩**，洩漏等於把資料庫的門打開讓所有人隨便進出 |

### 連線方式

**檔案**：`src/lib/supabase.ts`

程式不會一開機就連上資料庫，而是等到「第一次需要查資料」的時候才連線，之後就一直用同一條連線。這種做法叫 Lazy 初始化（懶載入 —— 需要的時候才啟動，不浪費資源）。

**重要**：Service Role Key 絕不能出現在用戶的瀏覽器上。所有跟資料庫的溝通都只在伺服器端進行，用戶看不到也碰不到。

## 資料庫裡有哪些「表格」

把資料庫想像成一個 Excel 檔案，裡面有 6 張工作表（Sheet），每張表存不同種類的資料：

| 表格名稱 | 存什麼 | 裡面有哪些重要欄位 |
|------|------|---------|
| `webinars` | 研討會的所有設定 | 標題、講師名字、影片網址、狀態（草稿/已發布/已結束）、常青模式設定、自動聊天訊息、CTA 彈窗設定 |
| `registrations` | 用戶報名紀錄 | 哪場研討會、email、姓名、電話、被分配到哪個場次、場次到期時間 |
| `chat_messages` | 直播聊天紀錄 | 哪場研討會、發言者名字、訊息內容、發送時間 |
| `orders` | 購買訂單 | 哪場研討會、買家 email、Stripe 付款編號、訂單狀態（等待付款/已付款/已完成/已退款/已過期）、啟用碼 |
| `video_files` | 影片檔案資訊 | 檔案名稱、處理狀態（上傳中/處理中/可播放/出錯）、Mux 影片編號、播放網址 |
| `events` | 操作紀錄（留底備查） | 事件資料、建立時間 |

### 特殊欄位：JSONB（可以塞很多東西的「百寶袋」欄位）

`webinars` 表裡有幾個特殊欄位，它們不是普通的文字或數字，而是 JSONB 格式（可以想像成「一個欄位裡面再塞一整張小表格」，能存結構化的複雜資料）：

- `auto_chat` —— 自動聊天訊息（預設好的假聊天，每條都帶發送時間）
- `cta_events` —— CTA 彈窗設定（什麼時候跳出來、按鈕寫什麼字、顯示在哪個位置）
- `subtitle_cues` —— 字幕資料
- `evergreen` —— 常青模式設定（每天幾點開播、用什麼時區、即時場次規則）

### 防止重複的規則（唯一約束）

就像同一場演唱會不能用同一張身分證買兩次票，資料庫裡也有防重複的規則：

- **同一場研討會 + 同一個 email = 只能報名一次** —— 防止用戶重複報名
- **每個 Stripe 付款編號只對應一筆訂單** —— 防止同一筆付款產生多筆訂單
- **啟用碼不可重複** —— 確保每組啟用碼都是獨一無二的

## 資料怎麼流動

### 哪個功能會碰哪張表

下面這張對照表列出系統裡每個功能（API Route，可以想成「伺服器上的一個個服務窗口」）會存取哪些表格：

| 服務窗口（API Route） | 動作 | 存取的表格 |
|-----------|------|---------|
| `/api/webinar` | 查詢 | webinars |
| `/api/webinar/[id]` | 查詢 | webinars、registrations（算報名人數） |
| `/api/register` | 新增報名 | webinars、registrations |
| `/api/webinar/[id]/chat` | 讀取/發送聊天 | webinars、chat_messages |
| `/api/webinar/[id]/next-slot` | 查下一個場次 | webinars |
| `/api/webinar/[id]/reassign` | 重新分配場次 | webinars、registrations |
| `/api/checkout/create-session` | 建立訂單 | webinars、orders |
| `/api/checkout/session-status` | 查訂單狀態 | orders |
| `/api/checkout/webhook` | Stripe 付款通知 | orders |
| `/api/admin/webinar` | 管理研討會 | webinars |
| `/api/admin/webinar/[id]` | 管理單場研討會 | webinars、registrations |
| `/api/admin/videos` | 管理影片 | video_files |
| `/api/admin/videos/[id]` | 管理單支影片 | video_files、webinars |
| `/api/cron/reminders` | 寄提醒信 | webinars、registrations |
| `/api/cron/orders-sync` | 同步訂單狀態 | orders |

## 相關程式碼檔案

| 檔案位置 | 它負責什麼 |
|------|------|
| `src/lib/supabase.ts` | 連線設定（把鑰匙插進去、跟資料庫建立連線） |
| `src/lib/db.ts` | 所有讀寫資料的函數（約 400 行）—— 新增報名、查詢研討會、更新訂單等等，所有跟資料庫打交道的程式碼都在這裡 |
| `src/lib/types.ts` | TypeScript 型別定義（規定每張表的資料長什麼樣，像是「報名紀錄一定要有 email 欄位」） |
| `src/lib/audit.ts` | 操作紀錄寫入 —— 把重要操作記到 events 表裡，留底備查 |
| `src/middleware.ts` | 權限檢查（確認是管理員才能進後台）+ UTM 追蹤 Cookie |
| `scripts/supabase-schema.sql` | 完整的資料庫設計圖 —— 定義所有表格的結構（建立資料庫時跑這個檔案） |
| `scripts/add-indexes.sql` | 效能優化用的索引（像書本的目錄一樣，讓查詢更快） |

## 命名轉換：資料庫和程式碼「說不同語言」

資料庫裡的欄位名用底線分隔（snake_case），例如 `webinar_id`。但 TypeScript 程式碼習慣用駝峰式命名（camelCase），例如 `webinarId`。

`db.ts` 裡有自動翻譯的函數，在資料進出的時候自動轉換，程式設計師不用手動處理：
- `snakeToCamel()` —— 資料從資料庫出來時，把 `webinar_id` 轉成 `webinarId`
- `camelToSnake()` —— 資料要寫進資料庫時，把 `webinarId` 轉回 `webinar_id`

## 需要注意的重要事項

1. **沒有用 RLS（資料庫層級的權限控制）** —— Supabase 有內建的 RLS 功能（Row Level Security，可以設定「A 用戶只能看到自己的資料」），但我們沒有用。所有的權限檢查都在程式碼裡處理（透過 middleware 確認身份）。為什麼？因為我們用的是 Service Role Key，它本身就繞過 RLS，所以 RLS 形同虛設

2. **Service Role Key 等於資料庫的萬能鑰匙** —— 它擁有完整的讀寫權限，如果洩漏出去，任何人都能讀取、修改、刪除所有資料。所以這把鑰匙只存在伺服器端，絕對不會出現在用戶能看到的地方

3. **防止重複出貨的「搶票機制」** —— `updateOrderStatus(id, fromStatus, toStatus)` 這個函數在更新訂單狀態時，會用一個巧妙的條件：「只有當目前狀態是 X 的時候，才改成 Y」。這樣即使兩個流程同時嘗試處理同一筆訂單，也只有一個會成功。就像搶票一樣，同一張票只能賣給一個人

4. **不重要的事情不擋路（Fire-and-forget）** —— 操作紀錄、寄 email、webhook 通知這些「順便做」的事情，都用非阻塞方式執行。意思是：就算這些事情失敗了，也不會拖慢或中斷主要流程。就像餐廳出菜不會因為收據機壞了就停止上菜

5. **支援兩種 ID 格式** —— `getWebinarById()` 同時支援 UUID（一長串英數混合的唯一編號，例如 `a1b2c3d4-...`）和普通數字 ID（例如 `1`）。這是為了相容舊版資料

## 官方文件

- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)（Supabase 的程式工具包使用說明）
- [Supabase 管理後台](https://supabase.com/dashboard)（登入後可以直接在網頁上查看和管理資料庫）
