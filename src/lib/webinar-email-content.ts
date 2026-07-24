/**
 * 報名成功信（confirmationEmail）的分場文案。
 *
 * 背景：Webinar 1（真人, /）用「三四五攻守罗盘」腳本、定位「讲座」；Webinar 3（HeyGen,
 * /free-webinar）用 V8「体验课架构版」腳本（AI 六层架构 + 选股四动作 + 仓位配置），定位「体验课」。
 * 兩場的報名成功信在「用詞（讲座/体验课）」「你将带走这些」「大綱」不同，其餘完全相同。
 *
 * 設計：所有分場差異（用詞 + 帶走 + 大綱）全部資料驅動，email.ts 依此 render。
 * DEFAULT = 現行 Webinar 1，逐字保留 → 保證 Webinar 1 及任何舊場次輸出零變動。
 * key 用 webinar 的 UUID（register 端傳入的 webinar.id，穩定不受數字索引位移影響）。
 *
 * ⚠️ Webinar 3 的 outline 必須與 landing 頁大綱（free-webinar/page.tsx 的
 *    「体验课大纲」陣列）保持一致；takeaways 對齊 landing 的 BENEFITS 三點。改一邊要改另一邊。
 */

export interface ConfirmationEmailContent {
  /** 場次用詞：讲座 / 体验课。用於「{noun}信息」「{noun}主题」「本次{noun}为限时公开」 */
  sessionNoun: string;
  /** 「你将带走这些」的副標 */
  takeawaySubhead: string;
  /** 大綱區塊標題：直播课大纲 / 体验课大纲 */
  outlineHeading: string;
  /** 進場按鈕文字：进入直播间 / 进入观看体验课 */
  enterButtonText: string;
  /** 「你将带走这些」條列（每項一句） */
  takeaways: string[];
  /** 大綱條列（編號 + 標題） */
  outline: { num: string; title: string }[];
}

/** 預設：Webinar 1（真人 / 三四五攻守罗盘 / 讲座），與改版前 email.ts 輸出逐字一致 */
const DEFAULT_CONTENT: ConfirmationEmailContent = {
  sessionNoun: '讲座',
  takeawaySubhead: '40 分钟，不是鸡汤，是策略',
  outlineHeading: '直播课大纲',
  enterButtonText: '进入直播间',
  takeaways: [
    '2026 三重机会窗口（AI + 降息 + 川普 2.0）— 钱现在在往哪流、下一步站哪里',
    '一套你能立刻执行的攻守框架 — 什么时候买、怎么配、什么时候不动',
    'Mike 开杠杆一天亏掉 50 万美金，后来怎么从「赌」变成「判断」',
  ],
  outline: [
    { num: '01', title: '普通人靠薪水为什么存不到钱？' },
    { num: '02', title: '三四五攻守罗盘 — Mike 每天在用的判断系统' },
    { num: '03', title: '一天亏 50 万美金之后 — 从「赌对」到「判断对」' },
    { num: '04', title: '一套可执行的投资框架 — 长短线怎么配、ETF 怎么选' },
    { num: '05', title: '真实学员案例 — 从零开始到稳定执行' },
  ],
};

/** Webinar 3（HeyGen / V8 体验课架构版 / 体验课），與 landing 頁對齊 */
const WEBINAR_3_HEYGEN_UUID = 'dbdf8b45-5f80-47d3-82c0-4a10a184dee4';
const WEBINAR_3_CONTENT: ConfirmationEmailContent = {
  sessionNoun: '体验课',
  takeawaySubhead: '不是鸡汤，是你能带走的策略',
  outlineHeading: '体验课大纲',
  enterButtonText: '进入观看体验课',
  takeaways: [
    '一张 Mike 亲手整理的 AI 完整版图，六层架构 + 十二大板块的重点股票清单',
    '最新的 AI 趋势判断，现在进场还来不来得及、资金正在往哪个板块冲',
    '一套最好的进场方法，什么时候该出手、怎么分批买',
  ],
  outline: [
    { num: '01', title: 'AI 六层架构：2026 年的机会在哪一层' },
    { num: '02', title: '选股四动作：看大盘 → 找风口 → 找交集 → 找买点' },
    { num: '03', title: '仓位配置：核心 / 卫星 / 现金，依年龄怎么调' },
    { num: '04', title: '真实学员实证 + 一天几分钟，怎么用工具上手' },
  ],
};

const BY_WEBINAR: Record<string, ConfirmationEmailContent> = {
  [WEBINAR_3_HEYGEN_UUID]: WEBINAR_3_CONTENT,
};

/** 依 webinar id（UUID）取報名成功信分場文案；未登錄者回傳預設（Webinar 1）。 */
export function getConfirmationEmailContent(webinarId?: string): ConfirmationEmailContent {
  return (webinarId && BY_WEBINAR[webinarId]) || DEFAULT_CONTENT;
}
