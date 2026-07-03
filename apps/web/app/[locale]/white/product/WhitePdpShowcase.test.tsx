import {afterEach, describe, it, expect} from 'vitest';
import {render, screen, cleanup, waitFor, fireEvent, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhitePdpShowcase from './WhitePdpShowcase';
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

function renderPdp() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      <WhitePdpShowcase locale="en" product={null} />
    </NextIntlClientProvider>,
  );
}

// The lightbox gallery is the demo product image + the 3 shared editorial views.
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
    renderPdp();

    // Portal mounts after the mount-guard effect; the zoom trigger then exists.
    const zoom = await screen.findByRole('button', {name: /zoom image/i});
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
    renderPdp();
    await user.click(await screen.findByRole('button', {name: /zoom image/i}));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, {key: 'Escape'});
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
