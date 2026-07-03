import {render, screen} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import MobileShopCard from './MobileShopCard';
import type {MobileShopItem} from './types';

// MobileShopCard used to render the primary 2-col mobile shop grid thumbnail
// as a raw <img>, justified by a claim that catalog images come from hosts
// next/image remotePatterns can't cover. That's the same `img`/`images`
// catalog data ShopClient.tsx and PhotoCarousel.tsx already pass through
// next/image successfully (see lw-k6r2) — this covers the resulting
// next/image contract.

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mk = (overrides: Partial<MobileShopItem> = {}): MobileShopItem => ({
  id: 'p1',
  title: 'Silk Slip Dress',
  subtitle: null,
  occasion: null,
  category: null,
  color: null,
  sizes: null,
  price: 12000,
  material: null,
  image: null,
  images: null,
  isTest: false,
  inStock: true,
  collectionName: null,
  badge: null,
  ...overrides,
});

describe('MobileShopCard', () => {
  it('renders the thumbnail through next/image with the resolved src', () => {
    render(<MobileShopCard p={mk()} locale="en" img="https://reinasleo.com/uploads/p1.jpg" />);

    const image = screen.getByAltText('Silk Slip Dress');
    expect(image.tagName).toBe('IMG');
    // next/image rewrites `src` through its loader — assert the original
    // catalog URL is embedded rather than requiring an exact match.
    expect(image.getAttribute('src')).toContain(encodeURIComponent('https://reinasleo.com/uploads/p1.jpg'));
  });

  it('renders no image element when the product has no resolved image', () => {
    render(<MobileShopCard p={mk()} locale="en" img={null} />);

    expect(screen.queryByAltText('Silk Slip Dress')).not.toBeInTheDocument();
  });

  it('links the card to the product PDP', () => {
    render(<MobileShopCard p={mk({id: 'p42'})} locale="en" img={null} />);

    expect(screen.getByRole('link')).toHaveAttribute('href', '/en/product/p42');
  });

  // lw-ongo: above-the-fold cards carry the mobile-shop LCP element, so the
  // grid marks the first four `priority`. next/image turns that into
  // loading="eager" (and emits a preload) instead of lazy-deferring.
  it('eager-loads the thumbnail when priority is set (above-the-fold LCP)', () => {
    render(<MobileShopCard p={mk()} locale="en" img="https://reinasleo.com/uploads/p1.jpg" priority />);

    expect(screen.getByAltText('Silk Slip Dress')).toHaveAttribute('loading', 'eager');
  });

  it('lazy-loads the thumbnail by default (below-the-fold cards)', () => {
    render(<MobileShopCard p={mk()} locale="en" img="https://reinasleo.com/uploads/p1.jpg" />);

    expect(screen.getByAltText('Silk Slip Dress')).toHaveAttribute('loading', 'lazy');
  });
});
