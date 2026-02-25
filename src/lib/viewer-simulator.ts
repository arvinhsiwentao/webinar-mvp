/**
 * Viewer count simulation — name pool, target-count formula, and React hook.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

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
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const pool = buildPool();
    const initTime = initialTimeSec ?? 0;

    if (initTime > 0) {
      // Late joiner — fast-forward to target count
      const target = getTargetCount(
        initTime,
        peakTarget,
        rampSec,
        videoDurationSec,
      );

      const acNames = autoChatNamesSet.current;
      // Auto-chat names whose messages would have already fired
      const eligibleAC = pool.filter(
        (n) => acNames.has(n),
      );
      // Remaining non-auto-chat names
      const nonAC = pool.filter((n) => !acNames.has(n));

      // Shuffle non-AC for random selection
      const shuffledNonAC = [...nonAC].sort(() => Math.random() - 0.5);

      // Build initial viewers: auto-chat first, then fill from shuffled pool
      const initial: string[] = [];
      const acToAdd = eligibleAC.slice(0, target);
      initial.push(...acToAdd);
      const remaining = target - initial.length;
      if (remaining > 0) {
        initial.push(...shuffledNonAC.slice(0, remaining));
      }

      // Set up available pool (names not in initial viewers)
      const initialSet = new Set(initial);
      availableRef.current = pool.filter((n) => !initialSet.has(n));
      viewersRef.current = initial;
      setViewers(initial);
    } else {
      // Fresh start — empty viewers, full pool
      availableRef.current = [...pool];
      viewersRef.current = [];
      setViewers([]);
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

      // ── Compute target and delta ───────────────────────────────
      const target = getTargetCount(now, peak, ramp, duration);
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
