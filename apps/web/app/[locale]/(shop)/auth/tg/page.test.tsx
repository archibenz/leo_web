import {StrictMode} from 'react';
import {act, render, screen, cleanup, waitFor, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const BAD_TOKEN = 'negodnyy';
const GOOD_TOKEN = 'a'.repeat(32);
const NEXT_TOKEN = 'b'.repeat(32);
const owner = {id: '1', email: null, name: 'A', role: 'user'};
const push = vi.fn();
const replace = vi.fn();
const router = {push, replace};
let searchParams = new URLSearchParams();
const session = {token: null as string | null, user: null as typeof owner | null};
const apiFetch = vi.fn();
const setToken = vi.fn((value: string) => {session.token = value;});
let actualApi: typeof import('../../../../../lib/api') | null = null;

vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'ru',
  useTranslations: (namespace: string) => (key: string) => namespace + '.' + key,
}));

vi.mock('../../../../../lib/api', () => ({
  apiFetch: (path: string, options?: RequestInit) => actualApi ? actualApi.apiFetch(path, options) : apiFetch(path, options),
  getToken: () => actualApi ? actualApi.getToken() : session.token,
  setToken: (value: string) => {setToken(value); actualApi?.setToken(value);},
  clearToken: () => {session.token = null; actualApi?.clearToken();},
}));

let TelegramAuthPage: typeof import('./page').default;
let auth: typeof import('../../../../../hooks/useWhiteAuth');

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}

function exchangeCalls() {
  return apiFetch.mock.calls.filter(([path]) => path === '/api/auth/telegram/exchange');
}

beforeEach(async () => {
  vi.resetModules();
  actualApi = null;
  push.mockReset();
  replace.mockReset();
  setToken.mockClear();
  session.token = null;
  session.user = null;
  searchParams = new URLSearchParams({token: GOOD_TOKEN});
  apiFetch.mockReset().mockImplementation(async (path: string) => {
    if (path === '/api/auth/telegram/exchange') {
      session.user = owner;
      return {...owner, token: 'jwt-xyz'};
    }
    if (path === '/api/auth/me') {
      if (session.user) return session.user;
      throw {status: 403};
    }
    if (path === '/api/auth/logout') {
      session.user = null;
      return;
    }
    throw new Error('Unexpected request: ' + path);
  });
  ({default: TelegramAuthPage} = await import('./page'));
  auth = await import('../../../../../hooks/useWhiteAuth');
});

afterEach(() => {cleanup(); vi.useRealTimers(); vi.unstubAllGlobals();});

describe('TelegramAuthPage', () => {
  it('rejects malformed tokens with the white expired card before exchange', async () => {
    searchParams = new URLSearchParams({token: BAD_TOKEN});
    const {container} = render(<TelegramAuthPage />);

    expect(await screen.findByText('auth.tg.expired.title')).toBeInTheDocument();
    expect(screen.getByText('auth.tg.expired.description')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'auth.tg.expired.cta'})).toBeInTheDocument();
    expect(exchangeCalls()).toHaveLength(0);
    expect(container.querySelector('.paper-card, .lux-btn-primary, .text-ink-soft')).toBeNull();
  });

  it('sends the expired-card CTA to the account page', async () => {
    searchParams = new URLSearchParams({token: BAD_TOKEN});
    const user = userEvent.setup();
    render(<TelegramAuthPage />);

    await user.click(await screen.findByRole('button', {name: 'auth.tg.expired.cta'}));
    expect(push).toHaveBeenCalledWith('/ru/account');
  });

  it('adopts a successful exchange and redirects only after the matching account resolves', async () => {
    render(<TelegramAuthPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/ru/account'));
    expect(setToken).toHaveBeenCalledWith('jwt-xyz');
    expect(exchangeCalls()).toHaveLength(1);
  });

  it('recovers from a temporary /me failure without consuming the link again', async () => {
    vi.useFakeTimers();
    let failed = false;
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation(async (path: string, options?: unknown) => {
      if (path === '/api/auth/me' && session.user && !failed) {
        failed = true;
        throw {status: 429, retryAfter: '2'};
      }
      return handler(path, options);
    });
    render(<TelegramAuthPage />);
    await act(async () => {});

    expect(screen.getByText('auth.tg.unavailable.title')).toBeInTheDocument();
    expect(screen.queryByText('auth.tg.expired.title')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    expect(session.token).toBe('jwt-xyz');
    expect(exchangeCalls()).toHaveLength(1);
    await act(async () => {await vi.advanceTimersByTimeAsync(1_999);});
    expect(replace).not.toHaveBeenCalled();
    await act(async () => {await vi.advanceTimersByTimeAsync(1);});
    expect(replace).toHaveBeenCalledWith('/ru/account');
    expect(exchangeCalls()).toHaveLength(1);
  });

  it('shares one pending exchange through StrictMode replay and a remount', async () => {
    const pending = deferred<typeof owner & {token: string}>();
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: unknown) => path === '/api/auth/telegram/exchange'
      ? pending.promise : handler(path, options));
    const first = render(<StrictMode><TelegramAuthPage /></StrictMode>);
    await act(async () => {});
    first.unmount();
    render(<StrictMode><TelegramAuthPage /></StrictMode>);
    await act(async () => {});
    expect(exchangeCalls()).toHaveLength(1);

    await act(async () => {session.user = owner; pending.resolve({...owner, token: 'jwt-xyz'});});
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(setToken).toHaveBeenCalledTimes(1);
    expect(exchangeCalls()).toHaveLength(1);
  });

  it('does not adopt or redirect from an old token response after a newer callback wins', async () => {
    const old = deferred<typeof owner & {token: string}>();
    const next = deferred<typeof owner & {token: string}>();
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: {headers?: {Authorization?: string}}) => {
      if (path !== '/api/auth/telegram/exchange') return handler(path, options);
      return options?.headers?.Authorization === 'Bearer ' + GOOD_TOKEN ? old.promise : next.promise;
    });
    const view = render(<TelegramAuthPage />);
    await act(async () => {});
    searchParams = new URLSearchParams({token: NEXT_TOKEN});
    view.rerender(<TelegramAuthPage />);
    await act(async () => {});
    await act(async () => {session.user = owner; next.resolve({...owner, token: 'jwt-new'});});
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    await act(async () => {old.resolve({...owner, token: 'jwt-old'});});

    expect(setToken.mock.calls).toEqual([['jwt-new']]);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('auth.tg.expired.title')).toBeNull();
  });

  it('does not adopt a late exchange after the callback unmounts', async () => {
    const pending = deferred<typeof owner & {token: string}>();
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: unknown) => path === '/api/auth/telegram/exchange'
      ? pending.promise : handler(path, options));
    const view = render(<TelegramAuthPage />);
    await act(async () => {});
    view.unmount();
    await act(async () => {pending.resolve({...owner, token: 'jwt-late'});});

    expect(setToken).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not reuse a completed callback to sign in again after logout', async () => {
    const first = render(<TelegramAuthPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    await act(async () => {await auth.whiteLogout();});
    first.unmount();
    replace.mockClear();
    render(<TelegramAuthPage />);
    await screen.findByText('auth.tg.unavailable.title');

    expect(replace).not.toHaveBeenCalled();
    expect(setToken).toHaveBeenCalledTimes(1);
    expect(exchangeCalls()).toHaveLength(1);
  });

  it.each([400, 404, 410])('keeps genuine invalid/expired exchange %i on the expired card', async (status) => {
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: unknown) => path === '/api/auth/telegram/exchange'
      ? Promise.reject({status}) : handler(path, options));
    render(<TelegramAuthPage />);

    expect(await screen.findByText('auth.tg.expired.title')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not describe an exchange service failure as an expired link', async () => {
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: unknown) => path === '/api/auth/telegram/exchange'
      ? Promise.reject({status: 502}) : handler(path, options));
    render(<TelegramAuthPage />);

    expect(await screen.findByText('auth.tg.unavailable.title')).toBeInTheDocument();
    expect(screen.queryByText('auth.tg.expired.title')).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it('lets the user retry session verification without another exchange', async () => {
    let recovered = false;
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: unknown) => {
      if (path === '/api/auth/me' && session.user && !recovered) {
        return Promise.reject({status: 502, retryAfter: '2147483648'});
      }
      return handler(path, options);
    });
    const user = userEvent.setup();
    render(<TelegramAuthPage />);
    const retry = await screen.findByRole('button', {name: 'auth.tg.unavailable.retry'});
    recovered = true;
    await user.click(retry);

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/ru/account'));
    expect(exchangeCalls()).toHaveLength(1);
    expect(screen.queryByRole('button', {name: 'auth.tg.unavailable.retryExchange'})).toBeNull();
  });

  it.each([
    ['502', {status: 502}, 1_000],
    ['429', {status: 429, retryAfter: '2'}, 2_000],
    ['network', new TypeError('Failed to fetch'), 1_000],
  ])('manually retries a recoverable exchange %s once and succeeds', async (_label, error, delay) => {
    vi.useFakeTimers();
    let requests = 0;
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: unknown) => {
      if (path === '/api/auth/telegram/exchange' && ++requests === 1) return Promise.reject(error);
      return handler(path, options);
    });
    render(<TelegramAuthPage />);
    await act(async () => {});
    const retry = screen.getByRole('button', {name: 'auth.tg.unavailable.retryExchange'});
    expect(retry).toBeDisabled();
    await act(async () => {await vi.advanceTimersByTimeAsync(delay - 1);});
    expect(retry).toBeDisabled();
    await act(async () => {await vi.advanceTimersByTimeAsync(1);});
    expect(retry).toBeEnabled();
    await act(async () => {await vi.advanceTimersByTimeAsync(5_000);});
    expect(exchangeCalls()).toHaveLength(1);
    await act(async () => {fireEvent.click(retry);});

    expect(replace).toHaveBeenCalledWith('/ru/account');
    expect(exchangeCalls()).toHaveLength(2);
    expect(setToken).toHaveBeenCalledTimes(1);
  });

  it('exhausts the exchange retry budget across remounts without automatic replay', async () => {
    vi.useFakeTimers();
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: unknown) => path === '/api/auth/telegram/exchange'
      ? Promise.reject({status: 502}) : handler(path, options));
    const view = render(<TelegramAuthPage />);
    await act(async () => {});
    await act(async () => {await vi.advanceTimersByTimeAsync(1_000);});
    await act(async () => {fireEvent.click(screen.getByRole('button', {name: 'auth.tg.unavailable.retryExchange'}));});
    expect(exchangeCalls()).toHaveLength(2);
    expect(screen.queryByRole('button', {name: 'auth.tg.unavailable.retryExchange'})).toBeNull();
    view.unmount();
    render(<TelegramAuthPage />);
    await act(async () => {await vi.advanceTimersByTimeAsync(60_000);});

    expect(exchangeCalls()).toHaveLength(2);
    expect(screen.queryByRole('button', {name: 'auth.tg.unavailable.retryExchange'})).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each([
    {status: 500}, {status: 401}, new Error('Authentication request superseded'),
  ])('does not retry non-recoverable exchange errors', async error => {
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation((path: string, options?: unknown) => path === '/api/auth/telegram/exchange'
      ? Promise.reject(error) : handler(path, options));
    render(<TelegramAuthPage />);
    await screen.findByText('auth.tg.unavailable.title');

    expect(screen.queryByRole('button', {name: 'auth.tg.unavailable.retryExchange'})).toBeNull();
    expect(exchangeCalls()).toHaveLength(1);
  });

  it('does not redirect when /me resolves a different account from the exchange', async () => {
    const handler = apiFetch.getMockImplementation()!;
    apiFetch.mockImplementation(async (path: string, options?: unknown) => {
      const result = await handler(path, options);
      if (path === '/api/auth/telegram/exchange') session.user = {...owner, id: 'other'};
      return result;
    });
    render(<TelegramAuthPage />);

    await screen.findByText('auth.tg.unavailable.title');
    expect(replace).not.toHaveBeenCalled();
  });

  it('waits for the initial cookie check so real apiFetch does not supersede a valid exchange', async () => {
    actualApi = await vi.importActual('../../../../../lib/api');
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {values.set(key, value);},
      removeItem: (key: string) => {values.delete(key);},
    });
    const guest = deferred<Response>();
    let cookieReady = false;
    const response = (status: number, body: unknown) => ({
      status, ok: status === 200, headers: new Headers(), json: async () => body,
    }) as Response;
    const fetch = vi.fn(async (path: string) => {
      if (path === '/api/auth/me') return cookieReady ? response(200, owner) : guest.promise;
      if (path === '/api/auth/telegram/exchange') {
        cookieReady = true;
        return response(200, {...owner, token: 'jwt-real'});
      }
      throw new Error('Unexpected request: ' + path);
    });
    vi.stubGlobal('fetch', fetch);
    render(<TelegramAuthPage />);
    await act(async () => {});
    expect(fetch.mock.calls.filter(([path]) => path === '/api/auth/telegram/exchange')).toHaveLength(0);

    await act(async () => {guest.resolve(response(403, {message: 'anonymous'}));});
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/ru/account'));
    expect(setToken).toHaveBeenCalledWith('jwt-real');
    expect(fetch.mock.calls.filter(([path]) => path === '/api/auth/telegram/exchange')).toHaveLength(1);
  });
});
