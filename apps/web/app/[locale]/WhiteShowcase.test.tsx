import type {ComponentProps} from 'react';
import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import WhiteShowcase from './WhiteShowcase';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../messages/en.json';
import {STOREFRONT_FIXTURE} from '../../lib/catalogue/fixture';

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

const SF = STOREFRONT_FIXTURE;
const HERO = SF.sections.find((s) => s.layout === 'hero')!;
const SETS_TEASER = SF.sections.find((s) => s.layout === 'sets-teaser')!;

// The storefront arrives as props from the server page, so the test hands the
// component a catalogue instead of mocking a data module.
function renderHome(over: Partial<ComponentProps<typeof WhiteShowcase>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      <WhiteShowcase locale="en" featured={SF.products} hero={HERO} setsTeaser={SETS_TEASER} {...over} />
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
    // Assert against the section rather than a literal — the hero wording is
    // brand copy the editor rewrites; what must hold is that the h1 carries it.
    for (const line of HERO.headlineEn!.split('\n')) expect(h1.textContent ?? '').toContain(line);

    // Exactly one <h1> on the page (the hero) — the rest are h2 section heads.
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1);

    // The hero CTA is a real link to the shop.
    const cta = screen.getByRole('link', {name: /shop the collection/i});
    expect(cta).toHaveAttribute('href', '/en/shop');
  });

  it('renders the house line that replaced the marquee', async () => {
    renderHome();
    await waitFor(() => expect(screen.getByText(/made to underline you, not outshine you/i)).toBeInTheDocument());
  });

  it('takes the hero video and eyebrow from the section', async () => {
    const {container} = renderHome();
    await screen.findByRole('heading', {level: 1});

    // `poster` can't take a media query, so the still frame is a <picture>
    // layer instead of a video attribute — see WhiteShowcase.tsx.
    const picture = container.querySelector('picture')!;
    expect(picture.querySelector('source')?.getAttribute('srcset')).toBe(HERO.posterDesktopUrl);
    expect(picture.querySelector('img')?.getAttribute('src')).toBe(HERO.posterUrl);
    expect(container.querySelector(`video source[src="${HERO.videoUrl}"]`)).toBeTruthy();
    expect(container.querySelector(`video source[src="${HERO.videoDesktopUrl}"]`)).toBeTruthy();
    expect(screen.getByText(HERO.eyebrowEn!)).toBeInTheDocument();
  });

  it('falls back to the bundled copy and media when there is no hero section', async () => {
    const {container} = renderHome({hero: undefined, setsTeaser: undefined});
    const h1 = await screen.findByRole('heading', {level: 1});

    expect(h1.textContent ?? '').toContain(enMessages.white.landing.heroLine1);
    expect(h1.textContent ?? '').toContain(enMessages.white.landing.heroLine2);
    expect(screen.getByText(enMessages.white.landing.season)).toBeInTheDocument();
    expect(container.querySelector('video source[src="/videos/white/hero-mark2.mp4"]')).toBeTruthy();
    // The bundled fallback still goes through the same <picture> layer as the
    // API-driven section, not through the retired `poster` attribute.
    const picture = container.querySelector('picture')!;
    expect(picture.querySelector('source')?.getAttribute('srcset')).toBe('/images/white/hero-desktop.jpg');
    expect(picture.querySelector('img')?.getAttribute('src')).toBe('/images/white/hero-mark2.jpg');
    expect(screen.getByText(enMessages.white.sets.landingBody)).toBeInTheDocument();
  });

  it('renders the featured pieces in the order given', async () => {
    const reversed = [...SF.products].reverse();
    const {container} = renderHome({featured: reversed});
    await screen.findByRole('heading', {level: 1});

    // Every card lays a full-cover link over its photograph, labelled with the
    // garment's name — reading them in DOM order reads the grid in order.
    const names = Array.from(container.querySelectorAll('.wv-card-link')).map((a) => a.getAttribute('aria-label'));
    expect(names).toEqual(reversed.map((p) => p.en));
  });
});
