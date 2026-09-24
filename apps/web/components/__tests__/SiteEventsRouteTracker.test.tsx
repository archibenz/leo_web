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

  it('includes the query string', () => {
    mockPathname = '/ru/product';
    mockSearch = new URLSearchParams('p=key5');
    render(<SiteEventsRouteTracker />);
    expect(trackSiteEvent).toHaveBeenCalledWith('page_view', expect.objectContaining({path: '/ru/product?p=key5'}));
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
