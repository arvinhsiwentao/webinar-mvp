// Webinar System Types

export interface CTAEvent {
  id: string;
  showAtSec: number;
  hideAtSec: number;
  buttonText: string;
  promoText?: string;
  showCountdown: boolean;
  position?: 'on_video' | 'below_video';
  color?: string;
  secondaryText?: string;
}

export interface AutoChatMessage {
  id: string;
  timeSec: number;
  name: string;
  message: string;
}

export interface WebinarSubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
  lines: string[];
  cps?: number;
  cpl?: number;
}

export interface EvergreenConfig {
  enabled: boolean;
  dailySchedule: Array<{ time: string }>;  // HH:mm 24hr format, e.g. ["08:00", "21:00"]
  immediateSlot: {
    enabled: boolean;
    intervalMinutes: number;      // 5 → snaps to :00/:05/:10/…; also supports 15/30/60
    bufferMinutes: number;        // 3 → min gap before slot
    maxWaitMinutes: number;       // 30 → only inject if next anchor > 30 min
  };
  videoDurationMinutes: number;
  timezone: string;               // IANA, e.g. "America/Chicago"
  displaySlotCount: number;       // e.g. 4
}

export interface EvergreenSlot {
  slotTime: string;   // ISO datetime
  type: 'anchor' | 'immediate';
}

export interface Webinar {
  id: string;
  title: string;
  speakerName: string;
  speakerTitle?: string;
  speakerImage?: string;
  speakerAvatar?: string;
  videoUrl: string;
  duration: number; // minutes
  highlights: string[];
  autoChat: AutoChatMessage[];
  ctaEvents: CTAEvent[];
  subtitleCues?: WebinarSubtitleCue[];
  subtitleLanguage?: string;
  subtitleLastGeneratedAt?: string;
  status: 'draft' | 'published' | 'ended';
  viewerPeakTarget?: number;    // Peak viewer count target (replaces base+multiplier formula)
  viewerRampMinutes?: number;   // Minutes to reach peak from video start
  webhookUrl?: string;

  // Landing page hero
  heroImageUrl?: string;

  // Promotional image (confirm/waiting/info tab)
  promoImageUrl?: string;

  // Disclaimer
  disclaimerText?: string;

  // End page
  endPageSalesCopy?: string;
  endPageCtaText?: string;

  // Sidebar content
  sidebarDescription?: string;

  // Evergreen countdown config
  evergreen?: EvergreenConfig;

  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  webinarId: string;
  assignedSlot?: string;       // ISO datetime
  slotExpiresAt?: string;      // assignedSlot + videoDuration
  reassignedFrom?: string;     // previous slot if missed
  name: string;
  email: string;
  phone?: string;
  registeredAt: string;
}

export interface ChatMessageData {
  id: string;
  webinarId: string;
  name: string;
  message: string;
  timestamp: number;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'refunded' | 'expired';

export interface Order {
  id: string;
  webinarId: string;
  email: string;
  name: string;
  stripeSessionId: string;
  stripePaymentIntentId?: string;
  activationCode?: string;
  status: OrderStatus;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  createdAt: string;
  paidAt?: string;
  fulfilledAt?: string;
}

export interface VideoFile {
  id: string;
  filename: string;           // original upload filename
  storagePath?: string;       // legacy R2 path (not used for new uploads)
  publicUrl?: string;         // legacy R2 URL (not used for new uploads)
  fileSize: number;           // bytes
  durationSec?: number;       // seconds (set from Mux after transcoding)
  status: 'uploading' | 'processing' | 'ready' | 'error';
  uploadedAt: string;         // ISO date
  muxUploadId?: string;       // Mux Direct Upload ID (for tracking upload)
  muxAssetId?: string;        // Mux asset ID (for management/deletion)
  muxPlaybackId?: string;     // Mux playback ID (used to construct HLS URL)
  muxPlaybackUrl?: string;    // full HLS URL: https://stream.mux.com/{id}.m3u8
}

// API Request/Response types
export interface CreateWebinarRequest {
  title: string;
  speakerName: string;
  speakerTitle?: string;
  speakerImage?: string;
  speakerAvatar?: string;
  videoUrl: string;
  duration: number;
  highlights?: string[];
  autoChat?: Omit<AutoChatMessage, 'id'>[];
  ctaEvents?: Omit<CTAEvent, 'id'>[];
  subtitleCues?: WebinarSubtitleCue[];
  subtitleLanguage?: string;
  viewerPeakTarget?: number;
  viewerRampMinutes?: number;
  webhookUrl?: string;
  status?: 'draft' | 'published' | 'ended';
  heroImageUrl?: string;
  promoImageUrl?: string;
  disclaimerText?: string;
  endPageSalesCopy?: string;
  endPageCtaText?: string;
  sidebarDescription?: string;
  evergreen?: EvergreenConfig;
}

export interface RegisterRequest {
  webinarId: string;
  assignedSlot?: string;
  name: string;
  email: string;
  phone?: string;
}
