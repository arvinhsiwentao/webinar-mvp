'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

const COOKIE_MAX_AGE = 90 * 24 * 60 * 60 // 90 days in seconds

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`
}

// Preserves gclid and UTM parameters in both cookie (90-day, survives
// browser close) and sessionStorage (fast reads within the session).
// Google Ads attribution window is 30-90 days, so sessionStorage alone
// is insufficient — it dies when the browser closes.
export function GclidPreserver() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const gclid = searchParams.get('gclid')
    const utmSource = searchParams.get('utm_source')

    if (gclid) {
      sessionStorage.setItem('gclid', gclid)
      setCookie('gclid', gclid)
    }
    if (utmSource) {
      const utmMedium = searchParams.get('utm_medium') || ''
      const utmCampaign = searchParams.get('utm_campaign') || ''
      const utmContent = searchParams.get('utm_content') || ''

      sessionStorage.setItem('utm_source', utmSource)
      sessionStorage.setItem('utm_medium', utmMedium)
      sessionStorage.setItem('utm_campaign', utmCampaign)
      sessionStorage.setItem('utm_content', utmContent)

      setCookie('utm_source', utmSource)
      setCookie('utm_medium', utmMedium)
      setCookie('utm_campaign', utmCampaign)
      setCookie('utm_content', utmContent)
    }
  }, [searchParams])

  return null
}
