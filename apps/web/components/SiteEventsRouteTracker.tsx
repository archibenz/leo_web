'use client';

import {useEffect} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {trackSiteEvent} from '../lib/siteEvents';

// Unlike MetrikaRouteTracker, there is no separate init hit that already
// counted the landing page — page_view fires on every mount, first one
// included, or the entry page would be silently undercounted every time.
const MOBILE_BREAKPOINT = '(max-width: 767px)';

export default function SiteEventsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams?.toString();
    const locale = pathname?.split('/')[1];
    const device = typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches ? 'phone' : 'desktop';
    trackSiteEvent('page_view', {
      path: pathname + (qs ? `?${qs}` : ''),
      locale,
      device,
    });
  }, [pathname, searchParams]);

  return null;
}
