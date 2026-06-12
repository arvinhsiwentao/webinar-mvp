/**
 * us-stock-course ($1 / 1+3) direct-purchase funnel — single source of config.
 *
 * This funnel is intentionally separate from the simulive webinar funnel:
 * - No lobby/live/end. The LP sells the $1 offer and goes straight to checkout.
 * - 3 ad "angles" (author/news/feature) share one body; only the intro video
 *   + hook copy differ (see ANGLE_CONFIG).
 * - Orders attach to an invisible "container" webinar row (US_STOCK_CONTAINER_WEBINAR_ID)
 *   so the existing order/fulfillment plumbing works. The container never appears in any URL.
 */

import { PRODUCT_IDS } from '@/lib/products';

export const US_STOCK_ANGLES = ['author', 'news', 'feature'] as const;
export type UsStockAngle = (typeof US_STOCK_ANGLES)[number];

export function isValidAngle(value: string): value is UsStockAngle {
  return (US_STOCK_ANGLES as readonly string[]).includes(value);
}

/** Default angle when the checkout/return page is reached without a valid ?angle=. */
export const DEFAULT_ANGLE: UsStockAngle = 'author';

/** Resolve any string to a valid angle (falls back to DEFAULT_ANGLE). */
export function resolveAngle(value: string | null | undefined): UsStockAngle {
  return value && isValidAngle(value) ? value : DEFAULT_ANGLE;
}

/** The $1 SKU bought by this funnel (fixed — no product selection). */
export const US_STOCK_PRODUCT_ID = PRODUCT_IDS.US_STOCK_1PLUS3;

/**
 * Container webinar row UUID that orders attach to (FK requirement of createOrder).
 * Use the real UUID, NOT a numeric index — getWebinarById's numeric path is positional
 * (Nth row by created_at) and silently shifts if webinars are added/removed.
 * PREREQUISITE (Phase 0): create a webinars row and set this env var to its id.
 */
export const US_STOCK_CONTAINER_WEBINAR_ID =
  process.env.US_STOCK_CONTAINER_WEBINAR_ID || 'TODO_US_STOCK_CONTAINER_WEBINAR_UUID';

/** Funnel tag stamped on orders/events for clean separation from the webinar funnel. */
export const US_STOCK_FUNNEL = 'us_stock_course';

/** Free trailer videos (Mux HLS) shown in the course-intro section. */
export const TRAILERS = [
  {
    label: 'Ch0',
    title: '课程序章',
    hls: 'https://stream.mux.com/i5QBNnKUfxhaMrZ9XRK9w8r8GXZ9jg4gogGezPTJm1I.m3u8',
    poster: 'https://image.mux.com/i5QBNnKUfxhaMrZ9XRK9w8r8GXZ9jg4gogGezPTJm1I/thumbnail.webp?time=2',
  },
  {
    label: 'Ch1',
    title: '投资逻辑总纲',
    hls: 'https://stream.mux.com/mfTqoYR9ww5h01RexGAFZLMx3sL02aYAyjeFb00I01QrwYI.m3u8',
    poster: 'https://image.mux.com/mfTqoYR9ww5h01RexGAFZLMx3sL02aYAyjeFb00I01QrwYI/thumbnail.webp?time=2',
  },
];

export interface AngleConfig {
  /** Mux HLS URL for the angle's intro hook video. null → poster only (v1 fallback). */
  introVideoHls: string | null;
  /** Poster image shown before/instead of the video. */
  poster: string;
  /** Angle-specific hero headline. */
  heroHeadline: string;
  /** Angle-specific hero sub-headline. */
  heroSub: string;
  /** Angle-specific hook paragraph above the hero CTA. */
  hookCopy: string;
  /** App download QR image (per angle, for attribution via onelink). */
  qr: string;
  /** App download onelink URL (per angle). */
  appUrl: string;
}

/**
 * Per-angle differences. Everything else (痛点/框架/9章/App表/FAQ) is shared in
 * UsStockCourseBody. Copy sourced from 1_plus_3_landingpage/LP_B_COPY.md +
 * PROJECT_BACKGROUND.md §4 (audience per angle).
 *
 * PREREQUISITE (Phase 0): upload the 3 hook mp4s to Mux and paste the HLS URLs
 * (https://stream.mux.com/{playbackId}.m3u8). Until then introVideoHls stays null
 * and the page renders the poster only.
 */
export const ANGLE_CONFIG: Record<UsStockAngle, AngleConfig> = {
  // 🅰 作者切角 — 信任：Mike 是谁、负债到财富自由
  author: {
    introVideoHls: 'https://stream.mux.com/hUPl34zJltX96FmBOKOw372UC8N00Qi9lB6mjByCV13M.m3u8',
    poster: '/images/us-stock/cover.webp',
    heroHeadline: '从负债 50 万到财务自由的投资框架',
    heroSub: '',
    hookCopy:
      '你现在的迷茫，怕买错、怕亏钱、光靠薪水看不到尽头，我全都经历过。这 9 章课，是我花十几年验证、真正能复制的方法。',
    qr: '/images/us-stock/qr-author.webp',
    appUrl: 'https://cmoneymike.onelink.me/ZEaW/w7ntvnjd',
  },
  // 🅱 时事切角 — hero 文案沿用 author 定稿（仅 intro 影片 / QR / onelink 因归因而不同）
  news: {
    introVideoHls: 'https://stream.mux.com/qzsDylu8pTAFI8xRhqavri1z9dTcmSHt6TZEAtXwZsw.m3u8',
    poster: '/images/us-stock/cover.webp',
    heroHeadline: '从负债 50 万到财务自由的投资框架',
    heroSub: '',
    hookCopy:
      '你现在的迷茫，怕买错、怕亏钱、光靠薪水看不到尽头，我全都经历过。这 9 章课，是我花十几年验证、真正能复制的方法。',
    qr: '/images/us-stock/qr-news.webp',
    appUrl: 'https://cmoneymike.onelink.me/ZEaW/w873ef51',
  },
  // 🅲 功能切角 — hero 文案沿用 author 定稿（仅 intro 影片 / QR / onelink 因归因而不同）
  feature: {
    introVideoHls: 'https://stream.mux.com/Q36DQ9ig9XZd5ObGj7lxeBNmleDSEUC7cfFv01wmmp7c.m3u8',
    poster: '/images/us-stock/cover.webp',
    heroHeadline: '从负债 50 万到财务自由的投资框架',
    heroSub: '',
    hookCopy:
      '你现在的迷茫，怕买错、怕亏钱、光靠薪水看不到尽头，我全都经历过。这 9 章课，是我花十几年验证、真正能复制的方法。',
    qr: '/images/us-stock/qr-feature.webp',
    appUrl: 'https://cmoneymike.onelink.me/ZEaW/yub9ufpa',
  },
};
