type GA4Item = { item_id: string; item_name: string; price: number; quantity: number }

type GA4EventMap = {
  // GA4 Recommended events
  sign_up: { method: string; webinar_id: string }
  join_group: { group_id: string; webinar_id?: string }
  begin_checkout: { currency: string; value: number; items: GA4Item[]; cta_id?: string; video_time_sec?: number; source?: string }
  purchase: { transaction_id: string; value: number; currency: string; items: GA4Item[] }

  // Custom events (c_ prefix)
  c_scroll_depth: { percent: number; page: string }
  c_signup_button_click: { button_position: string; webinar_id: string }
  c_add_to_calendar: { method: string; webinar_id: string }
  c_enter_live: { webinar_id: string; entry_method: 'button' | 'countdown_auto' | 'redirect_live' }
  c_video_heartbeat: { webinar_id: string; current_time_sec: number; watch_duration_sec: number }
  c_video_progress: { webinar_id: string; percent: number }
  c_chat_message: { webinar_id: string; video_time_sec: number }
  c_cta_view: { webinar_id: string; cta_id: string; cta_type: string; video_time_sec: number }
  c_cta_dismiss: { webinar_id: string; cta_id: string; cta_type: string; video_time_sec: number }
  c_webinar_complete: { webinar_id: string; watch_duration_sec?: number }
  c_end_page_cta_click: { webinar_id: string; button_text: string }
  c_share_click: { webinar_id: string; platform: 'facebook' | 'twitter' }
}

type GA4EventName = keyof GA4EventMap

export function trackGA4<T extends GA4EventName>(
  eventName: T,
  params: GA4EventMap[T]
) {
  if (typeof window === 'undefined') return
  if (process.env.NODE_ENV !== 'production') {
    console.log('[GA4]', eventName, params)
  }
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: eventName, ...params })
  } catch {
    // GTM not loaded — silently ignore
  }
}
