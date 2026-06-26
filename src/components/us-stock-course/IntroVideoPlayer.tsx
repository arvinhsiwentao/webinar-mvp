'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Intro-video player for the us-stock-course landing pages.
 *
 * Two modes:
 * - autoplay (hero): start muted automatically on mount; show a centered "tap to unmute"
 *   overlay while muted. Clicking anywhere unmutes; native controls appear after that.
 *   If the browser rejects autoplay we fall back to click-to-play.
 * - click-to-play (trailers below the fold): show cover + play button, click to start.
 *
 * - Safari plays Mux HLS natively; other browsers use hls.js (already a dependency).
 * - If src is null or the video errors, the cover image is shown on its own.
 * - This is a marketing hook video, so NORMAL native controls (play/pause/seek) —
 *   the simulive "this is a live stream" rules do not apply.
 */
export default function IntroVideoPlayer({
  src,
  poster,
  lazy = false,
  autoplay = false,
  className = '',
  onPlay,
  objectFit = 'cover',
}: {
  src: string | null;
  poster: string;
  /** Defer buffering until the user clicks play (for secondary/below-fold videos). */
  lazy?: boolean;
  /** Autoplay muted on mount; user taps the speaker icon to unmute. */
  autoplay?: boolean;
  className?: string;
  /** Fired once on first engaged play (click-to-start, or unmute in autoplay mode). */
  onPlay?: () => void;
  /** 'contain' shows the whole frame (e.g. portrait tutorial clips); 'cover' fills/crops. */
  objectFit?: 'cover' | 'contain';
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void; startLoad: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  // In autoplay mode we skip the click-to-play splash immediately (no flash before the
  // useEffect runs). If autoplay later rejects, we flip back to false.
  const [started, setStarted] = useState(autoplay);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let cancelled = false;

    // Native HLS (Safari / iOS) — just set the source; preload attr controls buffering.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    // Other browsers — load hls.js. With lazy, hold buffering until startLoad() on play.
    import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled) return;
        if (Hls.isSupported()) {
          const instance = new Hls({ enableWorker: true, autoStartLoad: !lazy });
          instance.loadSource(src);
          instance.attachMedia(video);
          instance.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) setFailed(true);
          });
          hlsRef.current = instance;
        } else {
          video.src = src;
        }
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, lazy]);

  // Autoplay muted on mount — wait for metadata to be loaded before calling play() so
  // hls.js has attached the manifest. If the browser blocks autoplay (rare with muted,
  // but possible under Low Power Mode / Data Saver) we revert to the click-to-play splash.
  useEffect(() => {
    if (!autoplay || !src) return;
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;

    const tryPlay = () => {
      video.play().then(() => {
        setStarted(true);
      }).catch(() => {
        setStarted(false);
      });
    };

    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('loadedmetadata', tryPlay, { once: true });
      return () => video.removeEventListener('loadedmetadata', tryPlay);
    }
  }, [autoplay, src]);

  const handleUnmute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setMuted(false);
    onPlay?.(); // engagement moment in autoplay flow
    if (v.paused) v.play().catch(() => { /* user can press the native control */ });
  };

  const handleStart = () => {
    const v = videoRef.current;
    setStarted(true);
    setMuted(false);
    if (v) v.muted = false;
    onPlay?.(); // first-play analytics (splash only renders while !started, so fires once)
    hlsRef.current?.startLoad?.(); // begin buffering now (no-op if already loading)
    if (v) v.play().catch(() => { /* user can press the native control */ });
  };

  // Cover-only: no video source yet, or playback failed.
  if (!src || failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster} alt="课程介绍" className={`w-full h-full object-cover ${className}`} />
    );
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        muted={muted}
        preload={lazy ? 'none' : 'metadata'}
        // Hide native controls while muted (in autoplay mode) so the full-area unmute
        // overlay can catch clicks anywhere. Controls appear after unmute / after the
        // click-to-play splash is dismissed.
        controls={started && !muted}
        onError={() => setFailed(true)}
        className={`w-full h-full ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} bg-black ${className}`}
      />

      {/* Click-to-play splash: white play button pops on any cover; prompt label lives
          above the frame in the page body, so nothing overlaps the cover artwork. */}
      {!started && (
        <button
          type="button"
          onClick={handleStart}
          aria-label="播放影片"
          className="absolute inset-0 flex items-center justify-center bg-black/45 hover:bg-black/35 transition-colors cursor-pointer group"
        >
          <span className="w-14 h-14 md:w-[68px] md:h-[68px] rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.5),0_4px_20px_rgba(0,0,0,0.5)] ring-2 ring-white group-hover:bg-black/65 group-hover:scale-110 transition-all duration-300">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff" className="ml-0.5">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}

      {/* Tap-to-unmute overlay — autoplay mode only, while still muted. Full-area click
          target so users can click anywhere on the video to turn sound on. */}
      {started && muted && (
        <button
          type="button"
          onClick={handleUnmute}
          aria-label="开启声音"
          className="absolute inset-0 flex items-center justify-center bg-transparent cursor-pointer group"
        >
          <span className="flex items-center gap-2.5 px-4 py-2.5 md:px-5 md:py-3 rounded-full bg-black/65 backdrop-blur-md shadow-[0_0_24px_rgba(255,255,255,0.45),0_4px_20px_rgba(0,0,0,0.5)] ring-2 ring-white/90 group-hover:bg-black/80 group-hover:scale-105 transition-all duration-300 animate-pulse">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" aria-hidden>
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.17v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
            <span className="text-white text-sm md:text-base font-medium tracking-wide whitespace-nowrap">点此开启声音</span>
          </span>
        </button>
      )}
    </div>
  );
}
