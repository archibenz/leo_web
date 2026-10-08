import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {ReactNode} from 'react';
import {AuthProvider, useAuth} from '../AuthContext';

const mocks = vi.hoisted(() => ({apiFetch: vi.fn(), cookieMe: vi.fn(), unauthorized: null as (() => void) | null}));
vi.mock('../../lib/api', () => ({
  apiFetch: (path: string, options: {skipBearer?: boolean}) => options?.skipBearer ? mocks.cookieMe(path, options) : mocks.apiFetch(path, options),
  getToken: () => localStorage.getItem('reinasleo_token'),
  setToken: (token: string) => localStorage.setItem('reinasleo_token', token),
  clearToken: () => localStorage.removeItem('reinasleo_token'),
  setUnauthorizedHandler: (handler: (() => void) | null) => { mocks.unauthorized = handler; },
}));
vi.mock('../../lib/toast', () => ({showToast: vi.fn()}));

const TOKEN_KEY = 'reinasleo_token';
const tokenStore = new Map<string, string>();
const storage = {
  getItem: (key: string) => tokenStore.get(key) ?? null,
  setItem: (key: string, value: string) => { tokenStore.set(key, value); },
  removeItem: (key: string) => { tokenStore.delete(key); },
  clear: () => tokenStore.clear(),
};
const admin = {id: 'a', email: 'admin@example.test', name: 'Admin fixture', role: 'admin', createdAt: '2026-10-03'};
const buyer = {...admin, id: 'b', role: 'user', name: 'Buyer fixture'};
const loginResponse = {...admin, token: 'new-token'};
const registerData = {
  email: 'buyer@example.test', code: '123456', firstName: 'Buyer', surname: 'Fixture',
  password: 'Testpass1', newsletter: false, newsletterPromos: false,
  newsletterCollections: false, newsletterProjects: false, privacyAccepted: true,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return {promise, resolve, reject};
}

function wrapper({children}: {children: ReactNode}) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function settle() {
  await act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
}

async function storageToken(token: string | null) {
  const oldValue = localStorage.getItem(TOKEN_KEY);
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  await act(async () => {
    const event = new Event('storage');
    Object.assign(event, {key: TOKEN_KEY, oldValue, newValue: token, storageArea: localStorage});
    window.dispatchEvent(event);
  });
  await settle();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('localStorage', storage);
  mocks.apiFetch.mockReset();
  mocks.cookieMe.mockReset().mockRejectedValue({status: 403});
  mocks.unauthorized = null;
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('admin session verification and recovery', () => {
  it('checks an anonymous cookie once without a bearer', async () => {
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
    expect(mocks.cookieMe).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.authError).toBe(false);
  });

  it.each([429, 502, 'network'])('restore preserves an unverified token after %s and recovers manually', async status => {
    localStorage.setItem(TOKEN_KEY, 'fixture-token');
    const error = status === 'network' ? new TypeError('Network unavailable') : {status};
    mocks.apiFetch.mockRejectedValueOnce(error).mockResolvedValueOnce(admin);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fixture-token');
    expect(result.current.authError).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    await act(async () => { await result.current.retryAuth(); });
    expect(result.current.user?.id).toBe('a');
    expect(result.current.authError).toBe(false);
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
  });

  it('recovers automatically without another login and respects Retry-After', async () => {
    localStorage.setItem(TOKEN_KEY, 'fixture-token');
    mocks.apiFetch.mockRejectedValueOnce({status: 429, retryAfter: '2'}).mockResolvedValueOnce(admin);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await act(async () => { await vi.advanceTimersByTimeAsync(1999); });
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    expect(result.current.isAdmin).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
    expect(result.current.isAdmin).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fixture-token');
  });

  it('bounds automatic retries to two and keeps manual recovery available', async () => {
    localStorage.setItem(TOKEN_KEY, 'fixture-token');
    mocks.apiFetch.mockRejectedValue({status: 503});
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(mocks.apiFetch).toHaveBeenCalledTimes(3);
    expect(result.current.authError).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fixture-token');
    mocks.apiFetch.mockResolvedValueOnce(buyer);
    await act(async () => { await result.current.retryAuth(); });
    expect(result.current.user?.id).toBe('b');
    expect(result.current.isAdmin).toBe(false);
  });

  it.each([401, 403])('invalid /me status %s clears the current token without retry', async status => {
    localStorage.setItem(TOKEN_KEY, 'fixture-token');
    mocks.apiFetch.mockRejectedValue({status});
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(result.current.authError).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
  });

  it('storage token replacement is unverified after a temporary failure, then recovers', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token');
    mocks.apiFetch.mockResolvedValueOnce(admin).mockRejectedValueOnce({status: 429}).mockResolvedValueOnce(buyer);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    expect(result.current.isAdmin).toBe(true);
    await storageToken('b-token');
    expect(localStorage.getItem(TOKEN_KEY)).toBe('b-token');
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    await act(async () => { await result.current.retryAuth(); });
    expect(result.current.user?.id).toBe('b');
  });

  it('loginWithToken keeps its token on a temporary /me failure without trusting a role', async () => {
    mocks.apiFetch.mockRejectedValueOnce({status: 502}).mockResolvedValueOnce(admin);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await act(async () => { await result.current.loginWithToken('new-token').catch(() => {}); });
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.authError).toBe(true);
    await act(async () => { await result.current.retryAuth(); });
    expect(result.current.isAdmin).toBe(true);
  });

  it.each(['login', 'register'] as const)('%s never trusts the response role when follow-up /me is unavailable', async action => {
    mocks.apiFetch.mockResolvedValueOnce(loginResponse).mockRejectedValueOnce({status: 502});
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await act(async () => {
      if (action === 'login') await result.current.login('admin@example.test', 'Testpass1');
      else await result.current.register(registerData);
    });
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new-token');
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toBe(true);
  });

  it('unmount cancels a scheduled retry', async () => {
    localStorage.setItem(TOKEN_KEY, 'fixture-token');
    mocks.apiFetch.mockRejectedValue({status: 502});
    const {unmount} = renderHook(useAuth, {wrapper});
    await settle();
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
  });
});

async function remoteLogout(phase: string) {
  await act(async () => {
    const event = new Event('storage');
    Object.assign(event, {key: 'reinasleo_logout', newValue: JSON.stringify({phase, nonce: 'another-tab'})});
    window.dispatchEvent(event);
  });
}

describe('cookie-only restoration', () => {
  it('orphaned pending logout becomes retryable failure after 15s while protected state remains closed', async () => {
    mocks.cookieMe.mockResolvedValue(admin);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await remoteLogout('pending');
    await act(async () => {await vi.advanceTimersByTimeAsync(15_000);});
    expect(result.current.isLoggingOut).toBe(false);
    expect(result.current.logoutError).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.user).toBeNull();
    await act(async () => {await result.current.retryAuth();});
    expect(mocks.cookieMe).toHaveBeenCalledTimes(1);
    await act(async () => {await result.current.logout();});
    expect(result.current.logoutError).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it('another cookie-only tab blocks protected state during logout, preserves failure and invalidates on completion', async () => {
    mocks.cookieMe.mockResolvedValue(admin);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    expect(result.current.isAdmin).toBe(true);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await remoteLogout('pending');
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggingOut).toBe(true);
    await act(async () => {await result.current.retryAuth();});
    expect(mocks.cookieMe).toHaveBeenCalledTimes(1);
    await remoteLogout('failed');
    expect(result.current.logoutError).toBe(true);
    await act(async () => {await result.current.retryAuth();});
    expect(mocks.cookieMe).toHaveBeenCalledTimes(1);
    await remoteLogout('complete');
    expect(result.current.logoutError).toBe(false);
    expect(result.current.isLoggingOut).toBe(false);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mocks.cookieMe).toHaveBeenCalledTimes(1);
    mocks.cookieMe.mockResolvedValue(buyer);
    await act(async () => {await result.current.loginWithToken('new-login');});
    expect(result.current.user?.id).toBe('b');
  });

  it('another tab completion invalidates a pending cookie result without a bearer event', async () => {
    const pending = deferred<typeof admin>();
    mocks.cookieMe.mockReturnValue(pending.promise);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await remoteLogout('pending');
    await remoteLogout('complete');
    await act(async () => {pending.resolve(admin);});
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('restores the server cookie even when localStorage has no token', async () => {
    mocks.cookieMe.mockResolvedValue(admin);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    expect(result.current.user?.id).toBe('a');
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it('retires an old admin bearer after the cookie identifies the current buyer', async () => {
    localStorage.setItem(TOKEN_KEY, 'old-admin-token');
    mocks.cookieMe.mockResolvedValue(buyer);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(result.current.user?.id).toBe('b');
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it.each([429, 503, 'network'])('cookie-only verification %s has explicit recovery and no authenticated role', async status => {
    mocks.cookieMe.mockRejectedValueOnce(status === 'network' ? new TypeError('offline') : {status}).mockResolvedValueOnce(admin);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    expect(result.current.authError).toBe(true);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    await act(async () => {await result.current.retryAuth();});
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.authError).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mocks.apiFetch).not.toHaveBeenCalled();
  });

  it('late cookie verification cannot resurrect the user after server logout', async () => {
    const pending = deferred<typeof admin>();
    mocks.cookieMe.mockReturnValue(pending.promise);
    mocks.apiFetch.mockResolvedValue(undefined);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await act(async () => {await result.current.logout();});
    await act(async () => {pending.resolve(admin);});
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('session request generations', () => {
  it('late /me success cannot resurrect a logged-out admin while logout waits', async () => {
    localStorage.setItem(TOKEN_KEY, 'fixture-token');
    const me = deferred<typeof admin>();
    const exit = deferred<void>();
    mocks.apiFetch.mockReturnValueOnce(me.promise).mockReturnValueOnce(exit.promise);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    let loggingOut!: Promise<{success: boolean}>;
    act(() => { loggingOut = result.current.logout(); });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isLoggingOut).toBe(true);
    await act(async () => { me.resolve(admin); });
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    await act(async () => { exit.resolve(); await loggingOut; });
    expect(result.current.user).toBeNull();
  });

  it('storage logout invalidates an outstanding /me response', async () => {
    localStorage.setItem(TOKEN_KEY, 'fixture-token');
    const me = deferred<typeof admin>();
    mocks.apiFetch.mockReturnValueOnce(me.promise);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await storageToken(null);
    await act(async () => { me.resolve(admin); });
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('old 401 and finally cannot clear a replacement token or finish its pending request', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token');
    const oldMe = deferred<typeof admin>();
    const newMe = deferred<typeof buyer>();
    mocks.apiFetch.mockReturnValueOnce(oldMe.promise).mockReturnValueOnce(newMe.promise);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    let replacement!: Promise<void>;
    act(() => { replacement = result.current.loginWithToken('b-token'); });
    await act(async () => { oldMe.reject({status: 401}); });
    expect(localStorage.getItem(TOKEN_KEY)).toBe('b-token');
    expect(result.current.isLoading).toBe(true);
    await act(async () => { newMe.resolve(buyer); await replacement; });
    expect(result.current.user?.id).toBe('b');
    expect(result.current.isLoading).toBe(false);
  });

  it('old 200 cannot replace the verified new user', async () => {
    localStorage.setItem(TOKEN_KEY, 'a-token');
    const oldMe = deferred<typeof admin>();
    mocks.apiFetch.mockReturnValueOnce(oldMe.promise).mockResolvedValueOnce(buyer);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    await act(async () => { await result.current.loginWithToken('b-token'); });
    await act(async () => { oldMe.resolve(admin); });
    expect(result.current.user?.id).toBe('b');
    expect(result.current.isAdmin).toBe(false);
  });

  it('a delayed login response does not replace a session after logout', async () => {
    const response = deferred<typeof loginResponse>();
    mocks.apiFetch.mockReturnValueOnce(response.promise).mockResolvedValueOnce(undefined);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    let login!: ReturnType<typeof result.current.login>;
    act(() => { login = result.current.login('admin@example.test', 'Testpass1'); });
    await act(async () => { await result.current.logout(); });
    await act(async () => { response.resolve(loginResponse); await login; });
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(result.current.user).toBeNull();
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
  });
});

describe('server logout outcome', () => {
  it.each(['login', 'register', 'token'])('failed logout remains visible when subsequent %s authentication is rejected', async method => {
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    mocks.apiFetch.mockRejectedValue({status: 401});
    await act(async () => {await result.current.logout();});
    expect(result.current.logoutError).toBe(true);
    await act(async () => {
      if (method === 'login') await result.current.login('admin@example.test', 'Testpass1');
      else if (method === 'register') await result.current.register(registerData);
      else await result.current.loginWithToken('refused-token').catch(() => {});
    });
    expect(result.current.logoutError).toBe(true);
    expect(result.current.isAdmin).toBe(false);
  });

  it('an invalid cross-tab token cannot hide refused cookie clearing, and verification waits for confirmed retry', async () => {
    const exit = deferred<void>();
    let logouts = 0;
    mocks.apiFetch.mockImplementation((path: string) => {
      if (path === '/api/auth/me') return Promise.reject({status: 403});
      logouts += 1;
      return logouts === 1 ? exit.promise : Promise.resolve(undefined);
    });
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    let pending!: Promise<{success: boolean}>;
    act(() => { pending = result.current.logout(); });
    await storageToken('invalid-replacement');
    await act(async () => { exit.reject({status: 502}); await pending; });
    expect(result.current.logoutError).toBe(true);
    expect(result.current.isLoggingOut).toBe(false);
    expect(result.current.user).toBeNull();
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('invalid-replacement');
    let retried!: {success: boolean};
    await act(async () => { retried = await result.current.logout(); });
    expect(retried).toEqual({success: true});
    expect(result.current.logoutError).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mocks.apiFetch.mock.calls.map(call => call[0])).toEqual(['/api/auth/logout', '/api/auth/logout']);
  });

  it('a concurrent storage logout does not hide a cookie-clearing failure or leave a spinner', async () => {
    const exit = deferred<void>();
    mocks.apiFetch.mockReturnValueOnce(exit.promise);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    let pending!: Promise<{success: boolean}>;
    act(() => { pending = result.current.logout(); });
    await storageToken(null);
    await act(async () => { exit.reject({status: 502}); await pending; });
    expect(result.current.logoutError).toBe(true);
    expect(result.current.isLoggingOut).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('waits for a pending server logout before verifying a replacement token from another tab', async () => {
    const exit = deferred<void>();
    mocks.apiFetch.mockReturnValueOnce(exit.promise).mockResolvedValueOnce(buyer);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    let pending!: Promise<{success: boolean}>;
    act(() => { pending = result.current.logout(); });
    await storageToken('b-token');
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    expect(result.current.isLoggingOut).toBe(true);
    await act(async () => { exit.resolve(); await pending; });
    expect(result.current.isLoggingOut).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBe('b-token');
    expect(result.current.user?.id).toBe('b');
    expect(result.current.isAdmin).toBe(false);
  });

  it.each([429, 502, 'network'])('discloses failed cookie clearing after %s and permits retry', async status => {
    localStorage.setItem(TOKEN_KEY, 'fixture-token');
    const error = status === 'network' ? new TypeError('Network unavailable') : {status};
    mocks.apiFetch.mockResolvedValueOnce(admin).mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    let outcome!: {success: boolean};
    await act(async () => { outcome = await result.current.logout(); });
    expect(outcome).toEqual({success: false});
    expect(result.current.logoutError).toBe(true);
    expect(result.current.isLoggingOut).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    await act(async () => { outcome = await result.current.logout(); });
    expect(outcome).toEqual({success: true});
    expect(result.current.logoutError).toBe(false);
    expect(mocks.apiFetch.mock.calls.slice(1).map(call => call[0])).toEqual(['/api/auth/logout', '/api/auth/logout']);
  });

  it('deduplicates repeated logout while the server request is pending', async () => {
    const exit = deferred<void>();
    mocks.apiFetch.mockReturnValueOnce(exit.promise);
    const {result} = renderHook(useAuth, {wrapper});
    await settle();
    let first!: Promise<{success: boolean}>;
    let second!: Promise<{success: boolean}>;
    act(() => { first = result.current.logout(); second = result.current.logout(); });
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    await act(async () => { exit.resolve(); await Promise.all([first, second]); });
    expect(result.current.isLoggingOut).toBe(false);
  });
});
