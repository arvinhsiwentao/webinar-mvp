'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

// Preserves gclid and UTM parameters in sessionStorage
// so Google Ads attribution survives client-side navigation.
// Without this, SPAs strip query params on route change and
// Google Ads can't attribute the conversion.
export function GclidPreserver() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const gclid = searchParams.get('gclid')
    const utmSource = searchParams.get('utm_source')

    if (gclid) {
      sessionStorage.setItem('gclid', gclid)
    }
    if (utmSource) {
      sessionStorage.setItem('utm_source', utmSource)
      sessionStorage.setItem('utm_medium', searchParams.get('utm_medium') || '')
      sessionStorage.setItem('utm_campaign', searchParams.get('utm_campaign') || '')
      sessionStorage.setItem('utm_content', searchParams.get('utm_content') || '')
    }
  }, [searchParams])

  return null
}
