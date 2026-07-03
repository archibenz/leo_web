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
