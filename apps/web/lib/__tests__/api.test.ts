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

  it('degrades instead of throwing when localStorage is unavailable', () => {
    // Safari private mode / disabled storage raise SecurityError on any access.
    // A synchronous throw here would surface as an unhandled rejection in the
    // async resolveUser (useWhiteAuth). getToken must read as signed-out and
    // set/clear must be best-effort no-ops.
    const throwing = {
      get length(): number {
        throw new Error('SecurityError');
      },
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      },
      clear: () => {
        throw new Error('SecurityError');
      },
      key: () => {
        throw new Error('SecurityError');
      },
    };
    Object.defineProperty(globalThis, 'localStorage', {value: throwing, configurable: true, writable: true});
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'localStorage', {value: throwing, configurable: true, writable: true});
    }

    expect(() => getToken()).not.toThrow();
    expect(getToken()).toBeNull();
    expect(() => setToken('abc')).not.toThrow();
    expect(() => clearToken()).not.toThrow();
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

  it('keeps the replacement session when an old request returns 401', async () => {
    const onUnauthorized = vi.fn(() => clearToken());
    setUnauthorizedHandler(onUnauthorized);
    setToken('old-token');
    let respond!: (response: FakeResponse) => void;
    mockFetch.mockImplementation(() => new Promise<FakeResponse>((resolve) => {respond = resolve;}));
    const pending = apiFetch('/api/me/orders');
    setToken('replacement-token');
    respond(res({}, {status: 401}));

    await expect(pending).rejects.toMatchObject({status: 401});
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(getToken()).toBe('replacement-token');
  });

  it('does not expire the browser session for a separate authorization header', async () => {
    const onUnauthorized = vi.fn(() => clearToken());
    setUnauthorizedHandler(onUnauthorized);
    setToken('session-token');
    mockFetch.mockResolvedValue(res({}, {status: 401}));

    await expect(apiFetch('/api/auth/telegram/poll', {headers: {Authorization: 'Bearer challenge-token'}}))
      .rejects.toMatchObject({status: 401});
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(getToken()).toBe('session-token');
  });

  it('preserves Retry-After so auth retries can wait for the server', async () => {
    mockFetch.mockResolvedValue({...res({}, {status: 429}), headers: new Headers({'Retry-After': '60'})});

    await expect(apiFetch('/api/auth/me', {skipAuthHandler: true}))
      .rejects.toMatchObject({status: 429, retryAfter: '60'});
  });

  it.each(['login', 'register', 'telegram/poll', 'telegram/exchange'])('waits for a pending %s cookie response before clearing it', async (endpoint) => {
    let respond!: (response: FakeResponse) => void;
    mockFetch.mockImplementation((url: string) => url.endsWith('/api/auth/logout') ?
      Promise.resolve(res(null, {status: 204})) : new Promise<FakeResponse>((resolve) => {respond = resolve;}));
    const auth = apiFetch(`/api/auth/${endpoint}`, {method: endpoint.startsWith('telegram/') ? 'GET' : 'POST', skipAuthHandler: true}).catch(() => undefined);
    const logout = apiFetch<void>('/api/auth/logout', {method: 'POST', skipAuthHandler: true});
    await Promise.resolve();
    const callsBeforeResponse = mockFetch.mock.calls.length;
    respond(res({token: 'late-token'}));
    await Promise.all([auth, logout]);

    expect(callsBeforeResponse).toBe(1);
    expect(mockFetch.mock.calls.map(([url]) => url)).toEqual([`/api/auth/${endpoint}`, '/api/auth/logout']);
  });

  it('still clears the cookie if the pending login request fails', async () => {
    let reject!: (error: Error) => void;
    mockFetch.mockImplementation((url: string) => url.endsWith('/api/auth/logout') ?
      Promise.resolve(res(null, {status: 204})) : new Promise<FakeResponse>((_, no) => {reject = no;}));
    const login = apiFetch('/api/auth/login', {method: 'POST'}).catch(() => undefined);
    const logout = apiFetch<void>('/api/auth/logout', {method: 'POST', skipAuthHandler: true});
    await Promise.resolve();
    const callsBeforeFailure = mockFetch.mock.calls.length;
    reject(new TypeError('offline'));
    await Promise.all([login, logout]);

    expect(callsBeforeFailure).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('fails closed after 15s of pending auth headers and clears the cookie on explicit retry', async () => {
    vi.useFakeTimers();
    try {
      let respond!: (response: FakeResponse) => void;
      mockFetch.mockImplementation((url: string) => url.endsWith('/api/auth/logout') ?
        Promise.resolve(res(null, {status: 204})) : new Promise<FakeResponse>((resolve) => {respond = resolve;}));
      const login = apiFetch('/api/auth/login', {method: 'POST'}).catch((error: Error) => error);
      let finished = false;
      const logout = apiFetch<void>('/api/auth/logout', {method: 'POST', skipAuthHandler: true})
        .catch((error: Error) => {finished = true; return error;});

      await vi.advanceTimersByTimeAsync(14_999);
      expect(finished).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(finished).toBe(true);
      expect(await logout).toMatchObject({message: 'Authentication response is still pending'});
      expect(mockFetch).toHaveBeenCalledTimes(1);

      respond(res({token: 'late-token'}));
      expect(await login).toMatchObject({message: 'Authentication request superseded'});
      await apiFetch<void>('/api/auth/logout', {method: 'POST', skipAuthHandler: true});
      expect(mockFetch.mock.calls.map(([url]) => url)).toEqual(['/api/auth/login', '/api/auth/logout']);
      expect(getToken()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(['login', 'register', 'telegram/poll', 'telegram/exchange'])('rejects a late %s response body after logout', async (endpoint) => {
    let body!: (value: unknown) => void;
    const pendingBody = new Promise<unknown>((resolve) => {body = resolve;});
    mockFetch.mockImplementation((url: string) => Promise.resolve(url.endsWith('/api/auth/logout') ?
      res(null, {status: 204}) : {ok: true, status: 200, json: () => pendingBody}));
    const pending = apiFetch(`/api/auth/${endpoint}`, {method: endpoint.startsWith('telegram/') ? 'GET' : 'POST', skipAuthHandler: true});
    await apiFetch<void>('/api/auth/logout', {method: 'POST', skipAuthHandler: true});
    body({token: 'late-token'});

    await expect(pending).rejects.toThrow('Authentication request superseded');
    expect(getToken()).toBeNull();
  });

  it.each(['login', 'register', 'telegram/poll', 'telegram/exchange'])('refuses a late %s body after another tab completes cookie-only logout', async endpoint => {
    let body!: (value: unknown) => void;
    mockFetch.mockResolvedValue({ok: true, status: 200, json: () => new Promise(resolve => {body = resolve;})});
    const pending = apiFetch(`/api/auth/${endpoint}`, {skipAuthHandler: true});
    await Promise.resolve();
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'reinasleo_logout', newValue: JSON.stringify({phase: 'complete', nonce: 'another-tab'}),
    }));
    body({token: 'late-token'});
    await expect(pending).rejects.toThrow('Authentication request superseded');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(getToken()).toBeNull();
  });

  it('keeps a replacement session even when it happens to reuse the same JWT', async () => {
    const onUnauthorized = vi.fn(() => clearToken());
    setUnauthorizedHandler(onUnauthorized);
    setToken('same-token');
    let respond!: (response: FakeResponse) => void;
    mockFetch.mockImplementation(() => new Promise<FakeResponse>((resolve) => {respond = resolve;}));
    const old = apiFetch('/api/me/orders');
    clearToken();
    setToken('same-token');
    respond(res({}, {status: 401}));

    await expect(old).rejects.toMatchObject({status: 401});
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(getToken()).toBe('same-token');
  });
});
