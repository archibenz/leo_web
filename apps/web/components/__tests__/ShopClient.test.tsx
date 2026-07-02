import {render, screen} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import ShopClient from '../ShopClient';

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/shop',
  useSearchParams: () => new URLSearchParams(),
}));

// Namespace-aware so the test catches the real bug class: the demo badge
// lives under the `product` namespace, not `shop` (which owns the `t` prop
// already used for occasions/filters) — a naive `t('product.demoBadge')`
// call would silently resolve to the wrong key under a scoped translator.
vi.mock('next-intl', () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

const testProduct = {
  id: 'p1',
  title: 'Test Dress',
  subtitle: null,
  occasion: null,
  category: null,
  color: null,
  sizes: null,
  price: 1000,
  material: null,
  image: null,
  images: null,
  isTest: true,
  inStock: true,
  collectionName: null,
};

describe('ShopClient demo badge', () => {
  it('renders the product.demoBadge translation, not a hardcoded "Demo"', () => {
    render(<ShopClient initialProducts={[testProduct]} />);

    expect(screen.queryByText('Demo')).not.toBeInTheDocument();
    expect(screen.getByText('product.demoBadge')).toBeInTheDocument();
  });
});
