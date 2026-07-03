import {render, screen, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import BlurReveal from '../BlurReveal';

// lw-obnl: BlurReveal's scroll mode used to keep a window+body scroll listener
// (plus a per-frame getBoundingClientRect read/write) alive forever, on ~13-15
// home-page instances. The refactor gates the rAF loop behind an
// IntersectionObserver and fully tears down once the reveal completes. These
// tests lock in: reduced-motion still shortcuts, the observer gates setup, and
// completion disconnects everything. jsdom does no layout, so we drive position
// via a stubbed getBoundingClientRect and a synchronous rAF.

type IOEntry = {isIntersecting: boolean};
type IOCallback = (entries: IOEntry[]) => void;

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  callback: IOCallback;
  options?: IntersectionObserverInit;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(cb: IOCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    IntersectionObserverMock.instances.push(this);
  }
}

let prefersReduced = false;

beforeEach(() => {
  prefersReduced = false;
  IntersectionObserverMock.instances = [];
  // @ts-expect-error -- jsdom has no IntersectionObserver; stub it for the test
  global.IntersectionObserver = IntersectionObserverMock;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: prefersReduced,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });

  // Run the rAF-driven update synchronously so the loop is deterministic.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// jsdom returns an all-zero rect; drive the reveal by faking the element's
// distance from the top of the viewport (innerHeight defaults to 768).
const stubRect = (top: number) => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom: top + 100,
    left: 0,
    right: 100,
    width: 100,
    height: 100,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);
};

describe('BlurReveal', () => {
  it('renders its children', () => {
    render(
      <BlurReveal>
        <span>hello world</span>
      </BlurReveal>,
    );
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion: reveals immediately with no observer', () => {
    prefersReduced = true;
    const {container} = render(
      <BlurReveal>
        <span>content</span>
      </BlurReveal>,
    );
    const el = container.firstChild as HTMLElement;

    expect(el.style.opacity).toBe('1');
    expect(el.style.filter).toBe('blur(0px)');
    expect(el.style.transform).toBe('translateY(0)');
    // Reduced motion shortcuts before wiring any scroll machinery.
    expect(IntersectionObserverMock.instances).toHaveLength(0);
  });

  it('gates the scroll loop behind one IntersectionObserver and disconnects on unmount', () => {
    stubRect(2000); // below the fold → progress 0, stays observing
    const {container, unmount} = render(
      <BlurReveal>
        <span>card</span>
      </BlurReveal>,
    );
    const el = container.firstChild as HTMLElement;

    expect(IntersectionObserverMock.instances).toHaveLength(1);
    const io = IntersectionObserverMock.instances[0]!;
    expect(io.observe).toHaveBeenCalledTimes(1);
    expect(io.observe).toHaveBeenCalledWith(el);
    // Not yet revealed: still blurred, and the observer owns the gate.
    expect(el.style.filter).toBe('blur(12.0px)');

    unmount();
    expect(io.disconnect).toHaveBeenCalled();
  });

  it('tears down fully once the reveal completes (progress reaches 1)', () => {
    stubRect(2000); // start below the fold
    const {container} = render(
      <BlurReveal>
        <span>card</span>
      </BlurReveal>,
    );
    const el = container.firstChild as HTMLElement;
    const io = IntersectionObserverMock.instances[0]!;

    // Element scrolls into full view, then the observer reports intersecting.
    stubRect(0);
    io.callback([{isIntersecting: true}]);

    // Reveal finished: final styles applied, hint released, observer gone.
    expect(el.style.opacity).toBe('1');
    expect(el.style.filter).toBe('blur(0.0px)');
    expect(el.style.transform).toBe('translateY(0.0px)');
    expect(el.style.willChange).toBe('');
    expect(io.disconnect).toHaveBeenCalled();
  });
});
