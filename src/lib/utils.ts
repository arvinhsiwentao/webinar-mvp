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

export function formatElapsedTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
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

export function formatCountdownMMSS(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone: string): boolean {
  // Accept North American phone formats: (xxx) xxx-xxxx, xxx-xxx-xxxx, xxxxxxxxxx, +1xxxxxxxxxx
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  // 10 digits or 11 digits starting with 1
  return /^\d{10}$/.test(cleaned) || /^1\d{10}$/.test(cleaned);
}

export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getVideoSourceType(url: string): string {
  if (url.endsWith('.m3u8')) return 'application/x-mpegURL';
  return 'video/mp4';
}

/**
 * Build an email link URL with EDM utm params and original campaign attribution.
 * EDM gets its own utm_source/medium/campaign so GA4 tracks the email touchpoint.
 * Original campaign params are preserved as orig_* for cross-session attribution.
 */
export function buildEmailLink(
  baseUrl: string,
  path: string,
  params: Record<string, string>,
  emailType: string,
  attribution?: { utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; gclid?: string }
): string {
  const url = new URL(path, baseUrl);

  // Base params (name, slot, etc.)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  // EDM-specific UTM (so GA4 attributes this session to email)
  url.searchParams.set('utm_source', 'edm');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', emailType);

  // Original campaign attribution (preserved from registration)
  if (attribution?.utmSource) url.searchParams.set('orig_source', attribution.utmSource);
  if (attribution?.utmMedium) url.searchParams.set('orig_medium', attribution.utmMedium);
  if (attribution?.utmCampaign) url.searchParams.set('orig_campaign', attribution.utmCampaign);
  if (attribution?.utmContent) url.searchParams.set('orig_content', attribution.utmContent);
  if (attribution?.gclid) url.searchParams.set('orig_gclid', attribution.gclid);

  return url.toString();
}

/**
 * Read stored UTM attribution params from sessionStorage (fast) with cookie fallback.
 * Returns a URLSearchParams-friendly record of non-empty values.
 * Client-side only — returns empty object during SSR.
 */
export function getStoredUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, string> = {};
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'gclid'];
  for (const key of keys) {
    try {
      const value = sessionStorage.getItem(key) || getCookieValue(key);
      if (value) result[key] = value;
    } catch { /* SSR or security error */ }
  }
  return result;
}

function getCookieValue(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}
