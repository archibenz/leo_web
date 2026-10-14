import type {ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {render, screen, cleanup, waitFor, act} from '@testing-library/react';
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
  static observers: MockIntersectionObserver[] = [];
  elements = new Set<Element>();
  constructor(private callback: IntersectionObserverCallback) {
    MockIntersectionObserver.observers.push(this);
  }
  observe(element: Element) { this.elements.add(element); }
  unobserve() {}
  disconnect() { this.elements.clear(); }
  takeRecords() {
    return [];
  }
}
function showVideo(video: Element, visible: boolean) {
  act(() => {
    for (const observer of MockIntersectionObserver.observers) {
      if (observer.elements.has(video)) observer['callback']([
        {target: video, isIntersecting: visible, intersectionRatio: visible ? 1 : 0} as IntersectionObserverEntry,
      ], observer as unknown as IntersectionObserver);
    }
  });
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

beforeEach(() => {
  MockIntersectionObserver.observers = [];
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('WhiteShowcase image-led home', () => {
  it('preloads the correct hero during streamed HTML parsing without starting hidden playback', () => {
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={enMessages as never}>
        <WhiteShowcase locale="en" featured={[]} hero={HERO} nonce="test-nonce" />
      </NextIntlClientProvider>,
    );
    const hidden = document.createElement('div');
    hidden.hidden = true;
    hidden.innerHTML = html;
    document.body.append(hidden);
    try {
      const video = hidden.querySelector('video')!;
      const script = hidden.querySelector('script')!;
      expect(video).not.toHaveAttribute('src');
      expect(video.querySelector('source')).toBeNull();
      expect(script).toHaveAttribute('nonce', 'test-nonce');
      new Function('matchMedia', script.textContent!)(window.matchMedia);
      expect(play).not.toHaveBeenCalled();
      expect(video.getAttribute('src')).toBe(HERO.videoUrl);
      expect(video.preload).toBe('auto');
      expect(load).toHaveBeenCalledOnce();
      expect(video.currentTime).toBe(0);
    } finally {
      hidden.remove();
    }
  });

  it('does not start the hero before a real visibility observation after hydration', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const {container} = renderHome();
    expect(container.querySelector('video')!.currentTime).toBe(0);
    expect(play).not.toHaveBeenCalled();
  });

  it('plays only while the hero and its browser tab are visible', async () => {
    const {container} = renderHome();
    const video = container.querySelector('video')!;
    const play = vi.mocked(video.play);
    const pause = vi.mocked(video.pause);
    showVideo(video, true);
    await act(async () => {});
    expect(play).toHaveBeenCalledOnce();
    showVideo(video, false);
    expect(pause).toHaveBeenCalled();
    play.mockClear();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    showVideo(video, true);
    expect(play).not.toHaveBeenCalled();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    await act(async () => {});
    expect(play).toHaveBeenCalledOnce();
    pause.mockClear();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(pause.mock.contexts.filter((element) => element === video)).toHaveLength(1);
  });

  it('waits for the page reveal to finish instead of playing behind its opacity animation', async () => {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => { finish = resolve; });
    const {container} = renderHome();
    container.className = 'page-enter';
    const animation = {animationName: 'pageEnter', playState: 'running', finished};
    Object.defineProperty(container, 'getAnimations', {value: () => [animation]});
    const video = container.querySelector('video')!;
    showVideo(video, true);
    expect(video.play).not.toHaveBeenCalled();
    expect(video.currentTime).toBe(0);
    animation.playState = 'finished';
    await act(async () => { finish(); });
    expect(video.play).toHaveBeenCalledOnce();
  });

  it('does not start a scrolled-away hero after the page reveal finishes', async () => {
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => { finish = resolve; });
    const {container} = renderHome();
    container.className = 'page-enter';
    Object.defineProperty(container, 'getAnimations', {value: () => [
      {animationName: 'pageEnter', playState: 'running', finished},
    ]});
    const video = container.querySelector('video')!;
    showVideo(video, true);
    showVideo(video, false);
    await act(async () => { finish(); });
    expect(video.play).not.toHaveBeenCalled();
  });

  it('pauses a late play completion after unmount and disconnects its observer', async () => {
    let finish!: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const {container, unmount} = renderHome();
    const video = container.querySelector('video')!;
    showVideo(video, true);
    expect(video.play).toHaveBeenCalledOnce();
    unmount();
    vi.mocked(video.pause).mockClear();
    await act(async () => { finish(); });
    expect(video.pause).toHaveBeenCalledOnce();
    expect(MockIntersectionObserver.observers.some((observer) => observer.elements.has(video))).toBe(false);
  });

  it('handles blocked autoplay without a retry loop', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new DOMException('Blocked', 'NotAllowedError'));
    const {container} = renderHome();
    showVideo(container.querySelector('video')!, true);
    await act(async () => {});
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

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

    // The video ships with no <source> — JS is the only thing that ever sets
    // one, on every engine (see WhiteShowcase.tsx). The shared matchMedia
    // mock above always reports narrow, so the mount effect resolves here to
    // the portrait file.
    const video = container.querySelector('video')!;
    await waitFor(() => expect(video.getAttribute('src')).toBe(HERO.videoUrl));
    expect(video).not.toHaveAttribute('autoplay');

    expect(screen.getByText(HERO.eyebrowEn!)).toBeInTheDocument();
  });

  it('leaves the poster as the whole banner under reduced motion, never setting a video source', async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    try {
      const {container} = renderHome();
      await screen.findByRole('heading', {level: 1});
      // No source ever gets set — there is nothing here to later pause.
      expect(container.querySelector('video')).not.toHaveAttribute('src');
    } finally {
      window.matchMedia = original;
    }
  });

  it('falls back to the bundled copy and media when there is no hero section', async () => {
    const {container} = renderHome({hero: undefined, setsTeaser: undefined});
    const h1 = await screen.findByRole('heading', {level: 1});

    expect(h1.textContent ?? '').toContain(enMessages.white.landing.heroLine1);
    expect(h1.textContent ?? '').toContain(enMessages.white.landing.heroLine2);
    expect(screen.getByText(enMessages.white.landing.season)).toBeInTheDocument();
    const video = container.querySelector('video')!;
    await waitFor(() => expect(video.getAttribute('src')).toBe('/videos/white/hero-mark2.mp4'));
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
