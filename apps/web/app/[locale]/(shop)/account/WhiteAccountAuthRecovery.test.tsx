import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {NextIntlClientProvider} from 'next-intl';
import WhiteAccountShowcase from './WhiteAccountShowcase';
import messages from '../../../../messages/en.json';

const auth = vi.hoisted(() => ({
  state: {user: null, ready: true, authError: false, logoutError: false, isLoggingOut: false},
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
  auth.state = {user: null, ready: true, authError: false, logoutError: false, isLoggingOut: false};
  auth.retry.mockClear();
  auth.logout.mockClear();
});
afterEach(cleanup);

function renderPage() {
  return render(<NextIntlClientProvider locale="en" messages={messages as never}>
    <WhiteAccountShowcase locale="en" />
  </NextIntlClientProvider>);
}

describe('account session recovery', () => {
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
