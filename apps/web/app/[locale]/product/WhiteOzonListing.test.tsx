import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import WhitePdpShowcase from './WhitePdpShowcase';
import WhiteProductCard from '../WhiteProductCard';
import {WHITE_PRODUCTS} from '../products';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../messages/en.json';

const PRODUCT = WHITE_PRODUCTS[0]!;
const OZON_HREF = `https://www.ozon.ru/product/${PRODUCT.slug}-1234567890/?utm_source=reinasleo.com&utm_medium=website&utm_campaign=product&utm_content=${PRODUCT.slug}`;

// Only a few pieces ship from our own warehouse, so the real list is short and
// mostly empty — stub it so the listed-on-Ozon branch is covered whatever the
// list happens to hold. Both the card and the PDP import the same module.
vi.mock('../../../lib/ozon', () => ({
  ozonProductUrl: () => OZON_HREF,
  hasOzonListing: () => true,
  buildOzonLink: () => OZON_HREF,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
}));

const lsStore = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  writable: true,
  value: {
    clear: () => lsStore.clear(),
    getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
    setItem: (k: string, v: string) => {
      lsStore.set(k, String(v));
    },
    removeItem: (k: string) => {
      lsStore.delete(k);
    },
    key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
    get length() {
      return lsStore.size;
    },
  },
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {value: globalThis.localStorage, configurable: true, writable: true});
}

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(globalThis, 'IntersectionObserver', {value: MockIntersectionObserver, configurable: true, writable: true});
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('a garment listed on Ozon', () => {
  it('offers the Ozon card in a new tab, alongside the Wildberries route', () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages as never}>
        <WhitePdpShowcase locale="en" product={PRODUCT} />
      </NextIntlClientProvider>,
    );

    const ozon = screen.getByRole('link', {name: /buy on ozon/i});
    expect(ozon).toHaveAttribute('href', OZON_HREF);
    expect(ozon).toHaveAttribute('target', '_blank');
    // Without noopener the opened tab keeps a handle on ours.
    expect(ozon.getAttribute('rel')).toContain('noopener');
    // The primary channel stays on the page — Ozon is an addition, not a swap.
    expect(screen.getByRole('link', {name: /buy on wildberries/i})).toBeInTheDocument();
  });

  it('names both channels rather than only Wildberries', () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages as never}>
        <WhitePdpShowcase locale="en" product={PRODUCT} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText(/only on marketplaces/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/only on wildberries/i)).not.toBeInTheDocument();
  });

  it('says the same on the catalogue card', () => {
    render(
      <NextIntlClientProvider locale="en" messages={{white: {card: enMessages.white.card}}}>
        <WhiteProductCard locale="en" product={PRODUCT} quickAdd />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText(/only on marketplaces/i)).toBeInTheDocument();
  });
});
