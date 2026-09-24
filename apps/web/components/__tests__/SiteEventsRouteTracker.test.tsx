import {render} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';

let mockPathname = '/ru';
let mockSearch = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearch,
}));

const trackSiteEvent = vi.fn();
vi.mock('../../lib/siteEvents', () => ({trackSiteEvent: (...args: unknown[]) => trackSiteEvent(...args)}));

import SiteEventsRouteTracker from '../SiteEventsRouteTracker';

// jsdom does not implement matchMedia — same stub as WhitePdpShowcase.test.tsx.
function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({matches, media: query, addEventListener: () => {}, removeEventListener: () => {}}),
  });
}

describe('SiteEventsRouteTracker', () => {
  beforeEach(() => {
    mockPathname = '/ru';
    mockSearch = new URLSearchParams();
    trackSiteEvent.mockClear();
    stubMatchMedia(false);
  });

  it('tracks page_view on the initial mount too — unlike Metrika, there is no separate init hit to double-count against', () => {
    render(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({path: '/ru'}));
  });

  it('tracks again on client navigation, with the new path', () => {
    const {rerender} = render(<SiteEventsRouteTracker />);
    trackSiteEvent.mockClear();
    mockPathname = '/ru/shop';
    rerender(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({path: '/ru/shop'}));
  });

  // Строка запроса в path размазывала топ страниц по вариантам одного адреса
  // и уносила в таблицу то, чему там не место: токен входа из /auth/tg?token=,
  // текст поиска из ?q=. Остаются только метки utm_* — пока это единственный
  // след того, откуда пришёл посетитель.
  it('drops the query string', () => {
    mockPathname = '/ru/shop';
    mockSearch = new URLSearchParams('cat=dresses&sort=price');
    render(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({path: '/ru/shop'}));
  });

  it.each([
    ['/ru/auth/tg', 'token=abcdef0123456789abcdef0123456789'],
    ['/ru/shop', 'q=платье для Анны'],
  ])('never records what the visitor or the login link carried (%s?%s)', (path, qs) => {
    mockPathname = path;
    mockSearch = new URLSearchParams(qs);
    render(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({path}));
  });

  it('keeps utm_* labels and only them', () => {
    mockPathname = '/ru';
    mockSearch = new URLSearchParams('utm_source=tg&q=secret&utm_campaign=autumn');
    render(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith(
      'page_view',
      expect.objectContaining({path: '/ru?utm_source=tg&utm_campaign=autumn'}),
    );
  });

  it('derives locale from the first path segment', () => {
    mockPathname = '/en/shop';
    render(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({locale: 'en'}));
  });

  it('tags device as phone under the mobile breakpoint, desktop otherwise', () => {
    stubMatchMedia(true);
    render(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({device: 'phone'}));
  });

  // Админка — не посещение покупателя. До 24.09 она писала page_view наравне
  // с витриной и дала пятую часть всех просмотров на карточке «Посещения».
  it.each(['/ru/admin', '/en/admin', '/ru/admin/products', '/ru/admin/products/123/edit'])(
    'does not track admin pages (%s)',
    (path) => {
      mockPathname = path;
      render(<SiteEventsRouteTracker />);
      expect(trackSiteEvent).not.toHaveBeenCalled();
    },
  );

  it('still tracks storefront paths that merely start with the same letters', () => {
    mockPathname = '/ru/administrator-coat';
    render(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({path: '/ru/administrator-coat'}));
  });
});
