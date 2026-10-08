import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import WhiteTelegramLink from './WhiteTelegramLink';
import enMessages from '../../messages/en.json';

const USER_ID = '7813985d-1748-4537-9583-06c81b849c4c';
const OTHER_ID = '164ff844-636f-42aa-9c23-60ced64a3fbe';
const TOKEN = 'A'.repeat(43);
const signInAgain = vi.fn();
const challenge = () => ({challenge_token: TOKEN, deep_link: `https://t.me/test_bot?start=link_${TOKEN}`, expires_at: new Date(Date.now() + 240_000).toISOString()});
const identity = () => ({schema_version: 1, site_user_id: USER_ID, telegram_id: 123456789,
  telegram_verified: true, is_admin: true, telegram_username: null, expires_at: new Date(Date.now() + 50_000).toISOString()});
const response = (body: unknown, status = 200) => ({ok: status === 200, status, json: async () => body}) as Response;
const tree = (userId: string | number = USER_ID, role: string | undefined = 'admin') => (
  <NextIntlClientProvider locale="en" messages={enMessages as never}>
    <WhiteTelegramLink userId={userId} role={role} onSignInAgain={signInAgain} />
  </NextIntlClientProvider>
);

beforeEach(() => {
  signInAgain.mockClear();
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Site account Telegram confirmation', () => {
  it.each(['user', undefined])('offers no linking controls for role %s and makes no request', (role) => {
    render(<NextIntlClientProvider locale="en" messages={enMessages as never}>
      <WhiteTelegramLink userId={USER_ID} role={role} onSignInAgain={signInAgain} />
    </NextIntlClientProvider>);
    expect(screen.queryByRole('region', {name: 'Telegram for Analytics'})).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('issues a link only after a user click, opens it explicitly, and confirms after return', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(challenge())).mockResolvedValueOnce(response(identity()));
    render(tree());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText('Confirmation checked. You can open Analytics.')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Confirm in Telegram'}));
    const link = await screen.findByRole('link', {name: 'Open Telegram'});
    expect(link).toHaveAttribute('href', challenge().deep_link);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(screen.queryByText('Confirmation checked. You can open Analytics.')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    await screen.findByText('Confirmation checked. You can open Analytics.');
    expect(screen.queryByRole('link', {name: 'Open Telegram'})).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/auth/me/telegram-link/challenge', '/api/admin/analytics-session']);
  });

  it.each([
    [403, 'Sign in again and check that your account has administrator access.'],
    [409, 'This Telegram account is already linked to another site account. Contact support to resolve the link.'],
    [429, 'Too many requests. Wait a minute, then try again.'],
    [500, 'Could not check the confirmation. Please try again.'],
  ])('handles HTTP %s without exposing the backend error', async (status, message) => {
    vi.mocked(fetch).mockResolvedValue(response({message: 'PRIVATE_SERVER_DETAIL'}, status));
    render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    await screen.findByText(message);
    expect(screen.queryByText(/PRIVATE_SERVER_DETAIL/)).toBeNull();
    expect(screen.queryByText('Confirmation checked. You can open Analytics.')).toBeNull();
  });

  it.each(['telegram_link_required', 'telegram_link_refresh_required'])('keeps a known proof denial %s pending without forcing sign-in', async (message) => {
    vi.mocked(fetch).mockResolvedValue(response({message}, 403));
    render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    await screen.findByText('Confirmation is not available yet. Complete the step in our Telegram bot, then check again.');
    expect(screen.getByRole('button', {name: 'Confirm in Telegram'})).toBeEnabled();
    expect(screen.queryByRole('button', {name: 'Sign in again'})).toBeNull();
  });

  it.each(['GET', 'POST'])('recovers from an anonymous or role-denied generic403 on %s', async (method) => {
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge())).mockResolvedValueOnce(response({}, 403));
    render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Confirm in Telegram'}));
    await screen.findByRole('link', {name: 'Open Telegram'});
    fireEvent.click(screen.getByRole('button', {name: method === 'POST' ? 'Confirm in Telegram' : 'Check confirmation'}));
    await screen.findByText('Sign in again and check that your account has administrator access.');
    expect(screen.queryByRole('link', {name: 'Open Telegram'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Check confirmation'})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Sign in again'}));
    expect(signInAgain).toHaveBeenCalledOnce();
  });

  it('clears the Telegram link on a 401 and lets the user return to sign-in', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(challenge())).mockResolvedValueOnce(response({}, 401));
    render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Confirm in Telegram'}));
    await screen.findByRole('link', {name: 'Open Telegram'});
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    await screen.findByText('Your site session has expired. Sign in again to continue.');
    expect(screen.queryByRole('link', {name: 'Open Telegram'})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Sign in again'}));
    expect(signInAgain).toHaveBeenCalledOnce();
  });

  it('never shows confirmation for a different authenticated UUID', async () => {
    vi.mocked(fetch).mockResolvedValue(response({...identity(), site_user_id: OTHER_ID}));
    render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    await screen.findByText('Could not check the confirmation. Please try again.');
    expect(screen.queryByText('Confirmation checked. You can open Analytics.')).toBeNull();
  });

  it('allows a retry after rate limiting and trusts only its fresh success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({}, 429)).mockResolvedValueOnce(response(identity()));
    render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    await screen.findByText('Too many requests. Wait a minute, then try again.');
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    await screen.findByText('Confirmation checked. You can open Analytics.');
  });

  it('expires the link and removes the old token before a new challenge', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue(response(challenge()));
    render(tree());
    await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Confirm in Telegram'})));
    expect(screen.getByRole('link', {name: 'Open Telegram'})).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(240_001));
    expect(screen.queryByRole('link', {name: 'Open Telegram'})).toBeNull();
    expect(screen.getByText('The link has expired. Create a new link to confirm in Telegram.')).toBeInTheDocument();
  });

  it('removes the confirmed status when the server assertion expires', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue(response(identity()));
    render(tree());
    await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'})));
    expect(screen.getByText('Confirmation checked. You can open Analytics.')).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTime(50_001));
    expect(screen.queryByText('Confirmation checked. You can open Analytics.')).toBeNull();
    expect(screen.getByText('The confirmation check has expired. Check again before opening Analytics.')).toBeInTheDocument();
  });

  it('aborts an unresolved verification on challenge expiry and ignores its late success', async () => {
    vi.useFakeTimers();
    let finish!: (value: Response) => void;
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(challenge()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {finish = resolve;}));
    render(tree());
    await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Confirm in Telegram'})));
    await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'})));
    const abortSignal = fetchMock.mock.calls[1][1]?.signal;
    expect(screen.getByRole('button', {name: 'Check confirmation'})).toBeDisabled();
    await act(async () => vi.advanceTimersByTime(240_001));
    expect(abortSignal?.aborted).toBe(true);
    expect(screen.getByRole('button', {name: 'Confirm in Telegram'})).toBeEnabled();
    expect(screen.getByRole('button', {name: 'Check confirmation'})).toBeEnabled();
    expect(screen.queryByRole('link', {name: 'Open Telegram'})).toBeNull();
    await act(async () => finish(response(identity())));
    expect(screen.queryByText('Confirmation checked. You can open Analytics.')).toBeNull();
    expect(screen.getByText('The link has expired. Create a new link to confirm in Telegram.')).toBeInTheDocument();
  });

  it('drops an old account challenge on UUID change and removes controls on logout or role loss', async () => {
    vi.mocked(fetch).mockResolvedValue(response(challenge()));
    const {rerender} = render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Confirm in Telegram'}));
    await screen.findByRole('link', {name: 'Open Telegram'});
    rerender(tree(OTHER_ID));
    expect(screen.queryByRole('link', {name: 'Open Telegram'})).toBeNull();
    rerender(tree(OTHER_ID, 'user'));
    expect(screen.queryByRole('region', {name: 'Telegram for Analytics'})).toBeNull();
  });

  it('aborts a pending request on unmount and cannot restore its link after logout', async () => {
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise<Response>((resolve) => {finish = resolve;}));
    const {unmount} = render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Confirm in Telegram'}));
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    const abortSignal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    unmount();
    expect(abortSignal?.aborted).toBe(true);
    await act(async () => finish(response(challenge())));
    expect(screen.queryByRole('link', {name: 'Open Telegram'})).toBeNull();
  });

  it('disables repeat requests and removes an old confirmation while a fresh check is pending', async () => {
    let finish!: (value: Response) => void;
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {finish = resolve;}));
    render(tree());
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    await screen.findByText('Confirmation checked. You can open Analytics.');
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    expect(screen.queryByText('Confirmation checked. You can open Analytics.')).toBeNull();
    expect(screen.getByRole('button', {name: 'Check confirmation'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Confirm in Telegram'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button', {name: 'Check confirmation'}));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => finish(response({}, 403)));
    expect(screen.queryByText('Confirmation checked. You can open Analytics.')).toBeNull();
  });

  it('prevents an expired link from opening when browser timers have not fired yet', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue(response(challenge()));
    render(tree());
    await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Confirm in Telegram'})));
    const link = screen.getByRole('link', {name: 'Open Telegram'});
    vi.setSystemTime(new Date(Date.now() + 240_001));
    expect(fireEvent.click(link)).toBe(false);
    expect(screen.queryByRole('link', {name: 'Open Telegram'})).toBeNull();
  });
});
