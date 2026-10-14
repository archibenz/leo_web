import {Fragment, type ReactNode} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {act, cleanup, render} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import WhiteHeroVideo from './WhiteHeroVideo';

class MotionQuery extends EventTarget {
  matches = false;
}
class Observer {
  static all: Observer[] = [];
  target: Element | null = null;
  constructor(readonly callback: IntersectionObserverCallback) { Observer.all.push(this); }
  observe(target: Element) { this.target = target; }
  disconnect() { this.target = null; }
}
const motion = new MotionQuery();
let desktop = false;
const props = {source: '/portrait.mp4', desktopSource: '/landscape.mp4', nonce: 'nonce-value'};

function show(video: Element, visible = true) {
  act(() => {
    for (const observer of Observer.all) if (observer.target === video) observer.callback([
      {target: video, isIntersecting: visible, intersectionRatio: visible ? 1 : 0} as IntersectionObserverEntry,
    ], observer as unknown as IntersectionObserver);
  });
}
function parsedHero(sourceProps = props) {
  const container = document.createElement('div');
  container.hidden = true;
  container.innerHTML = renderToString(<WhiteHeroVideo {...sourceProps} />);
  document.body.append(container);
  const script = container.querySelector('script')!;
  new Function('matchMedia', script.textContent!)(window.matchMedia);
  return {container, video: container.querySelector('video')!, script};
}

beforeEach(() => {
  Observer.all = [];
  motion.matches = false;
  desktop = false;
  vi.stubGlobal('IntersectionObserver', Observer);
  vi.stubGlobal('matchMedia', (query: string) => query.includes('reduced-motion') ? motion : {matches: desktop});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('WhiteHeroVideo', () => {
  it.each([false, true])('preloads only the matching source, desktop=%s', (wide) => {
    desktop = wide;
    const {video, script} = parsedHero();
    expect(video.getAttribute('src')).toBe(wide ? '/landscape.mp4' : '/portrait.mp4');
    expect(video.preload).toBe('auto');
    expect(video.load).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
    expect(video).not.toHaveAttribute('autoplay');
    expect(video.querySelector('source')).toBeNull();
    expect(script).toHaveAttribute('nonce', 'nonce-value');
  });

  it('downloads no video for reduced motion, both before and after hydration', async () => {
    motion.matches = true;
    const {container, video} = parsedHero();
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, <WhiteHeroVideo {...props} />); });
    try {
      container.hidden = false;
      show(video);
      expect(video).not.toHaveAttribute('src');
      expect(video.load).not.toHaveBeenCalled();
      expect(video.play).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
    }
  });

  it('keeps the parser-loaded source and request when hydrating the same element', async () => {
    desktop = true;
    const {container, video} = parsedHero();
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, <WhiteHeroVideo {...props} />); });
    try {
      expect(container.querySelector('video')).toBe(video);
      expect(video.load).toHaveBeenCalledOnce();
      expect(video.play).not.toHaveBeenCalled();
      container.hidden = false;
      show(video);
      await act(async () => {});
      expect(video.play).toHaveBeenCalledOnce();
      expect(video.load).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
    }
  });

  it('keeps script-shaped URLs escaped while preserving their selected value', () => {
    const source = '/film.mp4?q=</script><script>bad()</script>&цвет=белый';
    const {container, script, video} = parsedHero({...props, source});
    expect(container.querySelectorAll('script')).toHaveLength(1);
    expect(script.textContent).not.toContain('</script>');
    expect(video.getAttribute('src')).toBe(source);
    expect(video.play).not.toHaveBeenCalled();
  });

  it('reacts to motion preference changes without starting offscreen', async () => {
    motion.matches = true;
    const {container} = render(<WhiteHeroVideo {...props} />);
    const video = container.querySelector('video')!;
    show(video);
    motion.matches = false;
    act(() => motion.dispatchEvent(new Event('change')));
    await act(async () => {});
    expect(video.play).toHaveBeenCalledOnce();
    motion.matches = true;
    vi.mocked(video.pause).mockClear();
    act(() => motion.dispatchEvent(new Event('change')));
    expect(video.pause).toHaveBeenCalledOnce();
    show(video, false);
    motion.matches = false;
    act(() => motion.dispatchEvent(new Event('change')));
    expect(video.play).toHaveBeenCalledOnce();
  });

  it('does not issue duplicate play requests and pauses a late completion offscreen', async () => {
    let finish!: () => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const {container} = render(<WhiteHeroVideo {...props} />);
    const video = container.querySelector('video')!;
    show(video);
    show(video);
    expect(video.play).toHaveBeenCalledOnce();
    show(video, false);
    vi.mocked(video.pause).mockClear();
    await act(async () => { finish(); });
    expect(video.pause).toHaveBeenCalledOnce();
  });

  it('resumes once when visibility returns before the interrupted play rejects', async () => {
    let reject!: (reason: DOMException) => void;
    vi.mocked(HTMLMediaElement.prototype.play)
      .mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail; }))
      .mockRejectedValue(new DOMException('Interrupted again', 'AbortError'));
    const {container} = render(<WhiteHeroVideo {...props} />);
    const video = container.querySelector('video')!;
    show(video);
    show(video, false);
    show(video);
    expect(video.play).toHaveBeenCalledOnce();
    await act(async () => { reject(new DOMException('Paused', 'AbortError')); });
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it.each(['NotAllowedError', 'NotSupportedError'])('does not retry %s after a pending visibility request', async (name) => {
    let reject!: (reason: DOMException) => void;
    vi.mocked(HTMLMediaElement.prototype.play)
      .mockImplementationOnce(() => new Promise<void>((_, fail) => { reject = fail; }));
    const {container} = render(<WhiteHeroVideo {...props} />);
    const video = container.querySelector('video')!;
    show(video);
    show(video, false);
    show(video);
    await act(async () => { reject(new DOMException('Cannot play', name)); });
    expect(video.play).toHaveBeenCalledOnce();
  });

  it('keeps a still fallback when visibility observation is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const {container} = render(<WhiteHeroVideo {...props} />);
    expect(container.querySelector('video')!.play).not.toHaveBeenCalled();
  });

  it('keeps the selected cut when the viewport changes during the visit', async () => {
    const {container} = render(<WhiteHeroVideo {...props} />);
    const video = container.querySelector('video')!;
    desktop = true;
    show(video);
    await act(async () => {});
    expect(video.getAttribute('src')).toBe('/portrait.mp4');
    expect(video.load).toHaveBeenCalledOnce();
  });

  it('accepts older play implementations that return no promise', () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValue(undefined as unknown as Promise<void>);
    const {container} = render(<WhiteHeroVideo {...props} />);
    expect(() => show(container.querySelector('video')!)).not.toThrow();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  });

  it('binds the controller to the replacement video when an editor adds its wrapper', async () => {
    const Wrapper = ({editing, children}: {editing: boolean; children: ReactNode}) =>
      editing ? <div data-editable>{children}</div> : <Fragment>{children}</Fragment>;
    const {container, rerender} = render(<Wrapper editing={false}><WhiteHeroVideo {...props} /></Wrapper>);
    const original = container.querySelector('video')!;
    show(original);
    await act(async () => {});
    rerender(<Wrapper editing><WhiteHeroVideo {...props} /></Wrapper>);
    const replacement = container.querySelector('video')!;
    expect(replacement).not.toBe(original);
    expect(Observer.all.some((observer) => observer.target === original)).toBe(false);
    vi.mocked(replacement.play).mockClear();
    show(replacement);
    await act(async () => {});
    expect(replacement.play).toHaveBeenCalledOnce();
    expect(replacement.getAttribute('src')).toBe('/portrait.mp4');
  });
});
