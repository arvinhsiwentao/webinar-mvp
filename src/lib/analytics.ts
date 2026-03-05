import { sendGAEvent } from '@next/third-parties/google'

type GA4EventMap = {
  sign_up: { method: string; webinar_id: string }
  join_group: { group_id: string }
  begin_checkout: { currency: string; value: number; items: Array<{ item_id: string; item_name: string; price: number; quantity: number }> }
  purchase: { transaction_id: string; value: number; currency: string; items: Array<{ item_id: string; item_name: string; price: number; quantity: number }> }
  c_cta_click: { webinar_id: string; cta_type: string; cta_url: string; video_time_sec?: number }
  c_webinar_complete: { webinar_id: string; watch_duration_sec?: number }
  c_chat_message: { webinar_id: string }
  c_video_progress: { webinar_id: string; percent: number }
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
