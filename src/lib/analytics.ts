import { sendGAEvent } from '@next/third-parties/google'

type GA4Item = { item_id: string; item_name: string; price: number; quantity: number }

type GA4EventMap = {
  // Recommended GA4 events
  sign_up: { method: string; webinar_id: string }
  join_group: { group_id: string; webinar_id?: string }
  begin_checkout: { currency: string; value: number; items: GA4Item[] }
  purchase: { transaction_id: string; value: number; currency: string; items: GA4Item[] }

  // Custom events (c_ prefix)
  c_cta_click: { webinar_id: string; cta_type: string; cta_url: string; cta_id?: string; video_time_sec?: number }
  c_cta_view: { webinar_id: string; cta_type: string; cta_id?: string }
  c_webinar_complete: { webinar_id: string; watch_duration_sec?: number }
  c_chat_message: { webinar_id: string }
  c_video_progress: { webinar_id: string; percent: number }
  c_signup_button_click: { button_position: string; webinar_id: string }
  c_add_to_calendar: { method: string; webinar_id: string }
  c_end_page_cta_click: { webinar_id: string; button_text: string }
  c_scroll_depth: { percent: number; page: string }
}

type GA4EventName = keyof GA4EventMap

export function trackGA4<T extends GA4EventName>(
  eventName: T,
  params: GA4EventMap[T]
) {
  if (typeof window === 'undefined') return
  try {
    sendGAEvent('event', eventName, params)
  } catch {
    // GA4 not loaded (no measurement ID) — silently ignore
  }
}
