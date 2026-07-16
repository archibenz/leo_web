import {render} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';

let mockPathname = '/ru/white';
let mockSearch = new URLSearchParams();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearch,
}));

import MetrikaRouteTracker from '../MetrikaRouteTracker';

type Win = {ym?: ReturnType<typeof vi.fn>};

describe('MetrikaRouteTracker', () => {
  beforeEach(() => {
    mockPathname = '/ru/white';
    mockSearch = new URLSearchParams();
    (window as unknown as Win).ym = vi.fn();
  });

  it('does not fire a hit on the initial mount (init already counts it)', () => {
    render(<MetrikaRouteTracker ymId="109810843" />);
    expect((window as unknown as Win).ym).not.toHaveBeenCalled();
  });

  it('fires ym hit with the new url on client navigation', () => {
    const {rerender} = render(<MetrikaRouteTracker ymId="109810843" />);
    mockPathname = '/ru/white/shop';
    rerender(<MetrikaRouteTracker ymId="109810843" />);
    expect((window as unknown as Win).ym).toHaveBeenCalledWith(109810843, 'hit', '/ru/white/shop');
  });

  it('includes the query string (White PDP ?p=...)', () => {
    const {rerender} = render(<MetrikaRouteTracker ymId="109810843" />);
    mockPathname = '/ru/white/product';
    mockSearch = new URLSearchParams('p=key5');
    rerender(<MetrikaRouteTracker ymId="109810843" />);
    expect((window as unknown as Win).ym).toHaveBeenCalledWith(109810843, 'hit', '/ru/white/product?p=key5');
  });

  it('is a no-op when ym is not on window yet', () => {
    (window as unknown as Win).ym = undefined;
    const {rerender} = render(<MetrikaRouteTracker ymId="109810843" />);
    mockPathname = '/ru/white/bag';
    expect(() => rerender(<MetrikaRouteTracker ymId="109810843" />)).not.toThrow();
  });
});
