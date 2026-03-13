type GA4Item = { item_id: string; item_name: string; price: number; quantity: number }

type GA4EventMap = {
  // GA4 Recommended events
  sign_up: { method: string; webinar_id: string }
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
  c_lobby_entered: { webinar_id: string; webinar_state: string }
  c_lobby_abandon: { webinar_id: string; duration_sec: number; minutes_until_start: number }
  c_lobby_duration: { webinar_id: string; duration_sec: number; exit_type: 'enter_live' | 'abandon' }
  c_purchase_confirmation: { webinar_id: string; transaction_id: string; order_status: string }
}

type GA4EventName = keyof GA4EventMap

/** Default product price in USD. Used as begin_checkout value and purchase fallback. */
export const DEFAULT_PRODUCT_PRICE = 599

// Events that represent conversions — these get attribution params auto-attached
const CONVERSION_EVENTS: ReadonlySet<string> = new Set([
  'sign_up',
  'begin_checkout',
  'purchase',
  'c_enter_live',
  'c_webinar_complete',
  'c_end_page_cta_click',
])

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** Read attribution params from sessionStorage (fast) with cookie fallback (persistent). */
function getAttribution(): Record<string, string> {
  const attrs: Record<string, string> = {}

  // Current session attribution
  const keys = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content']
  for (const key of keys) {
    const value = sessionStorage.getItem(key) || getCookie(key)
    if (value) attrs[key] = value
  }

  // Original campaign attribution (from EDM links — survives cross-session)
  const origKeys = ['orig_source', 'orig_medium', 'orig_campaign', 'orig_content', 'orig_gclid']
  for (const key of origKeys) {
    const value = sessionStorage.getItem(key)
    if (value) attrs[`original_${key.replace('orig_', '')}`] = value
  }

  return attrs
}

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

    let enrichedParams: Record<string, unknown> = { ...params }

    // Auto-attach gclid/utm to conversion events
    if (CONVERSION_EVENTS.has(eventName)) {
      const attribution = getAttribution()
      enrichedParams = { ...enrichedParams, ...attribution }
    }

    window.dataLayer.push({ event: eventName, ...enrichedParams })
  } catch {
    // GTM not loaded — silently ignore
  }
}
