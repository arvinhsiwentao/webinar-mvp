'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { trackGA4 } from '@/lib/analytics';

interface UsePlaybackTrackingOptions {
  webinarId: string;
  userName: string;
  lateJoinSeconds: number;
  isPlaying: boolean;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
}

export function usePlaybackTracking(options: UsePlaybackTrackingOptions): {
  handlePlaybackEvent: (event: { type: string; currentTime: number; duration: number }) => void;
} {
  const { webinarId, userName, lateJoinSeconds, isPlaying, setCurrentTime, setIsPlaying } = options;
  const router = useRouter();

  // Tracking milestones
  const trackedMilestones = useRef<Set<number>>(new Set());
  const currentTimeRef = useRef(0);

  // Video heartbeat — sends watch position every 60 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const watchDuration = Math.round(currentTimeRef.current - lateJoinSeconds);
      if (watchDuration > 0) {
        trackGA4('c_video_heartbeat', {
          webinar_id: webinarId,
          current_time_sec: Math.round(currentTimeRef.current),
          watch_duration_sec: watchDuration,
        });
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [isPlaying, webinarId, lateJoinSeconds]);

  // Handle video playback events
  const handlePlaybackEvent = useCallback(
    (event: { type: string; currentTime: number; duration: number }) => {
      if (event.type === 'timeupdate') {
        setCurrentTime(event.currentTime);
        currentTimeRef.current = event.currentTime;
        if (event.duration > 0) {
          const percent = Math.floor((event.currentTime / event.duration) * 100);
          const milestones = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
          for (const milestone of milestones) {
            if (percent >= milestone && !trackedMilestones.current.has(milestone)) {
              trackedMilestones.current.add(milestone);
              trackGA4('c_video_progress', { webinar_id: webinarId, percent: milestone });
            }
          }
        }
      }
      if (event.type === 'play') {
        setIsPlaying(true);
      }
      if (event.type === 'pause') {
        setIsPlaying(false);
      }
      if (event.type === 'ended') {
        setIsPlaying(false);
        // Final heartbeat with exact end position
        trackGA4('c_video_heartbeat', {
          webinar_id: webinarId,
          current_time_sec: Math.round(event.currentTime),
          watch_duration_sec: Math.round(event.currentTime - lateJoinSeconds),
        });
        // Persist watch duration for End Page
        try {
          sessionStorage.setItem(`webinar-${webinarId}-watch-duration`, String(Math.round(event.currentTime - lateJoinSeconds)));
        } catch { /* ignore */ }
        // Redirect to end page after short delay
        setTimeout(() => {
          router.push(`/webinar/${webinarId}/end?name=${encodeURIComponent(userName)}`);
        }, 2000);
      }
    },
    [webinarId, router, userName, lateJoinSeconds, setCurrentTime, setIsPlaying]
  );

  return { handlePlaybackEvent };
}
