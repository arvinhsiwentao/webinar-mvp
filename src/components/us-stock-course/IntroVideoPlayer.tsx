'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Intro-video player for the us-stock-course landing pages.
 *
 * UX: show the cover image immediately with a "先听听 Mike 怎么说" prompt, while the
 * HLS stream preloads in the background. The user clicks to play — by which point the
 * stream is usually ready, so playback starts (with sound) without a visible buffering
 * gap. This is a marketing hook video, so NORMAL native controls (play/pause/seek) —
 * the simulive "this is a live stream" rules do not apply.
 *
 * - Safari plays Mux HLS natively; other browsers use hls.js (already a dependency).
 * - If src is null or the video errors, the cover image is shown on its own.
 */
export default function IntroVideoPlayer({
  src,
  poster,
  lazy = false,
  className = '',
}: {
  src: string | null;
  poster: string;
  /** Defer buffering until the user clicks play (for secondary/below-fold videos). */
  lazy?: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void; startLoad: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);

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

  const handlePlay = () => {
    setStarted(true);
    hlsRef.current?.startLoad?.(); // begin buffering now (no-op if already loading)
    const v = videoRef.current;
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
        preload={lazy ? 'none' : 'metadata'}
        controls={started}
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover bg-black ${className}`}
      />

      {/* Click-to-play splash: white play button pops on any cover; prompt label lives
          above the frame in the page body, so nothing overlaps the cover artwork. */}
      {!started && (
        <button
          type="button"
          onClick={handlePlay}
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
    </div>
  );
}
