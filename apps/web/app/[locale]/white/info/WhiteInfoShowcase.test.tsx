import {afterEach, describe, it, expect} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import WhiteInfoShowcase from './WhiteInfoShowcase';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../../messages/en.json';

// jsdom has no localStorage; the White bag/favourites hooks read it on mount.
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

function renderInfo(ns: 'delivery' | 'faq' | 'care') {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      <WhiteInfoShowcase locale="en" ns={ns} />
    </NextIntlClientProvider>,
  );
}

describe('WhiteInfoShowcase', () => {
  it('renders the delivery page title and all its sections', async () => {
    renderInfo('delivery');
    expect(await screen.findByRole('heading', {level: 1, name: /delivery & returns/i})).toBeInTheDocument();
    expect(screen.getByText('Timing')).toBeInTheDocument();
    expect(screen.getByText('Returns')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', {level: 2}).length).toBeGreaterThanOrEqual(4);
  });

  it('renders the care page from its own namespace', async () => {
    renderInfo('care');
    expect(await screen.findByRole('heading', {level: 1, name: /garment care/i})).toBeInTheDocument();
    expect(screen.getByText('Linen')).toBeInTheDocument();
  });
});
