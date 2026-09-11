import {describe, it, expect, afterEach, vi} from 'vitest';
import {STOREFRONT_FIXTURE} from './fixture';
import {getStorefront} from './fetch';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getStorefront', () => {
  it('serves the fixture when the source is switched to it', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', 'fixture');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await expect(getStorefront()).resolves.toBe(STOREFRONT_FIXTURE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('refuses the fixture in production rather than serving a demo catalogue to buyers', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', 'fixture');
    vi.stubEnv('NODE_ENV', 'production');

    await expect(getStorefront()).rejects.toThrow(/not allowed in production/);
  });

  it('asks the API for the storefront and caches the answer under a tag', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const body = {products: [], sets: [], sections: []};
    const fetchSpy = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => body});
    vi.stubGlobal('fetch', fetchSpy);

    await expect(getStorefront()).resolves.toEqual(body);
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toMatch(/\/api\/catalog\/storefront$/);
    expect(init).toEqual({next: {revalidate: 600, tags: ['storefront']}});
  });

  it('fails loudly when the API refuses, instead of rendering an empty shop', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: false, status: 503}));

    await expect(getStorefront()).rejects.toThrow('storefront fetch failed: 503');
  });
});
