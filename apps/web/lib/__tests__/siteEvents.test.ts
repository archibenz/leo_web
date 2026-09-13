import {describe, it, expect, beforeEach, vi} from 'vitest';

// Same reset-and-reimport shape as analytics.test.ts: the module keeps an
// in-memory queue and attaches visibilitychange/pagehide listeners at import
// time, so every scenario needs its own fresh instance.

const CONSENT_KEY = 'wv-cookie-ok'; // lib/cookieConsent.ts
const SESSION_STORAGE_KEY = 'wv-site-session';

// jsdom here doesn't provide localStorage/sessionStorage (and Node's
// experimental one is off) — same in-memory mock pattern as
// hooks/useWhiteBag.test.ts.
function installStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}
const mockLocalStorage = installStorageMock();
const mockSessionStorage = installStorageMock();
Object.defineProperty(globalThis, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});
Object.defineProperty(globalThis, 'sessionStorage', {value: mockSessionStorage, configurable: true, writable: true});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});
  Object.defineProperty(window, 'sessionStorage', {value: mockSessionStorage, configurable: true, writable: true});
}

function mockBeacon() {
  const fn = vi.fn(() => true);
  Object.defineProperty(navigator, 'sendBeacon', {value: fn, configurable: true, writable: true});
  return fn;
}

function setDoNotTrack(value: string | null) {
  Object.defineProperty(navigator, 'doNotTrack', {value, configurable: true, writable: true});
}

function giveConsent() {
  localStorage.setItem(CONSENT_KEY, '1');
}

async function loadModule() {
  vi.resetModules();
  const mod = await import('../siteEvents');
  return mod;
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setDoNotTrack(null);
  mockBeacon();
});

describe('siteEvents.trackSiteEvent + flushSiteEvents', () => {
  it('does not call sendBeacon before any flush trigger (queues in memory only)', async () => {
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    giveConsent();

    trackSiteEvent('page_view', {path: '/ru'});

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
    // Drain this instance's queue: its visibilitychange/pagehide listeners
    // stay bound to the shared jsdom document/window for the rest of this
    // file (module instances are never unmounted), so a queued-but-unflushed
    // event here would otherwise leak into a later, unrelated test.
    flushSiteEvents();
  });

  it('doNotTrack=1 — trackSiteEvent queues nothing, flush sends nothing', async () => {
    setDoNotTrack('1');
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    giveConsent();

    trackSiteEvent('page_view', {path: '/ru'});
    flushSiteEvents();

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('flush with an empty queue does not call sendBeacon', async () => {
    const {flushSiteEvents} = await loadModule();

    flushSiteEvents();

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('flush sends queued events as an application/json Blob to /api/events', async () => {
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    giveConsent();

    trackSiteEvent('page_view', {path: '/ru'});
    trackSiteEvent('product_view', {productId: 'wb-1'});
    flushSiteEvents();

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, body] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/events');
    expect(body).toBeInstanceOf(Blob);
    expect((body as Blob).type).toBe('application/json');
    const text = await (body as Blob).text();
    const parsed = JSON.parse(text);
    expect(parsed.events).toHaveLength(2);
    expect(parsed.events[0].eventType).toBe('page_view');
    expect(parsed.events[1].eventType).toBe('product_view');
    expect(parsed.events[1].productId).toBe('wb-1');
  });

  it('flush clears the queue — a second flush with nothing new sends nothing', async () => {
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    giveConsent();
    trackSiteEvent('page_view');

    flushSiteEvents();
    flushSiteEvents();

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('without consent, the event is still queued and flushed, but with no session key', async () => {
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    // No giveConsent() call — cookie notice not yet acknowledged.

    trackSiteEvent('page_view', {path: '/ru'});
    flushSiteEvents();

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const body = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][1] as Blob;
    const parsed = JSON.parse(await body.text());
    expect(parsed.events[0].sessionKey).toBeUndefined();
  });

  it('with consent, the same session key is reused across events and persisted in sessionStorage', async () => {
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    giveConsent();

    trackSiteEvent('page_view');
    trackSiteEvent('product_view', {productId: 'wb-2'});
    flushSiteEvents();

    const body = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][1] as Blob;
    const parsed = JSON.parse(await body.text());
    expect(parsed.events[0].sessionKey).toBeTruthy();
    expect(parsed.events[0].sessionKey).toBe(parsed.events[1].sessionKey);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(parsed.events[0].sessionKey);
  });

  it('chunks batches larger than 20 into multiple sendBeacon calls', async () => {
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    giveConsent();
    for (let i = 0; i < 25; i++) trackSiteEvent('page_view', {path: `/ru/${i}`});

    flushSiteEvents();

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(2);
    const firstBody = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0][1] as Blob;
    const secondBody = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[1][1] as Blob;
    expect(JSON.parse(await firstBody.text()).events).toHaveLength(20);
    expect(JSON.parse(await secondBody.text()).events).toHaveLength(5);
  });

  it('flushes automatically when the tab becomes hidden (visibilitychange)', async () => {
    const {trackSiteEvent} = await loadModule();
    giveConsent();
    trackSiteEvent('page_view');

    Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true});
    document.dispatchEvent(new Event('visibilitychange'));

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('does not flush when visibility changes to visible', async () => {
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    giveConsent();
    trackSiteEvent('page_view');

    Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true});
    document.dispatchEvent(new Event('visibilitychange'));

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
    flushSiteEvents(); // drain — see comment on the first test in this file
  });

  it('flushes on pagehide', async () => {
    const {trackSiteEvent} = await loadModule();
    giveConsent();
    trackSiteEvent('add_to_cart', {productId: 'wb-3'});

    window.dispatchEvent(new Event('pagehide'));

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('never throws when sendBeacon is unavailable', async () => {
    Object.defineProperty(navigator, 'sendBeacon', {value: undefined, configurable: true});
    const {trackSiteEvent, flushSiteEvents} = await loadModule();
    giveConsent();
    trackSiteEvent('page_view');

    expect(() => flushSiteEvents()).not.toThrow();
  });
});
