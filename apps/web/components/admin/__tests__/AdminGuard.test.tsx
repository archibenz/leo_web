import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import AdminGuard from '../AdminGuard';
import {AuthProvider, useAuth} from '../../../contexts/AuthContext';
import {useWhiteAuth} from '../../../hooks/useWhiteAuth';

const mocks = vi.hoisted(() => ({
  push: vi.fn(), retryAuth: vi.fn(), logout: vi.fn(), useActual: false,
  auth: {
    isAuthenticated: false, isLoading: false, isAdmin: false,
    authError: false, logoutError: false, isLoggingOut: false,
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({push: mocks.push}), usePathname: () => '/ru/admin/products',
}));
vi.mock('next-intl', () => ({useTranslations: () => (key: string) => key}));
vi.mock('../../../contexts/AuthContext', async () => {
  const actual = await vi.importActual<typeof import('../../../contexts/AuthContext')>('../../../contexts/AuthContext');
  return {...actual, useAuth: () => mocks.useActual ? actual.useAuth() : ({...mocks.auth, retryAuth: mocks.retryAuth, logout: mocks.logout})};
});

beforeEach(() => {
  mocks.push.mockReset();
  mocks.retryAuth.mockReset();
  mocks.logout.mockReset().mockResolvedValue({success: false});
  mocks.useActual = false;
  Object.assign(mocks.auth, {
    isAuthenticated: false, isLoading: false, isAdmin: false,
    authError: false, logoutError: false, isLoggingOut: false,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount() {
  render(<AdminGuard><p>Private admin data fixture</p></AdminGuard>);
}

describe('admin access while verification is unavailable', () => {
  it('shows manual recovery instead of redirecting an unverified session to sign-in', () => {
    mocks.auth.authError = true;
    mount();
    expect(screen.queryByText('Private admin data fixture')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('errors.verificationUnavailable');
    fireEvent.click(screen.getByRole('button', {name: 'retryVerification'}));
    expect(mocks.retryAuth).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('blocks cached admin flags while verification has failed', () => {
    Object.assign(mocks.auth, {authError: true, isAuthenticated: true, isAdmin: true});
    mount();
    expect(screen.queryByText('Private admin data fixture')).toBeNull();
    expect(screen.getByRole('alert')).toBeVisible();
  });

  it('hides admin content immediately while server logout waits and never redirects early', () => {
    Object.assign(mocks.auth, {isAuthenticated: true, isAdmin: true, isLoggingOut: true});
    mount();
    expect(screen.queryByText('Private admin data fixture')).toBeNull();
    expect(screen.getByRole('status')).toBeVisible();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('discloses a server logout failure and offers retry instead of redirecting', () => {
    mocks.auth.logoutError = true;
    mount();
    expect(screen.getByRole('alert')).toHaveTextContent('errors.logoutFailed');
    fireEvent.click(screen.getByRole('button', {name: 'retryLogout'}));
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.queryByText('Private admin data fixture')).toBeNull();
  });

  it('retains guest redirect and verified role checks', () => {
    mount();
    expect(mocks.push).toHaveBeenCalledWith('/ru/account');
    expect(screen.queryByText('Private admin data fixture')).toBeNull();
    cleanup();
    mocks.push.mockClear();
    Object.assign(mocks.auth, {isAuthenticated: true, isAdmin: false});
    mount();
    expect(screen.getByText('accessDenied')).toBeVisible();
    expect(mocks.push).not.toHaveBeenCalled();
    cleanup();
    mocks.auth.isAdmin = true;
    mount();
    expect(screen.getByText('Private admin data fixture')).toBeVisible();
  });

  it('successful retry leaves the document instead of reusing a cookie-only White account cache', async () => {
    mocks.useActual = true;
    const stored = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => {stored.set(key, value);},
      removeItem: (key: string) => {stored.delete(key);},
    });
    const admin = {id: 'a', email: 'admin@fixture.invalid', name: 'Admin fixture', role: 'admin'};
    let cookieActive = true;
    let logoutCalls = 0;
    let completeLogout!: (response: Response) => void;
    const fetchMock = vi.fn((path: string) => {
      if (path.endsWith('/api/auth/me')) return Promise.resolve(new Response(JSON.stringify(cookieActive ? admin : {}), {status: cookieActive ? 200 : 403}));
      if (path.endsWith('/api/auth/logout')) {
        logoutCalls++;
        if (logoutCalls === 1) return Promise.resolve(new Response('{}', {status: 502}));
        return new Promise<Response>(resolve => {completeLogout = resolve;});
      }
      throw new Error(`Unexpected fixture endpoint: ${path}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    function WhiteAccountProbe() {
      const {user} = useWhiteAuth();
      return <p>White cached {user?.name ?? 'guest'}</p>;
    }
    function InitialExit() {
      const {logout} = useAuth();
      return <button onClick={() => {void logout();}}>Initial exit</button>;
    }
    const adminPage = <AuthProvider><InitialExit/><AdminGuard><p>Private admin data fixture</p></AdminGuard></AuthProvider>;
    const accountPage = <AuthProvider><WhiteAccountProbe/></AuthProvider>;
    const view = render(adminPage);
    await screen.findByText('Private admin data fixture');
    // A soft account visit fills the actual module store; going back preserves it.
    view.rerender(accountPage);
    await screen.findByText('White cached Admin fixture');
    view.rerender(adminPage);
    expect(screen.getByText('Private admin data fixture')).toBeVisible();
    expect(localStorage.getItem('reinasleo_token')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Initial exit'}));
    await screen.findByRole('button', {name: 'retryLogout'});

    const nativeWindow = window;
    const location = {href: '/ru/admin/products'};
    vi.stubGlobal('window', new Proxy(nativeWindow, {
      get(target, key) {
        if (key === 'location') return location;
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }));
    // Model Next's soft transition: it reuses the already populated White store.
    mocks.push.mockImplementation(() => {queueMicrotask(() => view.rerender(accountPage));});
    fireEvent.click(screen.getByRole('button', {name: 'retryLogout'}));
    await act(async () => {for (let i = 0; i < 5; i++) await Promise.resolve();});
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByText('Private admin data fixture')).toBeNull();
    expect(location.href).toBe('/ru/admin/products');
    expect(mocks.push).not.toHaveBeenCalled();
    await act(async () => {completeLogout(new Response('{}', {status: 502}));});
    expect(screen.getByRole('alert')).toHaveTextContent('errors.logoutFailed');
    expect(location.href).toBe('/ru/admin/products');
    expect(mocks.push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {name: 'retryLogout'}));
    await act(async () => {for (let i = 0; i < 5; i++) await Promise.resolve();});
    expect(screen.getByRole('status')).toBeVisible();
    expect(location.href).toBe('/ru/admin/products');
    cookieActive = false;
    await act(async () => {completeLogout(new Response(null, {status: 204}));});
    expect(screen.queryByText('White cached Admin fixture')).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(location.href).toBe('/ru/account');
    expect(logoutCalls).toBe(3);
    expect(localStorage.getItem('reinasleo_token')).toBeNull();
    expect(fetchMock.mock.calls.filter(([path]) => path.endsWith('/api/auth/me'))).toHaveLength(2);
  });
});
