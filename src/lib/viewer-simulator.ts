/**
 * Viewer count simulation — name pool and target-count formula.
 *
 * Pure TypeScript, no React dependencies.
 * A React hook (useViewerCount) will be added in a later task.
 */

/**
 * 200+ display names used for simulated viewer presence.
 *
 * Mix: ~55 % Chinese first names, ~45 % Western names common in Chinese diaspora.
 * The first 48 entries are the auto-chat names already referenced in the codebase
 * so they always appear when the simulation samples from the pool.
 */
export const NAME_POOL: string[] = [
  // ── Auto-chat names (must come first) ──────────────────────────────
  '小美', '阿明', 'David', 'Emma', 'Kevin', '小芳', 'Jason', 'Linda',
  'Alex', '小雨', 'Tom', '阿华', 'Jenny', '小李', 'Michael', '小张',
  '王强', 'Amy', '陈伟', 'Sarah', '刘洋', 'Peter', '黄丽', 'Bob',
  '赵敏', '周杰', 'Lucy', '吴涛', '孙燕', 'Jack', '李明', '张伟',
  'Nicole', '陈静', 'Ryan', '王芳', 'Helen', '刘强', '杨磊', 'Grace',
  '赵鑫', '周芳', 'Brian', '郭靖', '许可', '钱伟', 'Chris', '蒋勇',

  // ── Additional Chinese names ───────────────────────────────────────
  '小红', '阿杰', '志远', '文静', '海涛', '丽华', '建国', '秀英',
  '国强', '明珠', '伟东', '春花', '德华', '小玲', '阿宝', '文华',
  '丽萍', '志强', '美玲', '大伟', '小凤', '阿龙', '玉兰', '建华',
  '秋月', '晓东', '美华', '阿辉', '春梅', '文杰', '丽芳', '志华',
  '秀兰', '明辉', '小燕', '阿强', '玉华', '建军', '秋霞', '晓明',
  '美丽', '阿翔', '春兰', '文斌', '丽娟', '志刚', '秀芳', '明亮',
  '小敏', '阿伟', '玉珍', '建平', '秋菊', '晓辉', '美珍', '阿峰',
  '春燕', '小蓉', '阿成', '文龙', '丽红', '志明', '秀梅', '国华',
  '明伟', '小琳', '阿军', '玉芳', '建生', '秋萍', '晓峰', '美凤',
  '阿鹏', '春华', '文涛', '丽玲', '志伟', '秀华',

  // ── Additional Western names ───────────────────────────────────────
  'Jennifer', 'Daniel', 'Michelle', 'Andrew', 'Jessica', 'Steven',
  'Angela', 'Patrick', 'Stephanie', 'Jonathan', 'Christine', 'Timothy',
  'Samantha', 'Gregory', 'Melissa', 'Kenneth', 'Rebecca', 'Jeffrey',
  'Amanda', 'Raymond', 'Laura', 'Roger', 'Diane', 'Henry', 'Victoria',
  'Arthur', 'Diana', 'Wayne', 'Tracy', 'Stanley', 'Cindy', 'Vincent',
  'Teresa', 'Dennis', 'Sharon', 'George', 'Maria', 'Harry', 'Sophie',
  'Leo', 'Tiffany', 'Ray', 'Catherine', 'Frank', 'Monica', 'Howard',
  'Gloria',

  // ── Extra Chinese names ────────────────────────────────────────────
  '永强', '淑芬', '嘉欣', '浩然', '雅婷', '俊杰', '思琪', '宇轩',
  '雨萱', '子涵', '梓萱', '浩宇', '欣怡', '皓轩', '诗涵', '博文',

  // ── Extra Western names ────────────────────────────────────────────
  'Marcus', 'Olivia', 'Nathan', 'Natalie', 'Derek', 'Heather', 'Philip',
  'Karen', 'Scott', 'Vanessa', 'Alan', 'Cynthia', 'Martin', 'Wendy',
  'Eric', 'Ivy',
];

/**
 * Calculate target viewer count at a given video timestamp.
 *
 * Phase 1 (Ramp-up):   0 → rampSec        → 0 → peakTarget (easeOutQuad)
 * Phase 2 (Plateau):    rampSec → 80% dur   → peakTarget (stable)
 * Phase 3 (Decline):    80% dur → 100% dur  → peakTarget → 60% of peak (linear)
 */
export function getTargetCount(
  timeSec: number,
  peakTarget: number,
  rampSec: number,
  durationSec: number,
): number {
  const t = Math.max(0, Math.min(timeSec, durationSec));

  if (t <= rampSec) {
    // Phase 1 — Ramp-up with easeOutQuad
    const progress = rampSec > 0 ? t / rampSec : 1;
    const eased = progress * (2 - progress); // easeOutQuad
    return Math.round(peakTarget * eased);
  } else if (t <= durationSec * 0.8) {
    // Phase 2 — Plateau at peak
    return peakTarget;
  } else {
    // Phase 3 — Linear decline to 60 % of peak
    const declineStart = durationSec * 0.8;
    const declineDuration = durationSec * 0.2;
    const progress =
      declineDuration > 0 ? (t - declineStart) / declineDuration : 1;
    return Math.round(peakTarget * (1 - 0.4 * Math.min(progress, 1)));
  }
}
