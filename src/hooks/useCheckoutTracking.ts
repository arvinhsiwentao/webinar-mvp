'use client';

import { useCallback, useEffect, useRef } from 'react';
import { trackGA4 } from '@/lib/analytics';

interface UseCheckoutTrackingOptions {
  webinarId: string;
  source: string;
}

interface UseCheckoutTrackingReturn {
  /** Seconds since the page was mounted — for time_since_view_sec on active events. */
  timeSinceView: () => number;
  /** Flag user as having toggled at least one product. Used in c_checkout_exit. */
  markSelected: () => void;
  /** Flag user as having clicked a confirm button. Used in c_checkout_exit. */
  markConfirmed: () => void;
}

/**
 * Tracks passive checkout-page events: page_view (on mount), scroll_depth
 * (one-shot per 25/50/75/100% threshold), and checkout_exit (visibilitychange
 * hidden + pagehide). Active events (plan_toggle, confirm_click, etc) are
 * fired by the page directly using timeSinceView() for relative timing.
 */
export function useCheckoutTracking({ webinarId, source }: UseCheckoutTrackingOptions): UseCheckoutTrackingReturn {
  // Set in mount effect below — keeps render pure (no Date.now during render).
  const mountTimeRef = useRef<number>(0);
  const maxScrollPctRef = useRef<number>(0);
  const firedThresholdsRef = useRef<Set<25 | 50 | 75 | 100>>(new Set());
  const didSelectRef = useRef<boolean>(false);
  const didConfirmRef = useRef<boolean>(false);
  const exitFiredRef = useRef<boolean>(false);

  // page_view on mount + viewport detection (kept inside effect → render stays pure)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    mountTimeRef.current = Date.now();
    const viewport: 'mobile' | 'desktop' = window.matchMedia('(min-width: 1024px)').matches ? 'desktop' : 'mobile';
    trackGA4('c_checkout_page_view', {
      webinar_id: webinarId,
      entry_source: source || 'direct',
      viewport,
    });
  }, [webinarId, source]);

  // scroll depth — one-shot per 25/50/75/100% threshold
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const compute = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const viewportH = window.innerHeight;
      const docH = Math.max(document.documentElement.scrollHeight, viewportH);
      const pct = Math.min(100, Math.round(((scrollY + viewportH) / docH) * 100));
      if (pct > maxScrollPctRef.current) maxScrollPctRef.current = pct;

      const thresholds: Array<25 | 50 | 75 | 100> = [25, 50, 75, 100];
      const sinceView = Math.round((Date.now() - mountTimeRef.current) / 1000);
      for (const t of thresholds) {
        if (pct >= t && !firedThresholdsRef.current.has(t)) {
          firedThresholdsRef.current.add(t);
          trackGA4('c_checkout_scroll_depth', {
            webinar_id: webinarId,
            percent: t,
            time_to_reach_sec: sinceView,
          });
        }
      }
    };

    // Throttle via rAF
    let rafQueued = false;
    const onScroll = () => {
      if (rafQueued) return;
      rafQueued = true;
      requestAnimationFrame(() => {
        rafQueued = false;
        compute();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial compute (in case page is short and already at 100%)
    compute();
    return () => window.removeEventListener('scroll', onScroll);
  }, [webinarId]);

  // exit — visibilitychange (mobile-reliable) + pagehide (desktop fallback). Fires at most once.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fireExit = () => {
      if (exitFiredRef.current) return;
      exitFiredRef.current = true;
      const dwellSec = Math.round((Date.now() - mountTimeRef.current) / 1000);
      trackGA4('c_checkout_exit', {
        webinar_id: webinarId,
        dwell_sec: dwellSec,
        max_scroll_pct: maxScrollPctRef.current,
        did_select: didSelectRef.current,
        did_confirm: didConfirmRef.current,
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') fireExit();
    };
    const onPageHide = () => fireExit();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [webinarId]);

  const timeSinceView = useCallback(() => {
    return Math.round((Date.now() - mountTimeRef.current) / 1000);
  }, []);

  const markSelected = useCallback(() => {
    didSelectRef.current = true;
  }, []);

  const markConfirmed = useCallback(() => {
    didConfirmRef.current = true;
  }, []);

  return {
    timeSinceView,
    markSelected,
    markConfirmed,
  };
}
