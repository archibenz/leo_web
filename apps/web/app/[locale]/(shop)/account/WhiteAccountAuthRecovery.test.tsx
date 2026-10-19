import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {NextIntlClientProvider} from 'next-intl';
import WhiteAccountShowcase from './WhiteAccountShowcase';
import messages from '../../../../messages/en.json';

const auth = vi.hoisted(() => ({
  state: {user: null as null | {id: string; name: string; email: string; role: string}, ready: true, authError: false, logoutError: false, isLoggingOut: false},
  retry: vi.fn(async () => {}),
  logout: vi.fn(async () => ({ok: true})),
}));

vi.mock('../../../../hooks/useWhiteAuth', () => ({
  useWhiteAuth: () => auth.state,
  whiteRetryAuth: auth.retry,
  whiteLogout: auth.logout,
  whiteLogin: vi.fn(), whiteRegister: vi.fn(), whiteSendCode: vi.fn(),
  WHITE_PASSWORD_RE: /./,
}));
vi.mock('../../../../hooks/useWhiteBag', () => ({useWhiteBag: () => ({count: 0})}));
vi.mock('../../../../hooks/useWhiteFavourites', () => ({useWhiteFavourites: () => ({count: 0})}));
vi.mock('next/navigation', () => ({usePathname: () => '/en/account', useRouter: () => ({refresh: vi.fn()})}));

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn()})));
  auth.state = {user: null, ready: true, authError: false, logoutError: false, isLoggingOut: false};
  auth.retry.mockClear();
  auth.logout.mockClear();
});
afterEach(() => {cleanup(); vi.unstubAllGlobals();});

function renderPage() {
  return render(<NextIntlClientProvider locale="en" messages={messages as never}>
    <WhiteAccountShowcase locale="en" />
  </NextIntlClientProvider>);
}

describe('account session recovery', () => {
  it('an Analytics-eligible buyer sees Analytics without Site admin or editor controls', async () => {
    auth.state.user = {id: '7813985d-1748-4537-9583-06c81b849c4c', name: 'Buyer', email: 'buyer@example.invalid', role: 'user'};
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.endsWith('/analytics-access') ? new Response(null, {status: 204}) : new Response('{}', {status: 403})));
    renderPage();
    expect(await screen.findByRole('link', {name: 'Analytics'})).toHaveAttribute('href', '/analytics');
    expect(screen.queryByRole('link', {name: 'Admin Panel'})).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByText('Site management')).toBeNull();
  });

  it('Site-admin status alone never renders the Analytics link after a denied gate', async () => {
    auth.state.user = {id: '7813985d-1748-4537-9583-06c81b849c4c', name: 'Admin', email: 'admin@example.invalid', role: 'admin'};
    const checked = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.endsWith('/analytics-access')) checked();
      return new Response('{}', {status: 403});
    }));
    renderPage();
    await screen.findByRole('link', {name: 'Admin Panel'});
    await waitFor(() => expect(checked).toHaveBeenCalledOnce());
    expect(screen.queryByRole('link', {name: 'Analytics'})).toBeNull();
  });

  it('keeps the pending account visible without prematurely showing guest forms', () => {
    auth.state.ready = false;
    renderPage();
    expect(screen.getByRole('heading', {level: 1, name: /account/i})).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(/checking your session/i);
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.queryByRole('tab', {name: /sign in/i})).not.toBeInTheDocument();
  });

  it('shows verification failure and retry instead of a guest sign-in form', async () => {
    auth.state.authError = true;
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('We could not verify your session. Please try again.');
    expect(screen.queryByRole('tab', {name: /sign in/i})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Check session again'}));
    expect(auth.retry).toHaveBeenCalledTimes(1);
  });

  it('discloses incomplete server logout and lets the visitor finish it', async () => {
    auth.state.logoutError = true;
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Server sign-out could not be completed. Please try again.');
    expect(screen.queryByRole('tab', {name: /sign in/i})).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', {name: 'Complete sign-out'}));
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('keeps sign-in unavailable while the server logout request is pending', () => {
    auth.state.isLoggingOut = true;
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Signing out…');
    expect(screen.queryByRole('tab', {name: /sign in/i})).not.toBeInTheDocument();
  });
});
