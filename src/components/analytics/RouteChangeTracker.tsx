'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Pushes a page_view event to GTM dataLayer on every SPA route change.
 * Skips the initial page load (GTM's built-in Page View trigger covers that).
 * Works with GTM's Custom Event trigger to give GA4 visibility into all pages.
 */
export function RouteChangeTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Skip initial mount — GTM fires page_view on first load via its own trigger
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')

    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'page_view',
      page_location: window.location.origin + url,
      page_path: pathname,
      page_title: document.title,
    })
  }, [pathname, searchParams])

  return null
}
