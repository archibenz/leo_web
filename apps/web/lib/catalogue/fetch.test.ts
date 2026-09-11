import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {STOREFRONT_FIXTURE} from './fixture';

// getStorefront держит последний удачный ответ в области модуля, поэтому каждый
// тест берёт свой экземпляр модуля — иначе снимок из одного теста подменял бы
// собой отказ в следующем, и «падает громко» проходило бы по ложной причине.
const loadGetStorefront = async () => (await import('./fetch')).getStorefront;

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getStorefront', () => {
  it('serves the fixture when the source is switched to it', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', 'fixture');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // toEqual, не toBe: свежий реестр модулей отдаёт фикстуре собственный объект.
    await expect((await loadGetStorefront())()).resolves.toEqual(STOREFRONT_FIXTURE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses the fixture in production rather than serving a demo catalogue to buyers', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', 'fixture');
    vi.stubEnv('NODE_ENV', 'production');

    await expect((await loadGetStorefront())()).rejects.toThrow(/not allowed in production/);
  });

  it('asks the API for the storefront and caches the answer under a tag', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const body = {products: [], sets: [], sections: []};
    const fetchSpy = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => body});
    vi.stubGlobal('fetch', fetchSpy);

    await expect((await loadGetStorefront())()).resolves.toEqual(body);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toMatch(/\/api\/catalog\/storefront$/);
    expect(init).toEqual({next: {revalidate: 600, tags: ['storefront']}});
  });

  it('fails loudly when the API refuses and there is nothing known good yet', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 503}));

    await expect((await loadGetStorefront())()).rejects.toThrow('storefront fetch failed: 503');
  });

  it('serves the last good catalogue when the API goes away, and says so once', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const body = {products: [], sets: [], sections: []};
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ok: true, status: 200, json: async () => body})
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchSpy);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const getStorefront = await loadGetStorefront();
    await expect(getStorefront()).resolves.toEqual(body);
    await expect(getStorefront()).resolves.toEqual(body);
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it('does not let the remembered catalogue override a fresher one', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const first = {products: [], sets: [], sections: []};
    const second = {products: [], sets: [], sections: [{slug: 'aw26-hero'}]};
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ok: true, status: 200, json: async () => first})
      .mockResolvedValueOnce({ok: true, status: 200, json: async () => second});
    vi.stubGlobal('fetch', fetchSpy);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const getStorefront = await loadGetStorefront();
    await expect(getStorefront()).resolves.toEqual(first);
    await expect(getStorefront()).resolves.toEqual(second);
    expect(logged).not.toHaveBeenCalled();
  });
});
