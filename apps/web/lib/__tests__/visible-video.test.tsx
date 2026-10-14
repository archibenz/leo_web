import {act, cleanup, fireEvent, render} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {ReactNode} from 'react';
import WhiteShowcase from '../../app/[locale]/WhiteShowcase';

vi.mock('next-intl', () => ({useTranslations: () => (key: string) => key}));
vi.mock('next/navigation', () => ({usePathname: () => '/en', useSearchParams: () => new URLSearchParams()}));
vi.mock('../../hooks/useWhiteBag', () => ({useWhiteBag: () => ({count: 0})}));
vi.mock('../../hooks/useWhiteFavourites', () => ({useWhiteFavourites: () => ({count: 0})}));
vi.mock('../../components/editor/EditableSection', () => ({default: ({children}: {children: ReactNode}) => children}));

class Observer {
  static all: Observer[] = [];
  targets = new Set<Element>();
  disconnect = vi.fn(() => this.targets.clear());
  constructor(public callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
    Observer.all.push(this);
  }
  observe(target: Element) { this.targets.add(target); }
  unobserve(target: Element) { this.targets.delete(target); }
}

let reduce: boolean;
let hidden: boolean;
let motion: EventTarget;
let paused: WeakMap<HTMLMediaElement, boolean>;
let play: ReturnType<typeof vi.spyOn>;
let load: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  Observer.all = [];
  reduce = false;
  hidden = false;
  motion = new EventTarget();
  paused = new WeakMap();
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() { return query.includes('prefers-reduced-motion') ? reduce : true; },
    addEventListener: motion.addEventListener.bind(motion),
    removeEventListener: motion.removeEventListener.bind(motion),
  }));
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => hidden ? 'hidden' : 'visible');
  vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockImplementation(function(this: HTMLMediaElement) {
    return paused.get(this) ?? true;
  });
  play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function(this: HTMLMediaElement) {
    paused.set(this, false);
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function(this: HTMLMediaElement) {
    paused.set(this, true);
  });
  load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function home() {
  const view = render(<WhiteShowcase locale="en" featured={[]} />);
  const hero = view.container.querySelector<HTMLVideoElement>('#wv-hero-video')!;
  const sets = view.container.querySelector<HTMLVideoElement>('#wv-atelier video')!;
  return {...view, hero, sets};
}

function intersect(video: HTMLVideoElement, near: boolean, visible: boolean) {
  act(() => {
    for (const observer of Observer.all) {
      if (!observer.targets.has(video)) continue;
      const isIntersecting = observer.options?.rootMargin?.startsWith('50%') ? near : visible;
      observer.callback([{
        target: video, isIntersecting, intersectionRatio: isIntersecting ? 0.5 : 0,
        boundingClientRect: new DOMRect(), intersectionRect: new DOMRect(), rootBounds: null, time: 0,
      }], observer as unknown as IntersectionObserver);
    }
  });
}

describe('the collection video plays only while visible', () => {
  it('preloads the approaching collection without advancing its first frame', () => {
    const {sets} = home();
    play.mockClear();
    load.mockClear();
    intersect(sets, true, false);

    expect(sets).toHaveAttribute('poster', '/images/white/sets-static.jpg');
    expect(play).not.toHaveBeenCalled();
    expect(sets.preload).toBe('auto');
    expect(load.mock.contexts).toContain(sets);
    expect(sets.currentTime).toBe(0);
  });

  it('pauses offscreen and resumes from the same frame without reloading', () => {
    const {sets} = home();
    intersect(sets, true, true);
    expect(sets.paused).toBe(false);
    sets.currentTime = 4;
    load.mockClear();
    intersect(sets, false, false);
    expect(sets.paused).toBe(true);
    intersect(sets, true, true);
    expect(sets.paused).toBe(false);
    expect(sets.currentTime).toBe(4);
    expect(load).not.toHaveBeenCalled();
  });

  it('does not fade the video container behind an advancing video', () => {
    const {sets} = home();
    expect(sets.closest('.wv-rise, .wv-scrub')).toBeNull();
  });

  it('pauses in a hidden tab and resumes when visible on return', () => {
    const {sets} = home();
    intersect(sets, true, true);
    hidden = true;
    act(() => fireEvent(document, new Event('visibilitychange')));
    expect(sets.paused).toBe(true);
    hidden = false;
    act(() => fireEvent(document, new Event('visibilitychange')));
    expect(sets.paused).toBe(false);
  });

  it('keeps both posters without autoplay when reduced motion is requested', () => {
    reduce = true;
    const {hero, sets} = home();
    intersect(hero, true, true);
    intersect(sets, true, true);
    expect(hero).not.toHaveAttribute('src');
    expect(sets).toHaveAttribute('poster', '/images/white/sets-static.jpg');
    expect(play).not.toHaveBeenCalled();
    expect(load).not.toHaveBeenCalled();
  });

  it('responds when reduced motion changes during playback', () => {
    const {sets} = home();
    intersect(sets, true, true);
    reduce = true;
    act(() => motion.dispatchEvent(new Event('change')));
    expect(sets.paused).toBe(true);
  });
});
