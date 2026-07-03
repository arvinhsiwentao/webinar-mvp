/**
 * 報名成功信（confirmationEmail）的分場文案。
 *
 * 背景：Webinar 1（真人, /）用「三四五攻守罗盘」腳本；Webinar 3（HeyGen, /free-webinar）
 * 用較舊的「AI 六层架构」腳本（對齊 05-05 HeyGen 影片）。兩場的報名成功信在「你将带走这些」
 * 與「直播课大纲」共 4 句不同，其餘完全相同。
 *
 * 設計：只存「與預設不同」的片段。DEFAULT = 現行 Webinar 1（345）字串，
 * 未列出的 webinar 一律回傳 DEFAULT → 保證 Webinar 1 及任何舊場次輸出零變動。
 * key 用 webinar 的 UUID（register 端傳入的 webinar.id，穩定不受數字索引位移影響）。
 */

export interface ConfirmationEmailContent {
  /** 「你将带走这些」第 1 點 */
  takeaway1: string;
  /** 「你将带走这些」第 3 點 */
  takeaway3: string;
  /** 「直播课大纲」第 02 項 */
  outline02: string;
  /** 「直播课大纲」第 03 項 */
  outline03: string;
}

/** 預設：Webinar 1（真人 / 三四五攻守罗盘），與現行 email.ts 完全一致 */
const DEFAULT_CONTENT: ConfirmationEmailContent = {
  takeaway1: '2026 三重机会窗口（AI + 降息 + 川普 2.0）— 钱现在在往哪流、下一步站哪里',
  takeaway3: 'Mike 开杠杆一天亏掉 50 万美金，后来怎么从「赌」变成「判断」',
  outline02: '三四五攻守罗盘 — Mike 每天在用的判断系统',
  outline03: '一天亏 50 万美金之后 — 从「赌对」到「判断对」',
};

/** Webinar 3（HeyGen / AI 六层架构），對齊 05-05 HeyGen 影片舊腳本 */
const WEBINAR_3_HEYGEN_UUID = 'dbdf8b45-5f80-47d3-82c0-4a10a184dee4';
const WEBINAR_3_CONTENT: ConfirmationEmailContent = {
  takeaway1: '2026 三重机会窗口（AI + 降息 + 川普 2.0）— 钱现在在哪一层、接下来往哪流',
  takeaway3: 'Mike 从负债 50 万到 43 岁财务自由，他做对了什么',
  outline02: 'AI 六层架构 — 2026 年的机会在哪一层',
  outline03: '从负债 50 万到 43 岁财务自由 — Mike 做对了什么',
};

const BY_WEBINAR: Record<string, ConfirmationEmailContent> = {
  [WEBINAR_3_HEYGEN_UUID]: WEBINAR_3_CONTENT,
};

/** 依 webinar id（UUID）取報名成功信分場文案；未登錄者回傳預設（Webinar 1）。 */
export function getConfirmationEmailContent(webinarId?: string): ConfirmationEmailContent {
  return (webinarId && BY_WEBINAR[webinarId]) || DEFAULT_CONTENT;
}
