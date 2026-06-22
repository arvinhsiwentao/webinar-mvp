-- ============================================================================
-- 1+3 方案（US$1 美股入门课）订单对帐 View
-- 从共用的 orders 表筛出 funnel='us_stock_course' 的订单，把 metadata 摊平成栏位。
-- 在 Supabase SQL Editor 执行一次即可；之后 `select * from us_stock_orders` 就是对帐清单。
--
-- 用途：成交真相以此为准（server 端写入，不受 GA4 in-app webview 断轨影响）。
--   • 切角（angle）100% 可得（source 后端写入）
--   • utm_* / gclid：从订单 metadata 摊平 —— 仅「补写归因」上线后的新订单才有值，
--     旧订单为空（历史无法回补）。gclid 可用于对到 Google Ads 的 campaign/ad。
-- ============================================================================
CREATE OR REPLACE VIEW us_stock_orders AS
SELECT
  id,
  created_at,
  paid_at,
  fulfilled_at,
  email,
  amount,                                   -- 单位：分（$1 = 100）
  ROUND(amount / 100.0, 2)        AS amount_usd,
  currency,
  status,                                   -- pending / paid / fulfilled / refunded / expired
  metadata->>'source'             AS source,        -- us_stock_course_feature
  REGEXP_REPLACE(metadata->>'source', '^us_stock_course_', '') AS angle,  -- feature / author / news
  metadata->>'productIds'         AS product_ids,
  -- 归因（补写上线后才有值）
  NULLIF(metadata->>'utm_source',   '') AS utm_source,
  NULLIF(metadata->>'utm_medium',   '') AS utm_medium,
  NULLIF(metadata->>'utm_campaign', '') AS utm_campaign,
  NULLIF(metadata->>'utm_content',  '') AS utm_content,
  NULLIF(metadata->>'gclid',        '') AS gclid,
  NULLIF(metadata->>'ga_client_id', '') AS ga_client_id,
  activation_code,
  stripe_session_id,
  stripe_payment_intent_id
FROM orders
WHERE metadata->>'funnel' = 'us_stock_course'
ORDER BY created_at DESC;

-- ── 常用对帐查询范例 ──
-- 1) 每日成交（已付款）：
-- SELECT date(paid_at) d, count(*) orders, sum(amount_usd) revenue
-- FROM us_stock_orders WHERE status IN ('paid','fulfilled') GROUP BY d ORDER BY d;
--
-- 2) 各切角成交数（对帐 GA4 是否漏算）：
-- SELECT angle, count(*) FILTER (WHERE status IN ('paid','fulfilled')) paid_orders
-- FROM us_stock_orders GROUP BY angle ORDER BY paid_orders DESC;
--
-- 3) 有 gclid 的订单占比（归因可达率）：
-- SELECT count(*) total, count(gclid) with_gclid,
--   ROUND(100.0*count(gclid)/count(*),1) pct
-- FROM us_stock_orders WHERE status IN ('paid','fulfilled');
