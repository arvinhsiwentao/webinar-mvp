/**
 * Viewer count simulation — name pool, target-count formula, and React hook.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 200+ display names simulating a real North American Chinese livestream audience.
 *
 * Modeled after actual WeChat / livestream display names — chaotic, varied,
 * and personal. Real people don't use formal 3-char names in livestreams.
 * Mix includes: English-only, nicknames, 昵称, English+中文姓, location tags,
 * role-based (xx妈妈), emoji, pinyin, internet handles, and only a few
 * formal Chinese names (because some people do keep those).
 *
 * The first 48 entries are the auto-chat names already referenced in the codebase
 * so they always appear when the simulation samples from the pool.
 */
export const NAME_POOL: string[] = [
  // ── Auto-chat names (must come first) ──────────────────────────────
  'Cindy 陈', '嘉欣', 'David', 'Emma', 'Kevin', '思琪F', 'Jason', 'Linda',
  'Alex', '雨桐', 'Andy', '志远何', 'Jenny', 'Vivian', 'Michael', '婷婷',
  '瑞霖', 'Amy', '陈思远', 'Sarah', '涵涵', 'Steven', '晓彤', 'Justin',
  '雅琪z', '文博', 'Lucy', '思源W', '朱朱', 'Ethan', '泽宇L', '一鸣',
  'Nicole', '雅文C', 'Ryan', '思颖', 'Helen', '浩然', '子琪', 'Grace',
  'Kevin郑', '艺馨', 'Brian', '嘉怡', '晨曦', '逸飞', 'Chris', '睿杰',

  // ── WeChat-style nicknames (most common in real livestreams) ───────
  '小鱼儿', '豆豆妈', '湾区老王', '纽约吃货', 'CC', '阿睿',
  '西雅图下雨了', '嘉嘉', '大毛', '球球', 'Coco', '小胖',
  '老赵', '团团', '多伦多的风', '阳阳妈', '琪琪', '小黑',
  '美西老李', '安安', '皮皮虾', 'momo', '花花', '小七',
  '湾区码农', '悠悠', '咪咪', 'yoyo', '宝妈日记', '叮当',
  '加州阳光', '麦麦', '温哥华小林', '甜甜', '小宇宙', '果果妈',
  '纽约老张', '月月', '蛋蛋', '芝加哥风城人', '点点', '星星',
  'LA吃喝玩乐', '糖糖', '小确幸', '波士顿龙虾', '乐乐', '暖暖',

  // ── English names (华人常用英文名, casual style) ────────────────────
  'Jennifer', 'Daniel', 'Michelle', 'Andrew', 'Jess', 'Derek',
  'Angela', 'Pat', 'Steph', 'Jon', 'Christine', 'Tim',
  'Sam', 'Vince', 'Mel', 'Ken', 'Becca', 'Jeff',
  'Amanda', 'Ray', 'Laura', 'Henry', 'Vicky', 'Jasmine',
  'Diana', 'Wayne', 'Tracy', 'Stan', 'Tiff', 'Winston',
  'Teresa', 'Dennis', 'Sharon', 'Sophie', 'Leo', 'Vivienne',

  // ── English + Chinese surname (very common pattern) ────────────────
  'Wendy王', 'Tony李', 'Sandy张', 'Eric林', 'Ivy黄', 'Alan吴',
  'Karen周', 'Marcus陈', 'Cynthia刘', 'Sean杨', 'Maggie赵', 'Roy郑',
  'Rachel何', 'Peter孙', 'Lisa高', 'Frank徐', 'Nancy许', 'Jack曹',

  // ── Casual Chinese (2-char, single char, or non-standard formats) ──
  '大伟', '小敏', '阿杰', '丽丽', '老陈', '小王',
  '阿May', '思思', '晓峰', '佳佳', '老周', '小蔡',
  '小美', '阿强', '文文', '小马', '阿琳', '明明',
  '小朱', '阿龙', '兰兰', '小孙', '阿飞', '萌萌',

  // ── Internet handles / pinyin / playful ────────────────────────────
  'happylife2026', 'sunflower', 'xixi_LA', 'lemon_tree',
  'panda88', 'starry夜', '奋斗的小鸟', 'silverbullet',
  'jasmine_tea', 'maple_leaf', 'ocean_blue', '追梦人',
  'phoenix飞', 'rainbow彩虹', 'morning_dew', '向日葵',
  'lucky_cat', 'coffee_addict', 'sunset_glow', '自由飞翔',

  // ── Role/life-stage based (very common among 华人妈妈群) ───────────
  '两娃妈', '三宝爸', '全职妈妈小李', 'homeschool妈妈',
  '新手妈咪', '职场辣妈', '带娃看世界', '育儿ing',

  // ── A few formal names (some people do keep real names) ────────────
  '张伟', '王芳', '陈磊', '林小雨', '赵鑫', '周颖',
  '吴昊', '杨洁', '黄志明', '刘洋',
];

/**
 * Calculate target viewer count at a given video timestamp.
 *
 * Phase 1 (Ramp-up):   0 → rampSec        → baseCount → peakTarget (easeOutQuad)
 * Phase 2 (Plateau):    rampSec → 80% dur   → peakTarget (stable)
 * Phase 3 (Decline):    80% dur → 100% dur  → peakTarget → 60% of peak (floored at 30%)
 */
export function getTargetCount(
  timeSec: number,
  peakTarget: number,
  rampSec: number,
  durationSec: number,
  baseCount: number = 0,
): number {
  const t = Math.max(0, Math.min(timeSec, durationSec));

  if (t <= rampSec) {
    // Phase 1 — Ramp-up with easeOutQuad from baseCount → peakTarget
    const progress = rampSec > 0 ? t / rampSec : 1;
    const eased = progress * (2 - progress); // easeOutQuad
    return Math.round(baseCount + (peakTarget - baseCount) * eased);
  } else if (t <= durationSec * 0.8) {
    // Phase 2 — Plateau at peak
    return peakTarget;
  } else {
    // Phase 3 — Linear decline to 60 % of peak (floored at 30%)
    const declineStart = durationSec * 0.8;
    const declineDuration = durationSec * 0.2;
    const progress =
      declineDuration > 0 ? (t - declineStart) / declineDuration : 1;
    const declined = Math.round(peakTarget * (1 - 0.4 * Math.min(progress, 1)));
    return Math.max(Math.round(peakTarget * 0.3), declined);
  }
}

// ── React Hook ─────────────────────────────────────────────────────────

export interface UseViewerSimulatorOptions {
  peakTarget: number;           // Admin-configured peak count (e.g., 60)
  rampMinutes: number;          // Minutes to reach peak (e.g., 15)
  videoDurationSec: number;     // Total video length in seconds
  currentTimeSec: number;       // Current playback position (updates frequently)
  isPlaying: boolean;           // Whether video is playing
  autoChatNames?: string[];     // Unique names from auto-chat (for sync)
  hostName?: string;            // Excluded from pool
  userName?: string;            // Excluded from pool (shown separately in UI)
  initialTimeSec?: number;      // For late joiners — fast-forward snapshot
}

export interface UseViewerSimulatorResult {
  viewers: string[];            // Current active viewer names
  viewerCount: number;          // viewers.length (convenience)
}

/**
 * Manages a stateful viewer list that grows/shrinks following a 3-phase
 * attendance curve driven by video playback time.
 *
 * - Ramp-up: viewers join quickly, auto-chat names prioritized
 * - Plateau: stable viewer count with occasional churn
 * - Decline: viewers leave, auto-chat names last to go
 */
export function useViewerSimulator(
  options: UseViewerSimulatorOptions,
): UseViewerSimulatorResult {
  const {
    peakTarget,
    rampMinutes,
    videoDurationSec,
    currentTimeSec,
    isPlaying,
    autoChatNames: autoChatNamesProp,
    hostName,
    userName,
    initialTimeSec,
  } = options;

  const rampSec = rampMinutes * 60;

  // ── Stable set of auto-chat names (memoised by reference) ──────────
  const autoChatNamesSet = useRef<Set<string>>(new Set());
  useEffect(() => {
    autoChatNamesSet.current = new Set(autoChatNamesProp ?? []);
  }, [autoChatNamesProp]);

  // ── Refs to avoid stale closures in tick ──────────────────────────
  const currentTimeRef = useRef(currentTimeSec);
  currentTimeRef.current = currentTimeSec;

  const viewersRef = useRef<string[]>([]);
  const availableRef = useRef<string[]>([]);
  const cooldownRef = useRef<Map<string, number>>(new Map()); // name → removal video-time
  const initializedRef = useRef(false);

  // Stable refs for options that the tick needs
  const peakTargetRef = useRef(peakTarget);
  peakTargetRef.current = peakTarget;
  const rampSecRef = useRef(rampSec);
  rampSecRef.current = rampSec;
  const videoDurationSecRef = useRef(videoDurationSec);
  videoDurationSecRef.current = videoDurationSec;

  // ── State exposed to React ────────────────────────────────────────
  const [viewers, setViewers] = useState<string[]>([]);

  // ── Helper: build the filtered pool (excludes host + user) ────────
  const buildPool = useCallback(() => {
    const excluded = new Set<string>();
    if (hostName) excluded.add(hostName);
    if (userName) excluded.add(userName);
    return NAME_POOL.filter((n) => !excluded.has(n));
  }, [hostName, userName]);

  // ── Initialization (on mount) ─────────────────────────────────────
  const baseCountRef = useRef(0);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const pool = buildPool();
    const initTime = initialTimeSec ?? 0;

    // Compute base count: ~35% of peak (30-40% with random variance)
    const base = Math.max(
      Math.round(peakTarget * (0.30 + Math.random() * 0.10)),
      1,
    );
    baseCountRef.current = base;

    const acNames = autoChatNamesSet.current;
    // Auto-chat names from the pool, in original order (earliest-firing first)
    const acInPool = pool.filter((n) => acNames.has(n));
    // Non-auto-chat names from the pool
    const nonAC = pool.filter((n) => !acNames.has(n));
    // Shuffle non-AC for random selection
    const shuffledNonAC = [...nonAC].sort(() => Math.random() - 0.5);

    if (initTime > 0) {
      // Late joiner — fast-forward to target count, floored at base
      const target = Math.max(
        base,
        getTargetCount(initTime, peakTarget, rampSec, videoDurationSec, base),
      );

      // Build initial viewers: auto-chat first (capped at target), then fill
      const initial: string[] = [];
      initial.push(...acInPool.slice(0, target));
      const remaining = target - initial.length;
      if (remaining > 0) {
        initial.push(...shuffledNonAC.slice(0, remaining));
      }

      const initialSet = new Set(initial);
      availableRef.current = pool.filter((n) => !initialSet.has(n));
      viewersRef.current = initial;
      setViewers(initial);
    } else {
      // Fresh start — pre-load base viewers immediately (hot start)
      const initial: string[] = [];
      // Cap auto-chat names at base to keep curve correct
      initial.push(...acInPool.slice(0, base));
      const remaining = base - initial.length;
      if (remaining > 0) {
        initial.push(...shuffledNonAC.slice(0, remaining));
      }

      const initialSet = new Set(initial);
      availableRef.current = pool.filter((n) => !initialSet.has(n));
      viewersRef.current = initial;
      setViewers(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tick loop (driven by isPlaying) ────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;

    let timerId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const now = currentTimeRef.current;
      const peak = peakTargetRef.current;
      const ramp = rampSecRef.current;
      const duration = videoDurationSecRef.current;
      const acNames = autoChatNamesSet.current;

      // ── Recycle expired cooldowns ──────────────────────────────
      const cooldown = cooldownRef.current;
      const expired: string[] = [];
      cooldown.forEach((removedAt, name) => {
        if (now - removedAt > 120) {
          expired.push(name);
        }
      });
      for (const name of expired) {
        cooldown.delete(name);
        // Only add back if not already in viewers or available
        if (
          !viewersRef.current.includes(name) &&
          !availableRef.current.includes(name)
        ) {
          availableRef.current.push(name);
        }
      }

      // ── Compute target with base offset and jitter ───────────
      const base = baseCountRef.current;
      const rawTarget = getTargetCount(now, peak, ramp, duration, base);

      // Apply organic jitter (±8% of peak)
      const jitterRange = Math.max(1, Math.round(peak * 0.08));
      let jitterDelta = Math.floor(Math.random() * (jitterRange * 2 + 1)) - jitterRange;

      // During ramp, bias jitter upward to avoid stalling near base
      if (now <= ramp && jitterDelta < 0) {
        jitterDelta = Math.random() > 0.5 ? 0 : Math.abs(jitterDelta);
      }

      const target = Math.max(base, rawTarget + jitterDelta);
      const currentViewers = viewersRef.current;
      const delta = target - currentViewers.length;

      let nextViewers = currentViewers;

      if (delta > 2) {
        // ── ADD viewers ──────────────────────────────────────────
        const addCount = Math.min(delta, Math.ceil(peak * 0.05));
        const toAdd: string[] = [];

        // Priority: auto-chat names whose first message is within
        // the next 60 seconds of currentTime
        const priorityAC = availableRef.current.filter(
          (n) => acNames.has(n),
        );
        // Add priority auto-chat names first (they need to be visible
        // before they "chat")
        for (const name of priorityAC) {
          if (toAdd.length >= addCount) break;
          toAdd.push(name);
        }

        // Fill remaining from available pool (random pick)
        if (toAdd.length < addCount) {
          const nonPriority = availableRef.current.filter(
            (n) => !toAdd.includes(n),
          );
          // Shuffle for randomness
          for (let i = nonPriority.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nonPriority[i], nonPriority[j]] = [nonPriority[j], nonPriority[i]];
          }
          const remaining = addCount - toAdd.length;
          toAdd.push(...nonPriority.slice(0, remaining));
        }

        if (toAdd.length > 0) {
          // Remove added names from available pool
          const addedSet = new Set(toAdd);
          availableRef.current = availableRef.current.filter(
            (n) => !addedSet.has(n),
          );
          nextViewers = [...currentViewers, ...toAdd];
        }
      } else if (delta < -2) {
        // ── REMOVE viewers ───────────────────────────────────────
        const removeCount = Math.min(
          Math.abs(delta),
          Math.ceil(peak * 0.02),
        );
        const isDecline = now > duration * 0.8;

        // Determine which viewers are protected
        // Protected = in autoChatNames set AND not in decline phase
        const removable = currentViewers.filter((name, idx) => {
          // Don't remove first 2 or last 2 (more natural churn from middle)
          if (idx < 2 || idx > currentViewers.length - 3) return false;
          // Auto-chat names are protected unless we're in decline
          if (!isDecline && acNames.has(name)) return false;
          return true;
        });

        // Pick from the middle of the removable list
        const toRemove: string[] = [];
        const removableCopy = [...removable];
        for (let i = 0; i < removeCount && removableCopy.length > 0; i++) {
          // Pick from middle-ish of remaining removable
          const midIdx = Math.floor(removableCopy.length / 2) +
            Math.floor((Math.random() - 0.5) * Math.min(removableCopy.length, 6));
          const clampedIdx = Math.max(0, Math.min(midIdx, removableCopy.length - 1));
          const [removed] = removableCopy.splice(clampedIdx, 1);
          toRemove.push(removed);
        }

        if (toRemove.length > 0) {
          const removeSet = new Set(toRemove);
          nextViewers = currentViewers.filter((n) => !removeSet.has(n));
          // Move removed to cooldown
          for (const name of toRemove) {
            cooldownRef.current.set(name, now);
          }
        }
      } else if (Math.abs(delta) <= 2 && Math.random() < 0.15) {
        // ── SWAP: remove 1 non-protected + add 1 new ────────────
        const isDecline = now > duration * 0.8;

        // Find a removable viewer (from middle, not protected)
        const removable = currentViewers.filter((name, idx) => {
          if (idx < 2 || idx > currentViewers.length - 3) return false;
          if (!isDecline && acNames.has(name)) return false;
          return true;
        });

        if (removable.length > 0 && availableRef.current.length > 0) {
          // Pick one to remove
          const removeIdx = Math.floor(Math.random() * removable.length);
          const toRemoveName = removable[removeIdx];

          // Pick one to add (prefer auto-chat names)
          const priorityAC = availableRef.current.filter(
            (n) => acNames.has(n),
          );
          let toAddName: string;
          if (priorityAC.length > 0) {
            toAddName = priorityAC[Math.floor(Math.random() * priorityAC.length)];
          } else {
            const randIdx = Math.floor(Math.random() * availableRef.current.length);
            toAddName = availableRef.current[randIdx];
          }

          // Apply swap
          nextViewers = currentViewers.filter((n) => n !== toRemoveName);
          nextViewers.push(toAddName);
          availableRef.current = availableRef.current.filter(
            (n) => n !== toAddName,
          );
          cooldownRef.current.set(toRemoveName, now);
        }
      }

      // ── Commit state if changed ────────────────────────────────
      if (nextViewers !== currentViewers) {
        viewersRef.current = nextViewers;
        setViewers(nextViewers);
      }

      // Schedule next tick (3-8 seconds randomized)
      timerId = setTimeout(tick, 3000 + Math.random() * 5000);
    };

    // Quick first tick (800-2000ms)
    timerId = setTimeout(tick, 800 + Math.random() * 1200);

    return () => clearTimeout(timerId);
  }, [isPlaying]);

  return {
    viewers,
    viewerCount: viewers.length,
  };
}
