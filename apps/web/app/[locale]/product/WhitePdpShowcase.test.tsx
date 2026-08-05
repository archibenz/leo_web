import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, cleanup, waitFor, fireEvent, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhitePdpShowcase from './WhitePdpShowcase';
import {WHITE_PRODUCTS} from '../products';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../messages/en.json';

// The footer's locale switch reads the router — give jsdom a stub.
vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
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

// jsdom ships neither of these; the White showcase observes its gallery and the
// wordmark reads matchMedia. Minimal stubs so the portal can mount under test.
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

function renderPdp(product: (typeof WHITE_PRODUCTS)[number]) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      <WhitePdpShowcase locale="en" product={product} />
    </NextIntlClientProvider>,
  );
}

// A product carrying extra views — the PDP gallery is its own photo + those views.
const MULTI_PRODUCT = {...WHITE_PRODUCTS[0]!, gallery: ['/images/white/products/g2.jpg', '/images/white/products/g3.jpg', '/images/white/products/g4.jpg']};
const GALLERY_LEN = 4;

// Read the lightbox position indicator ("1 / 4") inside the open dialog.
function position(dialog: HTMLElement): string {
  return within(dialog)
    .getAllByRole('status')
    .map((el) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .find((txt) => /^\d+ \/ \d+$/.test(txt))!;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('WhitePdpShowcase zoom lightbox keyboard navigation', () => {
  it('steps through the gallery with Arrow keys and clamps at both ends (WCAG 2.1.1)', async () => {
    const user = userEvent.setup();
    renderPdp(MULTI_PRODUCT);

    // Each album photo is its own zoom trigger; open at the first frame.
    const zoom = (await screen.findAllByRole('button', {name: /zoom image/i}))[0]!;
    await user.click(zoom);

    const dialog = await screen.findByRole('dialog');
    expect(position(dialog)).toBe(`1 / ${GALLERY_LEN}`);

    // ArrowRight advances one image at a time.
    fireEvent.keyDown(document, {key: 'ArrowRight'});
    await waitFor(() => expect(position(dialog)).toBe(`2 / ${GALLERY_LEN}`));

    // Past the last image it clamps, never overflowing gallery.length.
    for (let i = 0; i < GALLERY_LEN + 2; i++) fireEvent.keyDown(document, {key: 'ArrowRight'});
    await waitFor(() => expect(position(dialog)).toBe(`${GALLERY_LEN} / ${GALLERY_LEN}`));

    // ArrowLeft steps back and clamps at the first image.
    fireEvent.keyDown(document, {key: 'ArrowLeft'});
    await waitFor(() => expect(position(dialog)).toBe(`${GALLERY_LEN - 1} / ${GALLERY_LEN}`));

    for (let i = 0; i < GALLERY_LEN + 2; i++) fireEvent.keyDown(document, {key: 'ArrowLeft'});
    await waitFor(() => expect(position(dialog)).toBe(`1 / ${GALLERY_LEN}`));
  });

  it('still closes on Escape', async () => {
    const user = userEvent.setup();
    renderPdp(MULTI_PRODUCT);
    await user.click((await screen.findAllByRole('button', {name: /zoom image/i}))[0]!);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, {key: 'Escape'});
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows a single view — no cross-product filler — when the product has no extra images', async () => {
    // Built rather than found: every catalogue garment now ships a gallery, and
    // hunting for a bare one made the test depend on the catalogue's contents.
    const {gallery: _g, ...bare} = WHITE_PRODUCTS[0]!;
    const single = {...bare, colors: [{...bare.colors[0]!, image: undefined, gallery: undefined}]};
    renderPdp(single);
    // Exactly one album frame — its own zoom trigger and nothing else.
    const zooms = await screen.findAllByRole('button', {name: /zoom image/i});
    expect(zooms).toHaveLength(1);
  });
});
