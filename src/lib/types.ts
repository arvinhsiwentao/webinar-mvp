// Webinar System Types

export interface CTAEvent {
  id: string;
  showAtSec: number;
  hideAtSec: number;
  buttonText: string;
  url: string;
  promoText?: string;
  showCountdown: boolean;
  position?: 'on_video' | 'below_video';
  color?: string;
  secondaryText?: string;
  icon?: string;
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

export interface Session {
  id: string;
  startTime: string; // ISO datetime
  status: 'scheduled' | 'live' | 'ended';
}

export interface EvergreenConfig {
  enabled: boolean;
  dailySchedule: Array<{ time: string }>;  // HH:mm 24hr format, e.g. ["08:00", "21:00"]
  immediateSlot: {
    enabled: boolean;
    intervalMinutes: number;      // 15 → snaps to :00/:15/:30/:45
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
  subtitle?: string;
  speakerName: string;
  speakerTitle?: string;
  speakerBio?: string;
  speakerImage?: string;
  speakerAvatar?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number; // minutes
  highlights: string[];
  sessions: Session[];
  autoChat: AutoChatMessage[];
  ctaEvents: CTAEvent[];
  subtitleCues?: WebinarSubtitleCue[];
  subtitleLanguage?: string;
  subtitleLastGeneratedAt?: string;
  status: 'draft' | 'published' | 'ended';
  viewerBaseCount: number;
  viewerMultiplier: number;
  webhookUrl?: string;

  // Landing page hero
  heroImageUrl?: string;
  heroEyebrowText?: string;

  // Promotional image (confirm/waiting/info tab)
  promoImageUrl?: string;

  // Disclaimer
  disclaimerText?: string;

  // End page
  endPageSalesCopy?: string;
  endPageCtaText?: string;
  endPageCtaUrl?: string;
  endPageCtaColor?: string;

  // Sidebar content
  sidebarDescription?: string;

  // Missed webinar redirect
  missedWebinarUrl?: string;

  // Evergreen countdown config
  evergreen?: EvergreenConfig;

  // Preroll video
  prerollVideoUrl?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  webinarId: string;
  sessionId: string;
  // Evergreen: computed slot time (replaces static sessionId when evergreen enabled)
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
  sessionId: string;
  name: string;
  message: string;
  timestamp: number;
  createdAt: string;
}

// API Request/Response types
export interface CreateWebinarRequest {
  title: string;
  subtitle?: string;
  speakerName: string;
  speakerTitle?: string;
  speakerBio?: string;
  speakerImage?: string;
  speakerAvatar?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  highlights?: string[];
  sessions?: Omit<Session, 'id' | 'status'>[];
  autoChat?: Omit<AutoChatMessage, 'id'>[];
  ctaEvents?: Omit<CTAEvent, 'id'>[];
  subtitleCues?: WebinarSubtitleCue[];
  subtitleLanguage?: string;
  viewerBaseCount?: number;
  viewerMultiplier?: number;
  webhookUrl?: string;
  status?: 'draft' | 'published' | 'ended';
  heroImageUrl?: string;
  heroEyebrowText?: string;
  promoImageUrl?: string;
  disclaimerText?: string;
  endPageSalesCopy?: string;
  endPageCtaText?: string;
  endPageCtaUrl?: string;
  endPageCtaColor?: string;
  sidebarDescription?: string;
  missedWebinarUrl?: string;
  evergreen?: EvergreenConfig;
  prerollVideoUrl?: string;
}

export interface RegisterRequest {
  webinarId: string;
  sessionId?: string;
  assignedSlot?: string;
  name: string;
  email: string;
  phone?: string;
}
