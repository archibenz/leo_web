'use client';

import {useEffect, useRef} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';

// The White site navigates client-side (drawer menu, PDP via ?p, category
// switches), and Yandex.Metrika's init snippet only counts the first pageview
// per full load. Without this, in-app navigations are never counted. Fire a
// manual `ym('hit')` on every pathname / query change — skipping the first
// mount so the landing page isn't double-counted against init.
export default function MetrikaRouteTracker({ymId}: {ymId: string}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const ym = (window as unknown as {ym?: (id: number, action: string, url: string) => void}).ym;
    if (typeof ym !== 'function') return;
    const qs = searchParams?.toString();
    ym(Number(ymId), 'hit', pathname + (qs ? `?${qs}` : ''));
  }, [pathname, searchParams, ymId]);

  return null;
}
