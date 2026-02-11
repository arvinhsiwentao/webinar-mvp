'use client';

import { useEffect, useRef, useCallback } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';
import { isYouTubeUrl, getVideoSourceType } from '@/lib/utils';

export interface PlaybackEvent {
  type: 'play' | 'pause' | 'timeupdate' | 'ended' | 'ready';
  currentTime: number;
  duration: number;
}

export interface VideoPlayerProps {
  src: string;
  autoPlay?: boolean;
  onPlaybackEvent?: (event: PlaybackEvent) => void;
}

export default function VideoPlayer({ src, autoPlay = false, onPlaybackEvent }: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const lastReportedTime = useRef(0);

  const emitEvent = useCallback(
    (type: PlaybackEvent['type'], player: Player) => {
      onPlaybackEvent?.({
        type,
        currentTime: player.currentTime() ?? 0,
        duration: player.duration() ?? 0,
      });
    },
    [onPlaybackEvent],
  );

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered', 'vjs-fluid');
    videoRef.current.appendChild(videoElement);

    const isYT = isYouTubeUrl(src);
    const sourceType = getVideoSourceType(src);

    const playerOptions: Record<string, unknown> = {
      controls: true,
      autoplay: autoPlay,
      preload: 'auto',
      fluid: true,
      playbackRates: [], // no speed options
      controlBar: {
        progressControl: false, // disable seeking via progress bar
        remainingTimeDisplay: false,
        playbackRateMenuButton: false,
      },
      sources: [{ src, type: sourceType }],
    };

    if (isYT) {
      playerOptions.techOrder = ['youtube'];
      playerOptions.youtube = {
        ytControls: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        disablekb: 1,
      };
    }

    const player = videojs(videoElement, playerOptions);
    playerRef.current = player;

    // Disable keyboard seeking (left/right arrows, etc.)
    player.on('keydown', (e: KeyboardEvent) => {
      const blocked = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
      if (blocked.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Prevent seeking by monitoring time changes
    // Allow time to advance naturally (forward within 2s tolerance) but block skipping ahead
    let allowedTime = 0;
    player.on('timeupdate', () => {
      const current = player.currentTime() ?? 0;
      if (current > allowedTime + 2) {
        player.currentTime(allowedTime);
      } else if (current > allowedTime) {
        allowedTime = current;
      }
      // Also block rewinding — keep the user moving forward only
      if (current < allowedTime - 1) {
        player.currentTime(allowedTime);
      }
    });

    // Emit playback events
    player.on('ready', () => emitEvent('ready', player));
    player.on('play', () => emitEvent('play', player));
    player.on('pause', () => emitEvent('pause', player));
    player.on('ended', () => emitEvent('ended', player));

    // Throttled timeupdate events (every 1 second)
    player.on('timeupdate', () => {
      const current = Math.floor(player.currentTime() ?? 0);
      if (current !== lastReportedTime.current) {
        lastReportedTime.current = current;
        emitEvent('timeupdate', player);
      }
    });

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, autoPlay, emitEvent]);

  return (
    <div className="video-player-wrapper">
      <div ref={videoRef} data-vjs-player />
      <style jsx>{`
        .video-player-wrapper {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }
        .video-player-wrapper :global(.video-js) {
          width: 100%;
          height: 100%;
        }
        .video-player-wrapper :global(.vjs-progress-control) {
          display: none !important;
        }
        .video-player-wrapper :global(.vjs-current-time),
        .video-player-wrapper :global(.vjs-duration) {
          display: block !important;
          padding: 0 4px;
        }
        .video-player-wrapper :global(.vjs-time-divider) {
          display: block !important;
        }
      `}</style>
    </div>
  );
}
