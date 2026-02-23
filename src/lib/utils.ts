// Utility functions

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  };
  return date.toLocaleDateString('zh-CN', options);
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDateTime(dateString: string): string {
  return `${formatDate(dateString)} ${formatTime(dateString)}`;
}

export function formatCountdown(totalSeconds: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return { days, hours, minutes, seconds };
}

export function getTimeUntil(dateString: string): number {
  const targetTime = new Date(dateString).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((targetTime - now) / 1000));
}

export function generateICSContent(
  title: string,
  startTime: string,
  durationMinutes: number,
  description?: string,
  url?: string
): string {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Webinar MVP//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(start)}`,
    `DTEND:${formatICSDate(end)}`,
    `SUMMARY:${title}`,
    description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : '',
    url ? `URL:${url}` : '',
    `UID:${Date.now()}@webinar-mvp`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  const re = /^09\d{8}$/;
  return re.test(phone.replace(/[-\s]/g, ''));
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Detects if a URL is a YouTube video link.
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
 */
export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace('www.', '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      return (parsed.pathname === '/watch' && parsed.searchParams.has('v'))
        || parsed.pathname.startsWith('/embed/');
    }
    if (host === 'youtu.be') {
      return parsed.pathname.length > 1;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Determines the Video.js source type for a given URL.
 */
export function getVideoSourceType(url: string): string {
  if (isYouTubeUrl(url)) return 'video/youtube';
  if (url.endsWith('.m3u8')) return 'application/x-mpegURL';
  return 'video/mp4';
}
