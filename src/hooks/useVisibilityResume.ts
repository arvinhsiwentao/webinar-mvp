'use client';

import { useEffect } from 'react';
import type Player from 'video.js/dist/types/player';

interface UseVisibilityResumeOptions {
  eventPhase: string;
  slotTime: string | null;
  playerRef: React.RefObject<Player | null>;
  setEventPhase: (phase: 'loading' | 'pre_event' | 'pre_show' | 'live' | 'ended') => void;
  setIsMuted: (muted: boolean) => void;
  setAutoplayBlocked: (blocked: boolean) => void;
}

/**
 * Resumes video playback when the browser tab returns to the foreground.
 *
 * Handles:
 * - Pre-show -> live phase transition when tab becomes visible after start time
 * - Seek-to-live-wall position (catch up to real-time)
 * - Unmuted/muted play fallback chain
 */
export function useVisibilityResume(options: UseVisibilityResumeOptions): void {
  const { eventPhase, slotTime, playerRef, setEventPhase, setIsMuted, setAutoplayBlocked } = options;

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;

      // If still in pre_show but start time has passed, transition immediately
      if (eventPhase === 'pre_show' && slotTime) {
        const now = Date.now();
        const startMs = new Date(slotTime).getTime();
        if (now >= startMs) {
          setEventPhase('live');
          // Don't return — fall through so we can also attempt play once player mounts
        }
      }

      // If live, catch up to real-time and resume if paused
      if (eventPhase === 'live' || (eventPhase === 'pre_show' && slotTime && Date.now() >= new Date(slotTime).getTime())) {
        const player = playerRef.current;
        if (!player || player.isDisposed()) return;

        // Seek to live wall position so video catches up to real-time
        const seekToLiveWall = () => {
          if (player.isDisposed() || !slotTime) return;
          const elapsed = (Date.now() - new Date(slotTime).getTime()) / 1000;
          const duration = player.duration() || 0;
          if (duration > 0 && elapsed > 0) {
            const liveWall = Math.min(elapsed, duration);
            const currentPos = player.currentTime() || 0;
            // Only seek if more than 2 seconds behind live
            if (liveWall - currentPos > 2) {
              player.currentTime(liveWall);
            }
          }
        };

        // If already playing, just catch up position and return
        if (!player.paused()) {
          seekToLiveWall();
          return;
        }

        const attemptPlay = () => {
          if (player.isDisposed()) return;
          seekToLiveWall();
          // Try unmuted play first (user just switched to tab = user gesture context)
          player.muted(false);
          const playPromise = player.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise.then(() => {
              setIsMuted(false);
              setAutoplayBlocked(false);
            }).catch(() => {
              // Unmuted play blocked — fall back to muted
              player.muted(true);
              setIsMuted(true);
              const mutedPromise = player.play();
              if (mutedPromise && typeof mutedPromise.then === 'function') {
                mutedPromise.then(() => {
                  setAutoplayBlocked(false);
                }).catch(() => {
                  setAutoplayBlocked(true);
                });
              }
            });
          }
        };

        // If media hasn't loaded yet (background tabs defer loading), wait for it
        if (player.readyState() < 3) {
          player.one('canplay', attemptPlay);
        } else {
          attemptPlay();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [eventPhase, slotTime, playerRef, setEventPhase, setIsMuted, setAutoplayBlocked]);
}
