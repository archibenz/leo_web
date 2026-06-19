import {afterEach, describe, it, expect} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteProductCard from './WhiteProductCard';
import {removeWhiteFavourite} from '../../../hooks/useWhiteFavourites';
import type {WhiteProduct} from './products';

// jsdom here doesn't provide localStorage — install the same in-memory mock the
// useWhiteBag store test uses, so the Quick Add → bag write path is exercised.
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
};

const t = (en: string) => en;
const readBag = () => {
  try {
    return JSON.parse(localStorage.getItem('wv-bag') ?? '[]') as Array<{key: number; size: string; qty: number; id: string}>;
  } catch {
    return [];
  }
};
const readFavs = (): number[] => {
  try {
    return JSON.parse(localStorage.getItem('wv-favourites') ?? '[]') as number[];
  } catch {
    return [];
  }
};

afterEach(() => {
  // Drain the favourites module store too (localStorage.clear() empties storage
  // but not the in-memory store), so the heart starts unset in the next test.
  readFavs().forEach((k) => removeWhiteFavourite(k));
  cleanup();
  localStorage.clear();
});

describe('WhiteProductCard Quick Add', () => {
  it('does not expose any add control until a size is chosen (no null-size add)', () => {
    render(<WhiteProductCard locale="en" product={PRODUCT} t={t} quickAdd />);
    // The card links to the PDP and shows a Quick Add trigger — but nothing is
    // in the bag and there is no size-less "add" affordance.
    expect(screen.getByRole('button', {name: /quick add/i})).toBeInTheDocument();
    expect(readBag()).toHaveLength(0);
  });

  it('opens a size panel and adds the chosen size to the bag', async () => {
    const user = userEvent.setup();
    render(<WhiteProductCard locale="en" product={PRODUCT} t={t} quickAdd />);

    await user.click(screen.getByRole('button', {name: /quick add/i}));
    // Panel reveals the size run.
    const sizeM = await screen.findByRole('button', {name: 'M'});
    expect(sizeM).toBeInTheDocument();

    await user.click(sizeM);

    await waitFor(() => {
      const bag = readBag();
      expect(bag).toHaveLength(1);
      expect(bag[0]).toMatchObject({key: 3, size: 'M', qty: 1, id: '3-M'});
    });
    // Visible confirmation on the trigger…
    expect(await screen.findByText('Added ✓')).toBeInTheDocument();
    // …and a polite status announced to screen readers (the trigger's own
    // accessible name stays the stable "Quick add …" label).
    expect(screen.getByRole('status')).toHaveTextContent(/added to bag/i);
  });

  it('omits the Quick Add control entirely when quickAdd is not set', () => {
    render(<WhiteProductCard locale="en" product={PRODUCT} t={t} />);
    expect(screen.queryByRole('button', {name: /quick add/i})).not.toBeInTheDocument();
    // The card is still a link to the product.
    expect(screen.getAllByRole('link').length).toBeGreaterThan(0);
  });
});

describe('WhiteProductCard favourite heart', () => {
  it('toggles the favourite on, persisting the product key', async () => {
    const user = userEvent.setup();
    render(<WhiteProductCard locale="en" product={PRODUCT} t={t} />);

    const heart = screen.getByRole('button', {name: /add .* to favourites/i});
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(readFavs()).toHaveLength(0);

    await user.click(heart);

    await waitFor(() => expect(readFavs()).toEqual([3]));
    // The button now offers the inverse action and reports the pressed state.
    expect(screen.getByRole('button', {name: /remove .* from favourites/i})).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles the favourite back off', async () => {
    const user = userEvent.setup();
    render(<WhiteProductCard locale="en" product={PRODUCT} t={t} />);
    const heart = screen.getByRole('button', {name: /favourites/i});
    await user.click(heart);
    await waitFor(() => expect(readFavs()).toEqual([3]));
    await user.click(screen.getByRole('button', {name: /favourites/i}));
    await waitFor(() => expect(readFavs()).toEqual([]));
  });
});
