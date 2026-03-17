/**
 * Viewer count simulation — name pool, target-count formula, and React hook.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 200+ display names used for simulated viewer presence.
 *
 * Designed to mimic realistic North American Chinese (北美华人) naming:
 * - Chinese names use proper surname + given name (2-3 chars), avoiding
 *   textbook placeholders (李明) and celebrity names (周杰)
 * - English names reflect what Chinese diaspora actually use
 * - Some names use English + Chinese surname format (e.g., "Cindy 陈")
 * - Small/阿X patterns used sparingly (only as actual nicknames)
 *
 * The first 48 entries are the auto-chat names already referenced in the codebase
 * so they always appear when the simulation samples from the pool.
 */
export const NAME_POOL: string[] = [
  // ── Auto-chat names (must come first) ──────────────────────────────
  'Cindy 陈', '林嘉欣', 'David', 'Emma', 'Kevin', '方思琪', 'Jason', 'Linda',
  'Alex', '沈雨桐', 'Andy', '何志远', 'Jenny', 'Vivian', 'Michael', '黄婷婷',
  '王瑞霖', 'Amy', '陈思远', 'Sarah', '刘雨涵', 'Steven', '苏晓彤', 'Justin',
  '赵雅琪', '唐文博', 'Lucy', '吴思源', '朱雅芳', 'Ethan', '林泽宇', '张一鸣',
  'Nicole', '陈雅文', 'Ryan', '王思颖', 'Helen', '罗浩然', '杨子琪', 'Grace',
  '郑凯文', '曹艺馨', 'Brian', '徐嘉怡', '许晨曦', '钱逸飞', 'Chris', '蒋睿杰',

  // ── Chinese names (surname + given, realistic style) ───────────────
  '谢雨欣', '马晨阳', '宋佳宁', '韩博睿', '周思彤', '吕嘉琪', '潘子轩',
  '冯雨萱', '郭晓雯', '姜浩宇', '程思涵', '蔡欣妍', '丁泽恩', '贾诗韵',
  '田雨晨', '董子涵', '任嘉怡', '邓伟杰', '梁诗雅', '叶子默', '彭思远',
  '魏晨曦', '傅嘉琳', '钟雨桐', '卢子琦', '邹嘉欣', '熊博文', '万雅婷',
  '段子睿', '雷思源', '侯嘉宁', '龙雨萱', '廖子轩', '邱嘉怡', '石博源',
  '孟晓彤', '崔雅琪', '汤思远', '秦子涵', '江嘉琦', '庄雨欣', '范博睿',
  '苗子轩', '尹嘉怡', '顾思源', '沈雅文', '高子琦', '金嘉宁', '常雨桐',
  '白子默', '施博文', '陆嘉琳', '夏雅婷', '贺子睿', '倪思源', '严嘉欣',
  '文博源', '柳晓彤', '邢雅琪', '康思远', '毛子涵', '余嘉琦', '杜雨欣',
  '宁博睿', '凌子轩', '关嘉怡', '乔思源', '向雅文', '苏子琦', '洪嘉宁',

  // ── English names (popular among Chinese diaspora) ─────────────────
  'Jennifer', 'Daniel', 'Michelle', 'Andrew', 'Jessica', 'Derek',
  'Angela', 'Patrick', 'Stephanie', 'Jonathan', 'Christine', 'Timothy',
  'Samantha', 'Vincent', 'Melissa', 'Kenneth', 'Rebecca', 'Jeffrey',
  'Amanda', 'Raymond', 'Laura', 'Henry', 'Victoria', 'Jasmine',
  'Diana', 'Wayne', 'Tracy', 'Stanley', 'Tiffany', 'Winston',
  'Teresa', 'Dennis', 'Sharon', 'Sophie', 'Leo', 'Vivienne',
  'Catherine', 'Frank', 'Monica', 'Howard', 'Gloria', 'Elaine',
  'Connie', 'Gary', 'Irene', 'Nelson', 'Sandra', 'Albert',

  // ── Mixed format (English + Chinese surname) ───────────────────────
  'Wendy 王', 'Tony 李', 'Sandy 张', 'Eric 林', 'Ivy 黄', 'Alan 吴',
  'Karen 周', 'Marcus 陈', 'Cynthia 刘', 'Sean 杨', 'Maggie 赵', 'Roy 郑',

  // ── Casual/nickname style (少量, more natural) ─────────────────────
  '嘉嘉', '小鱼', 'CC', '阿睿', '豆豆妈', '湾区老王',
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
