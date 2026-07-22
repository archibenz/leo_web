import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteSetsShowcase from './WhiteSetsShowcase';
import {WHITE_SETS} from '../products';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../messages/en.json';

// The footer's locale switch reads the router — give jsdom a stub.
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/sets',
  useSearchParams: () => new URLSearchParams(),
}));

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

const readBag = () => JSON.parse(localStorage.getItem('wv-bag') ?? '[]') as {key: number; size: string}[];

describe('WhiteSetsShowcase', () => {
  it('renders every set with its pieces', async () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages as never}>
        <WhiteSetsShowcase locale="en" />
      </NextIntlClientProvider>,
    );
    expect(await screen.findByRole('heading', {level: 1, name: /ready looks/i})).toBeInTheDocument();
    for (const set of WHITE_SETS) {
      expect(screen.getByRole('heading', {level: 2, name: set.en})).toBeInTheDocument();
    }
  });

  it('adds the whole look to the bag in size M', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="en" messages={enMessages as never}>
        <WhiteSetsShowcase locale="en" />
      </NextIntlClientProvider>,
    );
    const buttons = await screen.findAllByRole('button', {name: /add the whole look/i});
    await user.click(buttons[0]!);
    const bag = readBag();
    expect(bag.map((i) => i.key).sort((a, b) => a - b)).toEqual([...WHITE_SETS[0]!.productKeys].sort((a, b) => a - b));
    expect(bag.every((i) => i.size === 'M')).toBe(true);
  });
});
