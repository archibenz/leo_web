import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, cleanup, waitFor, act, fireEvent} from '@testing-library/react';
import WhiteBagPopup from './WhiteBagPopup';
import {addToWhiteBag, removeFromWhiteBag} from '../../hooks/useWhiteBag';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../messages/en.json';

// The popup subscribes to the bag store rather than taking a prop, so these
// tests drive the real store — which is also the contract that matters: any
// path that fills the bag must raise the confirmation, and none of them has to
// remember to.

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

// A line the bag takes today: it carries the variant, its slug and the photo of
// the colourway that was picked, so the popup needs no catalogue to show them.
const ITEM = {
  key: 3,
  en: 'Peplum Suit Vest',
  ru: 'Жилет костюмный с баской',
  price: 4466,
  size: 'M',
  colorEn: 'Black',
  colorRu: 'Чёрный',
  productId: 'wb-123456',
  slug: 'zhilet-kostyumnyy-s-baskoy',
  image: '/images/white/products/vest-black.jpg',
};

// A line persisted before the bag carried any of that. It must still announce.
const LEGACY_ITEM = {key: 8, en: 'Balloon Skirt', ru: 'Юбка-баллон', price: 3200, size: 'S', colorEn: 'Ivory', colorRu: 'Молочный'};

function renderPopup() {
  return render(
    <NextIntlClientProvider locale="en" messages={{white: {card: enMessages.white.card}}}>
      <WhiteBagPopup locale="en" />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  const raw = localStorage.getItem('wv-bag');
  if (raw) {
    try {
      (JSON.parse(raw) as Array<{id: string}>).forEach((i) => removeFromWhiteBag(i.id));
    } catch {
      /* ignore */
    }
  }
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});

describe('WhiteBagPopup', () => {
  it('shows nothing until something is added', () => {
    renderPopup();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces the garment, its colour and its size when the bag takes one', async () => {
    renderPopup();
    act(() => {
      addToWhiteBag(ITEM);
    });
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(screen.getByText('Peplum Suit Vest')).toBeInTheDocument();
    // Colour and size share a line — a shopper adding a second size needs to see
    // which one this was.
    expect(screen.getByText(/Black · M/)).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /go to the bag/i})).toHaveAttribute('href', '/en/bag');
  });

  it('is polite, not assertive — the bag is a side effect, not an interruption', async () => {
    renderPopup();
    act(() => {
      addToWhiteBag(ITEM);
    });
    const region = await screen.findByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the colourway that was picked and links back to its garment', async () => {
    const {container} = renderPopup();
    act(() => {
      addToWhiteBag(ITEM);
    });
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    // The photo travels on the line — the catalogue lives behind the API now
    // and a popup mounted in the chrome has no way to fetch it.
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toContain(encodeURIComponent(ITEM.image));
    expect(screen.getByRole('link', {name: ITEM.en})).toHaveAttribute('href', `/en/product/${ITEM.slug}`);
  });

  it('still announces a line saved before the bag carried the variant', async () => {
    const {container} = renderPopup();
    act(() => {
      addToWhiteBag(LEGACY_ITEM);
    });
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(screen.getByText('Balloon Skirt')).toBeInTheDocument();
    // Nothing to show and nowhere to point: no thumbnail, and the bag is the
    // only place the shopper can be sent.
    expect(container.querySelector('img')).toBeNull();
    expect(screen.queryByRole('link', {name: LEGACY_ITEM.en})).not.toBeInTheDocument();
    expect(screen.getByRole('link', {name: /go to the bag/i})).toHaveAttribute('href', '/en/bag');
  });

  it('takes itself away', async () => {
    vi.useFakeTimers({shouldAdvanceTime: true});
    renderPopup();
    act(() => {
      addToWhiteBag(ITEM);
    });
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    act(() => {
      vi.advanceTimersByTime(5400);
    });
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it.each(['automatic', 'manual'])('gives a new item its full lifetime during an %s dismissal', (dismissal) => {
    vi.useFakeTimers();
    renderPopup();
    act(() => addToWhiteBag(ITEM));
    if (dismissal === 'automatic') act(() => vi.advanceTimersByTime(5000));
    else fireEvent.click(screen.getByRole('button', {name: /close/i}));
    act(() => vi.advanceTimersByTime(100));

    act(() => addToWhiteBag(LEGACY_ITEM));
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByRole('status')).toHaveTextContent('Balloon Skirt');

    act(() => vi.advanceTimersByTime(261));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('keeps the popup while a link has keyboard focus, even after the pointer leaves', () => {
    vi.useFakeTimers();
    renderPopup();
    act(() => addToWhiteBag(ITEM));
    fireEvent.mouseEnter(screen.getByRole('status'));
    const bagLink = screen.getByRole('link', {name: /go to the bag/i});
    act(() => bagLink.focus());
    fireEvent.mouseLeave(screen.getByRole('status'));

    act(() => vi.advanceTimersByTime(10000));
    expect(bagLink).toHaveFocus();
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => bagLink.blur());
    act(() => vi.advanceTimersByTime(5260));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('clears a pending exit timer when unmounted', () => {
    vi.useFakeTimers();
    const {unmount} = renderPopup();
    act(() => addToWhiteBag(ITEM));
    act(() => vi.advanceTimersByTime(5000));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('resumes dismissal if a newer item removes the focused thumbnail', () => {
    vi.useFakeTimers();
    renderPopup();
    act(() => addToWhiteBag(ITEM));
    act(() => screen.getByRole('link', {name: ITEM.en}).focus());

    act(() => addToWhiteBag(LEGACY_ITEM));
    act(() => vi.advanceTimersByTime(5260));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
