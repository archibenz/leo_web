'use client';

import {useEffect} from 'react';
import {usePathname, useSearchParams} from 'next/navigation';
import {trackSiteEvent} from '../lib/siteEvents';

// Unlike MetrikaRouteTracker, there is no separate init hit that already
// counted the landing page — page_view fires on every mount, first one
// included, or the entry page would be silently undercounted every time.
const MOBILE_BREAKPOINT = '(max-width: 767px)';

// Трекер смонтирован в общем [locale]/layout и потому стоит и под админкой.
// Её заходы — владелец и команда, не покупатели: до 24.09 они давали пятую
// часть «посещений». Накопленное отсекает SiteEventRepository.CUSTOMERS_ONLY.
const ADMIN_PATH = /^\/[^/]+\/admin(\/|$)/;

// Из строки запроса пишутся только метки utm_*: пока отдельного поля для
// источника перехода нет, это единственный его след. Всё остальное — мимо:
// ?cat=/?sort= размазывали топ страниц по вариантам одного адреса, ?q= нёс
// текст поиска, /auth/tg?token= — токен входа.
function utmOnly(params: URLSearchParams | null): string {
  if (!params) return '';
  const kept = new URLSearchParams();
  params.forEach((value, key) => {
    if (key.startsWith('utm_')) kept.append(key, value);
  });
  return kept.toString();
}

export default function SiteEventsRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && ADMIN_PATH.test(pathname)) return;
    const qs = utmOnly(searchParams ? new URLSearchParams(searchParams.toString()) : null);
    const locale = pathname?.split('/')[1];
    const device = typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT).matches ? 'phone' : 'desktop';
    trackSiteEvent('page_view', {
      path: pathname + (qs ? `?${qs}` : ''),
      locale,
      device,
    });
    // «Просмотр уже в очереди» — для e2e (14-site-events). Трекер стоит в
    // своей границе Suspense и гидрируется отдельно от остальной страницы;
    // никакой другой признак на странице не говорит, что его эффект прошёл,
    // и тесты скрывали вкладку раньше, чем было что отправлять.
    document.documentElement.dataset.siteEvents = 'ready';
  }, [pathname, searchParams]);

  return null;
}
