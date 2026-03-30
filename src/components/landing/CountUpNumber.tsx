'use client';

import { useEffect, useRef, useState } from 'react';

interface CountUpNumberProps {
  end: number;
  duration?: number; // ms
  suffix?: string;
  prefix?: string;
  className?: string;
}

/**
 * Animated counter that counts from 0 to `end` when scrolled into view.
 * Uses easeOutQuart for a satisfying deceleration.
 */
export default function CountUpNumber({
  end,
  duration = 2000,
  suffix = '',
  prefix = '',
  className = '',
}: CountUpNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;

    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(animate);
  }, [started, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}
