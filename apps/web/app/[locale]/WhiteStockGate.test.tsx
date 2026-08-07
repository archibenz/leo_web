import {afterEach, describe, it, expect} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import WhiteProductCard from './WhiteProductCard';
import type {WhiteProduct} from './products';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../messages/en.json';

// The catalogue reports every piece as unavailable while there is no stock
// source, and the storefront must not offer a bag it cannot honour. This file
// deliberately does NOT mock whiteInStock — it asserts the real default.

const lsStore = new Map<string, string>();
const mockLocalStorage = {
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
};
Object.defineProperty(globalThis, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});
}

const PRODUCT: WhiteProduct = {
  key: 3,
  slug: 'tailored-trousers',
  nm: 962783109,
  en: 'Tailored Trousers',
  ru: 'Брюки прямого кроя',
  cat: 'tailoring',
  price: 14900,
  descEn: '',
  descRu: '',
  compositionEn: '',
  compositionRu: '',
  careEn: '',
  careRu: '',
  colors: [{key: 'black', hex: '#000', en: 'Black', ru: 'Чёрный'}],
  image: '/images/shop/editorial-clean.jpg',
};

function renderCard(ui: Parameters<typeof render>[0]) {
  return render(
    <NextIntlClientProvider locale="en" messages={{white: {card: enMessages.white.card}}}>
      {ui}
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('stock gate', () => {
  it('offers no way into the bag while stock is unknown', () => {
    renderCard(<WhiteProductCard locale="en" product={PRODUCT} quickAdd />);
    expect(screen.queryByRole('button', {name: /quick add/i})).not.toBeInTheDocument();
    expect(localStorage.getItem('wv-bag')).toBeNull();
  });

  it('says where the garment can be bought instead of going silent', () => {
    renderCard(<WhiteProductCard locale="en" product={PRODUCT} quickAdd />);
    expect(screen.getByText(/only on wildberries/i)).toBeInTheDocument();
  });

  it('still links through to the product page', () => {
    renderCard(<WhiteProductCard locale="en" product={PRODUCT} quickAdd />);
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
  });
});
