import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {STOREFRONT_FIXTURE} from './fixture';

// getStorefront держит последний удачный ответ в области модуля, поэтому каждый
// тест берёт свой экземпляр модуля — иначе снимок из одного теста подменял бы
// собой отказ в следующем, и «падает громко» проходило бы по ложной причине.
const loadGetStorefront = async () => (await import('./fetch')).getStorefront;
const loadPreview = async () => (await import('./fetch')).getStorefrontPreview;

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

// Предпросмотр черновика — отдельная дорога, и это требование этапа, а не
// удобство. Черновик это НАМЕРЕНИЕ: показать его протухшим хуже, чем не
// показать вовсе. Увидев старое, владелец либо сделает правку заново, либо —
// хуже — решит, что она применилась, и нажмёт «Опубликовать» вслепую.
describe('getStorefrontPreview', () => {
  it('asks the preview handle, never caches it and never tags it', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const body = {products: [], sets: [], sections: [{slug: 'aw26-hero', headlineRu: 'черновик'}]};
    const fetchSpy = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => body});
    vi.stubGlobal('fetch', fetchSpy);

    await expect((await loadPreview())('rl_session=abc')).resolves.toEqual({state: 'draft', storefront: body});
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toMatch(/\/api\/admin\/storefront\/preview$/);
    expect(init.cache).toBe('no-store');
    expect(init.next).toBeUndefined();
    expect(init.headers).toEqual({cookie: 'rl_session=abc'});
  });

  it('never falls back to the snapshot — a stale draft is worse than an honest failure', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const published = {products: [], sets: [], sections: [{slug: 'aw26-hero', headlineRu: 'опубликовано'}]};
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ok: true, status: 200, json: async () => published})
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchSpy);

    const mod = await import('./fetch');
    await expect(mod.getStorefront()).resolves.toEqual(published);
    const answer = await mod.getStorefrontPreview('rl_session=abc');
    expect(answer.state).toBe('unavailable');
    expect((answer as {storefront?: unknown}).storefront).toBeUndefined();
  });

  it('reads a refusal as "not an editor", not as an outage', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 403}));

    await expect((await loadPreview())('rl_session=abc')).resolves.toEqual({state: 'forbidden'});
  });

  it('leaves the published snapshot untouched, so a failed preview cannot poison the shop', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const draft = {products: [], sets: [], sections: [{slug: 'aw26-hero', headlineRu: 'черновик'}]};
    const published = {products: [], sets: [], sections: [{slug: 'aw26-hero', headlineRu: 'опубликовано'}]};
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ok: true, status: 200, json: async () => draft})
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    vi.stubGlobal('fetch', fetchSpy);
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    const mod = await import('./fetch');
    await expect(mod.getStorefrontPreview('rl_session=abc')).resolves.toEqual({state: 'draft', storefront: draft});
    // Снимка нет: публичное чтение падает, а не отдаёт черновик из памяти.
    await expect(mod.getStorefront()).rejects.toThrow();
    expect(published).toBeTruthy();
    expect(logged).not.toHaveBeenCalled();
  });
});
