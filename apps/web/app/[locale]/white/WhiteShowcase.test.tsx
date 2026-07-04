import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import WhiteShowcase from './WhiteShowcase';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../messages/en.json';

// The footer's locale switch reads the router — give jsdom a stub.
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/white',
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

// jsdom ships neither; the showcase portal + cards need them to mount.
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

function renderHome() {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      <WhiteShowcase locale="en" />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('WhiteShowcase image-led home', () => {
  it('mounts the portal with a single hero h1 and the shop CTA', async () => {
    renderHome();

    // The showcase gates on a mount effect, then portals to document.body.
    const h1 = await screen.findByRole('heading', {level: 1});
    expect(h1.textContent ?? '').toMatch(/Quiet/); // heroLine1

    // Exactly one <h1> on the page (the hero) — the rest are h2 section heads.
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);

    // The hero CTA is a real link to the shop.
    const cta = screen.getByRole('link', {name: /shop the collection/i});
    expect(cta).toHaveAttribute('href', '/en/white/shop');
  });

  it('renders the house line that replaced the marquee', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText(/made to be worn, not noticed first/i)).toBeInTheDocument());
  });
});
