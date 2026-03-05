import { trackGA4 } from './analytics'

// Map internal event names to GA4 events
const GA4_EVENT_MAP: Record<string, (props: Record<string, unknown>) => void> = {
  webinar_join: (p) => trackGA4('join_group', { group_id: String(p.webinarId || '') }),
  cta_click: (p) => trackGA4('c_cta_click', {
    webinar_id: String(p.webinarId || ''),
    cta_type: String(p.buttonText || ''),
    cta_url: String(p.url || ''),
    video_time_sec: typeof p.videoTime === 'number' ? p.videoTime : undefined,
  }),
  video_progress: (p) => trackGA4('c_video_progress', {
    webinar_id: String(p.webinarId || ''),
    percent: typeof p.percent === 'number' ? p.percent : 0,
  }),
  chat_message: (p) => trackGA4('c_chat_message', {
    webinar_id: String(p.webinarId || ''),
  }),
}

export function track(event: string, properties?: Record<string, unknown>) {
  const payload = {
    event,
    properties,
    timestamp: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    console.log('[Track]', event, properties)

    // Fire to server-side tracking
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {})

    // Fire to GA4 if mapping exists
    const ga4Handler = GA4_EVENT_MAP[event]
    if (ga4Handler) {
      ga4Handler(properties || {})
    }
  }
}
