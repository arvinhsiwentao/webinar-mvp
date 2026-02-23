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

export interface Session {
  id: string;
  startTime: string; // ISO datetime
  status: 'scheduled' | 'live' | 'ended';
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

  // Preroll video
  prerollVideoUrl?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  webinarId: string;
  sessionId: string;
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
  viewerBaseCount?: number;
  viewerMultiplier?: number;
  webhookUrl?: string;
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
  prerollVideoUrl?: string;
}

export interface RegisterRequest {
  webinarId: string;
  sessionId: string;
  name: string;
  email: string;
  phone?: string;
}
