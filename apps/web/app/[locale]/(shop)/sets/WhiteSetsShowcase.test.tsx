import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteSetsShowcase from './WhiteSetsShowcase';
import {STOREFRONT_FIXTURE} from '../../../../lib/catalogue/fixture';
import {findProductByKey, setColour} from '../../../../lib/catalogue/select';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../../messages/en.json';

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

const readBag = () => JSON.parse(localStorage.getItem('wv-bag') ?? '[]') as {key: number; size: string; colorEn: string; productId?: string; slug?: string}[];

const SF = STOREFRONT_FIXTURE;

// The catalogue arrives as props from the server page.
function renderSets(locale = 'en') {
  return render(
    <NextIntlClientProvider locale={locale} messages={enMessages as never}>
      <WhiteSetsShowcase locale={locale} sets={SF.sets} products={SF.products} />
    </NextIntlClientProvider>,
  );
}

describe('WhiteSetsShowcase', () => {
  it('renders every set with its pieces', async () => {
    renderSets();
    expect(await screen.findByRole('heading', {level: 1, name: /ready looks/i})).toBeInTheDocument();
    for (const set of SF.sets) {
      expect(screen.getByRole('heading', {level: 2, name: set.en})).toBeInTheDocument();
    }
  });

  it('adds the whole look to the bag in size M', async () => {
    const user = userEvent.setup();
    renderSets();
    const buttons = await screen.findAllByRole('button', {name: /add the whole look/i});
    await user.click(buttons[0]!);
    const bag = readBag();
    expect(bag.map((i) => i.key).sort((a, b) => a - b)).toEqual(SF.sets[0]!.items.map((it) => it.productKey).sort((a, b) => a - b));
    expect(bag.every((i) => i.size === 'M')).toBe(true);
  });

  it('takes the colour worn in the picture, not the garment default', async () => {
    const user = userEvent.setup();
    renderSets('ru');
    const buttons = await screen.findAllByRole('button', {name: /add the whole look/i});
    await user.click(buttons[0]!);

    const skirt = findProductByKey(SF.products, 8)!;
    // Ivory is the skirt's SECOND colourway — a line naming the first would mean
    // the bag took the garment's default and not the one in the photograph.
    const worn = setColour(SF.sets[0]!, skirt);
    expect(worn.key).toBe('ivory');
    const line = readBag().find((i) => i.key === 8)!;
    expect(line.colorEn).toBe(worn.en);
    expect(line.productId).toBe(worn.id);
    expect(line.slug).toBe(skirt.slug);
  });
});
