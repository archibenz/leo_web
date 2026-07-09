import type {ReactNode} from 'react';
import {render, screen} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import MobileShopGrid from './MobileShopGrid';
import type {MobileShopItem} from './types';

// lw-ongo: on /shop mobile the 2-col grid's first row is above the fold and
// holds the LCP element. Desktop already eager-loads the first four cards
// (ShopClient `eager = idx <= 3`); the mobile grid must thread the same signal
// into MobileShopCard so next/image emits loading="eager" for the first four
// and lazy-defers the rest.

vi.mock('next-intl', () => ({
  // MobileShopGrid calls both `menu(key)` and `menu.has(key)`.
  useTranslations: () => Object.assign((key: string) => key, {has: () => false}),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({href, children}: {href: string; children: ReactNode}) => <a href={href}>{children}</a>,
}));

const mk = (id: string, overrides: Partial<MobileShopItem> = {}): MobileShopItem => ({
  id,
  title: `Dress ${id}`,
  subtitle: null,
  occasion: null,
  category: null,
  color: null,
  sizes: null,
  price: 12000,
  material: null,
  image: `/uploads/${id}.jpg`,
  images: null,
  isTest: false,
  inStock: true,
  collectionName: null,
  badge: null,
  ...overrides,
});

describe('MobileShopGrid image priority threading', () => {
  it('eager-loads the first four cards and lazy-loads the rest', () => {
    const products = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => mk(id));

    render(<MobileShopGrid products={products} locale="en" />);

    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(6);

    // First row(s) above the fold — eager (idx 0-3).
    for (const idx of [0, 1, 2, 3]) {
      expect(imgs[idx]).toHaveAttribute('loading', 'eager');
    }
    // Everything past the first four stays lazy.
    for (const idx of [4, 5]) {
      expect(imgs[idx]).toHaveAttribute('loading', 'lazy');
    }
  });
});

// lw-nllx: firstImage() JSON.parses each product's `images` blob. It used to run
// inside the render map, re-parsing the whole catalog on every grid re-render
// (edge-scroll setEdge, filter/sort taps). It is now a products-keyed useMemo.
describe('MobileShopGrid image resolution + memoization', () => {
  const withImages = (id: string, src: string): MobileShopItem =>
    mk(id, {image: null, images: `[{"src":"${src}"}]`});

  it('resolves each card image from its images JSON blob', () => {
    const products = [
      withImages('a', 'https://reinasleo.com/uploads/a.jpg'),
      withImages('b', 'https://reinasleo.com/uploads/b.jpg'),
    ];

    render(<MobileShopGrid products={products} locale="en" />);

    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0].getAttribute('src')).toContain(encodeURIComponent('https://reinasleo.com/uploads/a.jpg'));
    expect(imgs[1].getAttribute('src')).toContain(encodeURIComponent('https://reinasleo.com/uploads/b.jpg'));
  });

  it('parses each product images blob once, not on every re-render', () => {
    const products = [
      withImages('a', 'https://reinasleo.com/uploads/a.jpg'),
      withImages('b', 'https://reinasleo.com/uploads/b.jpg'),
    ];
    const blobs = products.map((p) => p.images);
    const parseSpy = vi.spyOn(JSON, 'parse');
    const catalogParses = () =>
      parseSpy.mock.calls.filter((call) => blobs.includes(call[0] as string)).length;

    const {rerender} = render(<MobileShopGrid products={products} locale="en" />);
    // One parse per product — from the products-keyed memo, not the render map.
    expect(catalogParses()).toBe(products.length);

    // Re-renders with the same catalog must reuse the memo, never re-parse.
    rerender(<MobileShopGrid products={products} locale="en" />);
    rerender(<MobileShopGrid products={products} locale="en" />);
    expect(catalogParses()).toBe(products.length);

    parseSpy.mockRestore();
  });
});

// Product image srcs come from admin-editable data. next/image throws
// synchronously at render for a host outside next.config remotePatterns, which
// would crash the whole grid. firstImage() now drops off-list hosts so the card
// falls back to its placeholder block instead.
describe('MobileShopGrid untrusted image host guard', () => {
  const withImages = (id: string, src: string): MobileShopItem =>
    mk(id, {image: null, images: `[{"src":"${src}"}]`});

  it('renders no <img> (and does not throw) when the only image host is off-list', () => {
    const products = [withImages('a', 'https://evil.example/x.jpg')];

    expect(() => render(<MobileShopGrid products={products} locale="en" />)).not.toThrow();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('skips an off-list host and renders the first allow-listed image', () => {
    const products = [
      mk('a', {
        image: null,
        images:
          '[{"src":"https://evil.example/bad.jpg"},{"src":"https://reinasleo.com/uploads/good.jpg"}]',
      }),
    ];

    render(<MobileShopGrid products={products} locale="en" />);

    const imgs = screen.getAllByRole('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('src')).toContain(encodeURIComponent('https://reinasleo.com/uploads/good.jpg'));
  });
});
