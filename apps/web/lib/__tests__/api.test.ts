import {describe, it, expect, vi, beforeEach} from 'vitest';
import {apiFetch, getToken, setToken, clearToken, setUnauthorizedHandler} from '../api';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  const mock = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  };
  Object.defineProperty(globalThis, 'localStorage', {value: mock, configurable: true, writable: true});
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', {value: mock, configurable: true, writable: true});
  }
}

const mockFetch = vi.fn();

type FakeResponse = {ok: boolean; status: number; json: () => Promise<unknown>};
function res(body: unknown, init: {ok?: boolean; status?: number} = {}): FakeResponse {
  const status = init.status ?? 200;
  return {ok: init.ok ?? (status >= 200 && status < 300), status, json: async () => body};
}
function lastInit() {
  return mockFetch.mock.calls[0]?.[1] as RequestInit & {headers: Record<string, string>};
}

beforeEach(() => {
  installLocalStorageMock();
  global.fetch = mockFetch as unknown as typeof fetch;
  mockFetch.mockReset();
  setUnauthorizedHandler(null);
});

describe('token helpers', () => {
  it('round-trips set/get/clear', () => {
    expect(getToken()).toBeNull();
    setToken('abc');
    expect(getToken()).toBe('abc');
    clearToken();
    expect(getToken()).toBeNull();
  });
});

describe('apiFetch', () => {
  it('returns parsed JSON on 200 and sends credentials', async () => {
    mockFetch.mockResolvedValue(res({id: 1, name: 'x'}));
    const data = await apiFetch<{id: number; name: string}>('/api/thing');
    expect(data).toEqual({id: 1, name: 'x'});
    expect(lastInit().credentials).toBe('include');
    expect(lastInit().headers['Content-Type']).toBe('application/json');
  });

  it('returns undefined on 204 without reading the body', async () => {
    const json = vi.fn(async () => {
      throw new Error('should not be called');
    });
    mockFetch.mockResolvedValue({ok: true, status: 204, json});
    const data = await apiFetch<void>('/api/cart/item', {method: 'DELETE'});
    expect(data).toBeUndefined();
    expect(json).not.toHaveBeenCalled();
  });

  it('adds Authorization from the stored token', async () => {
    setToken('tok123');
    mockFetch.mockResolvedValue(res({}));
    await apiFetch('/api/auth/me');
    expect(lastInit().headers['Authorization']).toBe('Bearer tok123');
  });

  it('does not add Authorization when there is no token', async () => {
    mockFetch.mockResolvedValue(res({}));
    await apiFetch('/api/lookbook');
    expect(lastInit().headers['Authorization']).toBeUndefined();
  });

  it('does not overwrite a caller-supplied Authorization header', async () => {
    setToken('tok123');
    mockFetch.mockResolvedValue(res({}));
    await apiFetch('/api/thing', {headers: {Authorization: 'Bearer custom'}});
    expect(lastInit().headers['Authorization']).toBe('Bearer custom');
  });

  it('throws an enriched error (message/status/body) on a 4xx with a JSON envelope', async () => {
    mockFetch.mockResolvedValue(res({message: 'Bad input'}, {status: 400}));
    await expect(apiFetch('/api/contact')).rejects.toMatchObject({
      message: 'Bad input',
      status: 400,
      body: {message: 'Bad input'},
    });
  });

  it('falls back to "API error <status>" when the error body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });
    await expect(apiFetch('/api/thing')).rejects.toMatchObject({
      message: 'API error 500',
      status: 500,
    });
  });

  it('invokes the unauthorized handler on 401 and still throws', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockFetch.mockResolvedValue(res({message: 'nope'}, {status: 401}));
    await expect(apiFetch('/api/auth/me')).rejects.toMatchObject({status: 401});
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('skips the unauthorized handler when skipAuthHandler is set', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockFetch.mockResolvedValue(res({}, {status: 401}));
    await expect(apiFetch('/api/auth/me', {skipAuthHandler: true})).rejects.toMatchObject({status: 401});
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
