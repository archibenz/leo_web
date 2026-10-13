import {StrictMode} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import WhiteTelegramLink from './WhiteTelegramLink';
import enMessages from '../../messages/en.json';

const USER_ID = '7813985d-1748-4537-9583-06c81b849c4c';
const OTHER_ID = '164ff844-636f-42aa-9c23-60ced64a3fbe';
const TOKEN = 'A'.repeat(43);
const messages = enMessages.white.account.telegramLink;
const signInAgain = vi.fn();
const challenge = (lifetime = 240_000) => ({challenge_token: TOKEN, deep_link: 'https://t.me/test_bot?start=link_' + TOKEN, expires_at: new Date(Date.now() + lifetime).toISOString()});
const identity = (linked = false, verified = false) => ({schema_version: 1, site_user_id: USER_ID, linked, verified,
  verified_until: verified ? new Date(Date.now() + 50_000).toISOString() : null});
const response = (body: unknown, status = 200, retryAfter?: string) => ({
  ok: status === 200, status, json: async () => body, headers: new Headers(retryAfter ? {'Retry-After': retryAfter} : {}),
}) as Response;
const tree = (userId: string | number = USER_ID, role: string | undefined = 'admin') => (
  <NextIntlClientProvider locale="en" messages={enMessages as never}>
    <WhiteTelegramLink userId={userId} role={role} onSignInAgain={signInAgain} />
  </NextIntlClientProvider>
);
const flush = async () => {await act(async () => {});};
const click = async (name: string) => {await act(async () => fireEvent.click(screen.getByRole('button', {name})));};
const advance = async (ms: number) => {await act(async () => vi.advanceTimersByTimeAsync(ms));};
const getState = () => screen.getByRole('region', {name: messages.title}).getAttribute('data-state');
const returned = async () => {await act(async () => {window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange'));});};
const popup = () => ({opener: {} as unknown, closed: false, location: {replace: vi.fn()}, close: vi.fn()});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-12T12:00:00Z'));
  signInAgain.mockClear();
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.spyOn(window, 'open').mockReturnValue(null);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(identity())));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Site account Telegram connection', () => {
  it.each(['user', 'admin'])('checks a %s account on mount without opening Telegram or issuing a challenge', async (role) => {
    render(tree(USER_ID, role));
    await flush();
    expect(getState()).toBe('idle');
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/auth/me/telegram-link/status', expect.objectContaining({credentials: 'include', cache: 'no-store'}));
    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: messages.connect})).toBeEnabled();
    expect(screen.queryByRole('button', {name: /Check confirmation/})).toBeNull();
  });

  it('completes the initial check after StrictMode aborts and remounts its effect', async () => {
    render(<StrictMode>{tree()}</StrictMode>);
    await flush();
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(getState()).toBe('idle');
  });

  it('reuses persistent confirmation in a fresh Site session until its original deadline', async () => {
    const day = 86_400_000;
    const verifiedUntil = Date.now() + 90 * day;
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity(true, true)));
    const firstSession = render(tree());
    await flush();
    expect(getState()).toBe('verified');
    await advance(50_000);
    expect(getState()).toBe('refresh');
    firstSession.unmount();

    vi.setSystemTime(new Date(verifiedUntil - 89 * day));
    const schedule = vi.spyOn(window, 'setTimeout');
    fetchMock.mockResolvedValueOnce(response({...identity(true, true), verified_until: new Date(verifiedUntil).toISOString()}));
    render(tree());
    await flush();
    expect(getState()).toBe('verified');
    for (const [, delay] of schedule.mock.calls) expect(delay).toBeLessThanOrEqual(2_147_483_647);
    await advance(30 * day);
    expect(getState()).toBe('verified');
    await advance(verifiedUntil - Date.now() - 1);
    expect(getState()).toBe('verified');
    await advance(1);
    expect(getState()).toBe('refresh');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/me/telegram-link/status', '/api/auth/me/telegram-link/status',
    ]);
    expect(window.open).not.toHaveBeenCalled();
  });

  it('automatically shows confirmation from visible polling without a return event', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity()))
      .mockResolvedValueOnce(response(challenge()))
      .mockImplementationOnce(async () => response({...identity(true, true), verified_until: new Date(Date.now() + 90 * 86_400_000).toISOString()}));
    render(tree());
    await flush();
    await click(messages.connect);
    await advance(15_001);
    expect(getState()).toBe('verified');
    expect(screen.getByRole('status')).toHaveTextContent(messages.verified);
    expect(screen.queryByRole('link', {name: messages.openTelegram})).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/me/telegram-link/status', '/api/auth/me/telegram-link/challenge', '/api/auth/me/telegram-link/status',
    ]);
  });

  it('preopens a detached window in the click and automatically verifies after returning', async () => {
    let finish!: (value: Response) => void;
    const opened = popup();
    vi.mocked(window.open).mockReturnValue(opened as unknown as Window);
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {finish = resolve;}))
      .mockResolvedValueOnce(response(identity(true, true)));
    render(tree());
    await flush();
    await click(messages.connect);
    expect(window.open).toHaveBeenCalledExactlyOnceWith('about:blank', '_blank');
    expect(opened.opener).toBeNull();
    expect(opened.location.replace).not.toHaveBeenCalled();
    expect(getState()).toBe('starting');
    await act(async () => finish(response(challenge())));
    expect(opened.location.replace).toHaveBeenCalledExactlyOnceWith(challenge().deep_link);
    expect(getState()).toBe('pending');
    await advance(3000);
    await returned();
    expect(getState()).toBe('verified');
    expect(screen.getByRole('status')).toHaveTextContent(messages.verified);
    expect(screen.queryByRole('link', {name: messages.openTelegram})).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/me/telegram-link/status', '/api/auth/me/telegram-link/challenge', '/api/auth/me/telegram-link/status',
    ]);
  });

  it('offers a safe direct link when the popup is blocked and connects a buyer without granting Analytics', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()))
      .mockResolvedValueOnce(response(identity(true, false)));
    render(tree(USER_ID, 'user'));
    await flush();
    await click(messages.connect);
    const link = screen.getByRole('link', {name: messages.openTelegram});
    expect(link).toHaveAttribute('href', challenge().deep_link);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('referrerpolicy', 'no-referrer');
    await advance(3000);
    await returned();
    expect(getState()).toBe('linked');
    expect(screen.getByRole('status')).toHaveTextContent(messages.linked);
    expect(screen.queryByText(messages.verified)).toBeNull();
  });

  it('closes a blank window for an invalid destination and retries with a new validated challenge', async () => {
    const opened = popup();
    vi.mocked(window.open).mockReturnValue(opened as unknown as Window);
    vi.mocked(fetch).mockResolvedValueOnce(response(identity()))
      .mockResolvedValueOnce(response({...challenge(), deep_link: 'https://evil.example/'}))
      .mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    expect(opened.close).toHaveBeenCalledOnce();
    expect(opened.location.replace).not.toHaveBeenCalled();
    expect(getState()).toBe('unavailable');
    expect(screen.queryByRole('link')).toBeNull();
    await click(messages.retry);
    expect(getState()).toBe('pending');
    expect(opened.location.replace).toHaveBeenCalledOnce();
  });

  it('throttles return events and never overlaps status checks', async () => {
    let finish!: (value: Response) => void;
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {finish = resolve;}));
    render(tree());
    await flush();
    await click(messages.connect);
    await returned();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await advance(3000);
    await returned();
    await advance(3000);
    await returned();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await act(async () => finish(response(identity())));
    await returned();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(getState()).toBe('pending');
  });

  it('lets a connect click replace a pending background check without accepting its late result', async () => {
    let finish!: (value: Response) => void;
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {finish = resolve;}))
      .mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await advance(3000);
    await returned();
    const signal = fetchMock.mock.calls[1][1]?.signal;
    await click(messages.connect);
    expect(signal?.aborted).toBe(true);
    expect(getState()).toBe('pending');
    await act(async () => finish(response(identity(true, true))));
    expect(getState()).toBe('pending');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/auth/me/telegram-link/challenge');
  });

  it('polls pending connections every 15 seconds only while visible', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    await advance(15_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    visibility.mockReturnValue('hidden');
    await advance(45_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    visibility.mockReturnValue('visible');
    await returned();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(getState()).toBe('pending');
  });

  it('expires a pending challenge, aborts its outstanding poll, and ignores a late proof', async () => {
    let finish!: (value: Response) => void;
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge(20_000)))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {finish = resolve;}));
    render(tree());
    await flush();
    await click(messages.connect);
    await advance(15_000);
    const signal = fetchMock.mock.calls[2][1]?.signal;
    await advance(5001);
    expect(signal?.aborted).toBe(true);
    expect(getState()).toBe('expired');
    expect(screen.queryByRole('link')).toBeNull();
    await act(async () => finish(response(identity(true, true))));
    await advance(30_000);
    await returned();
    expect(getState()).toBe('expired');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][0]).toBe('/api/auth/me/telegram-link/status');
    expect(screen.getByRole('button', {name: messages.connect})).toBeEnabled();
  });

  it('rejects a stale direct link even when hidden-tab timers have not run', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    const link = screen.getByRole('link', {name: messages.openTelegram});
    vi.setSystemTime(new Date(Date.now() + 240_001));
    expect(fireEvent.click(link)).toBe(false);
    expect(getState()).toBe('expired');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it.each(['suspended', 'fired'])('reads persisted confirmation on return after expiry with %s timers', async (timers) => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get');
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    visibility.mockReturnValue('hidden');
    if (timers === 'fired') await advance(240_001);
    else vi.setSystemTime(new Date(Date.now() + 240_001));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The bot confirmed before the challenge expired; the server still holds the proof.
    fetchMock.mockResolvedValueOnce(response(identity(true, true)));
    visibility.mockReturnValue('visible');
    await returned();
    expect(getState()).toBe('verified');
    expect(screen.queryByRole('link')).toBeNull();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/me/telegram-link/status', '/api/auth/me/telegram-link/challenge', '/api/auth/me/telegram-link/status',
    ]);
    await returned();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('keeps an unconfirmed expired link expired after a fresh return check without issuing or polling', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    vi.setSystemTime(new Date(Date.now() + 240_001));
    await returned();
    expect(getState()).toBe('expired');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('link')).toBeNull();
    await advance(30_000);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([true, false])('checks status before an expired-link retry with stored confirmation %s', async (alreadyConfirmed) => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    vi.setSystemTime(new Date(Date.now() + 240_001));
    expect(fireEvent.click(screen.getByRole('link', {name: messages.openTelegram}))).toBe(false);
    expect(getState()).toBe('expired');
    const opened = popup();
    vi.mocked(window.open).mockReturnValue(opened as unknown as Window);
    fetchMock.mockResolvedValueOnce(response(identity(alreadyConfirmed, alreadyConfirmed))).mockResolvedValueOnce(response(challenge()));
    await click(messages.connect);
    expect(fetchMock.mock.calls[2][0]).toBe('/api/auth/me/telegram-link/status');
    if (alreadyConfirmed) {
      expect(getState()).toBe('verified');
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(opened.close).toHaveBeenCalledOnce();
      expect(opened.location.replace).not.toHaveBeenCalled();
    } else {
      expect(getState()).toBe('pending');
      expect(fetchMock.mock.calls[3][0]).toBe('/api/auth/me/telegram-link/challenge');
      expect(opened.location.replace).toHaveBeenCalledOnce();
    }
  });

  it('stops an expired-link retry on a mismatched status and retries only the cookie status read', async () => {
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    vi.setSystemTime(new Date(Date.now() + 240_001));
    fireEvent.click(screen.getByRole('link', {name: messages.openTelegram}));
    const opened = popup();
    vi.mocked(window.open).mockReturnValue(opened as unknown as Window);
    fetchMock.mockResolvedValueOnce(response({...identity(true, true), site_user_id: OTHER_ID}))
      .mockResolvedValueOnce(response(identity(true, true)));
    await click(messages.connect);
    expect(getState()).toBe('unavailable');
    expect(opened.close).toHaveBeenCalledOnce();
    expect(opened.location.replace).not.toHaveBeenCalled();
    await click(messages.retry);
    expect(getState()).toBe('verified');
    expect(fetchMock.mock.calls.slice(2).map(([url]) => url)).toEqual([
      '/api/auth/me/telegram-link/status', '/api/auth/me/telegram-link/status',
    ]);
  });

  it.each(['unmount', 'account change'])('aborts issuance and closes the blank window on %s, ignoring its late response', async (action) => {
    let finish!: (value: Response) => void;
    const opened = popup();
    vi.mocked(window.open).mockReturnValue(opened as unknown as Window);
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {finish = resolve;}))
      .mockResolvedValueOnce(response({...identity(), site_user_id: OTHER_ID}));
    const mounted = render(tree());
    await flush();
    await click(messages.connect);
    const signal = fetchMock.mock.calls[1][1]?.signal;
    if (action === 'unmount') mounted.unmount();
    else mounted.rerender(tree(OTHER_ID));
    await flush();
    expect(signal?.aborted).toBe(true);
    expect(opened.close).toHaveBeenCalledOnce();
    await act(async () => finish(response(challenge())));
    expect(opened.location.replace).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', {name: messages.openTelegram})).toBeNull();
  });

  it('clears a pending link on localStorage logout and ignores unrelated sessionStorage events', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    const sessionEvent = new StorageEvent('storage', {key: 'reinasleo_logout'});
    Object.defineProperty(sessionEvent, 'storageArea', {value: window.sessionStorage});
    act(() => window.dispatchEvent(sessionEvent));
    expect(getState()).toBe('pending');
    const logoutEvent = new StorageEvent('storage', {key: 'reinasleo_logout'});
    Object.defineProperty(logoutEvent, 'storageArea', {value: window.localStorage});
    act(() => window.dispatchEvent(logoutEvent));
    expect(getState()).toBe('sessionExpired');
    expect(screen.queryByRole('link')).toBeNull();
    await advance(30_000);
    await returned();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['user', false, 'linked'], ['user', true, 'linked'], ['admin', false, 'refresh'], ['admin', true, 'verified'],
  ])('keeps role %s and fresh proof %s distinct with state %s', async (role, verified, expected) => {
    vi.mocked(fetch).mockResolvedValue(response(identity(true, verified as boolean)));
    render(tree(USER_ID, role as string));
    await flush();
    expect(getState()).toBe(expected);
    expect(screen.queryByText(messages.description)).toBeNull();
    expect(screen.queryByRole('button', {name: messages.connect})).toBeNull();
    if (role === 'user') expect(screen.queryByText(messages.verified)).toBeNull();
    if (expected === 'refresh') expect(screen.getByRole('button', {name: messages.refreshAction})).toBeEnabled();
    await advance(50_001);
    expect(getState()).toBe(role === 'admin' ? 'refresh' : 'linked');
  });

  it.each([401, 403])('stops on HTTP %s and offers sign-in without exposing server details', async (status) => {
    vi.mocked(fetch).mockResolvedValue(response({message: 'PRIVATE_SERVER_DETAIL'}, status));
    render(tree());
    await flush();
    expect(getState()).toBe(status === 401 ? 'sessionExpired' : 'accessRequired');
    expect(screen.queryByText(/PRIVATE_SERVER_DETAIL/)).toBeNull();
    await advance(30_000);
    await returned();
    expect(fetch).toHaveBeenCalledOnce();
    await click(messages.signInAgain);
    expect(signInAgain).toHaveBeenCalledOnce();
  });

  it('shows only an explicit conflict, leaves ownership unchanged, and supports a safe new attempt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response({message: 'private'}, 409))
      .mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    expect(getState()).toBe('conflict');
    expect(screen.getByRole('status')).toHaveTextContent(messages.conflict);
    await advance(30_000);
    await returned();
    expect(fetch).toHaveBeenCalledTimes(2);
    await click(messages.retry);
    expect(getState()).toBe('pending');
    expect(screen.queryByText(messages.conflict)).toBeNull();
    expect(vi.mocked(fetch).mock.calls[2][1]?.body).toBeUndefined();
  });

  it('does not call an unconfirmed connection a conflict and offers honest bot help', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()));
    render(tree());
    await flush();
    await click(messages.connect);
    await advance(15_000);
    expect(getState()).toBe('pending');
    expect(screen.getByRole('status')).toHaveTextContent(messages.pending);
    expect(screen.queryByText(messages.conflict)).toBeNull();
    expect(screen.getByText(messages.help)).toBeInTheDocument();
  });

  it('honors Retry-After, stops automatic retries, and trusts only a fresh manually retried response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({message: 'private'}, 429, '120'))
      .mockImplementationOnce(async () => response(identity(true, true)));
    render(tree());
    await flush();
    expect(getState()).toBe('rateLimited');
    expect(screen.getByRole('button', {name: messages.wait})).toBeDisabled();
    await advance(119_999);
    await returned();
    expect(fetch).toHaveBeenCalledOnce();
    await advance(1);
    expect(screen.getByRole('button', {name: messages.retry})).toBeEnabled();
    expect(fetch).toHaveBeenCalledOnce();
    await click(messages.retry);
    expect(getState()).toBe('verified');
  });

  it('times out a hung challenge, closes its blank window and ignores late navigation', async () => {
    let finish!: (value: Response) => void;
    const opened = popup();
    vi.mocked(window.open).mockReturnValue(opened as unknown as Window);
    const fetchMock = vi.mocked(fetch).mockResolvedValueOnce(response(identity()))
      .mockImplementationOnce(() => new Promise<Response>((resolve) => {finish = resolve;}));
    render(tree());
    await flush();
    await click(messages.connect);
    await advance(15_000);
    expect(getState()).toBe('unavailable');
    expect(opened.close).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(true);
    await act(async () => finish(response(challenge())));
    expect(opened.location.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', {name: messages.retry})).toBeEnabled();
  });

  it('keeps retry disabled when the server delay exceeds the browser timer range', async () => {
    vi.mocked(fetch).mockResolvedValue(response({}, 429, '2147483648'));
    render(tree());
    await flush();
    await advance(60_000);
    await returned();
    expect(screen.getByRole('button', {name: messages.wait})).toBeDisabled();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('stops polling after a status error and recovers without issuing another challenge', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(identity())).mockResolvedValueOnce(response(challenge()))
      .mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(response(identity(true, true)));
    render(tree());
    await flush();
    await click(messages.connect);
    await advance(15_000);
    expect(getState()).toBe('unavailable');
    expect(screen.queryByRole('link')).toBeNull();
    await advance(30_000);
    await returned();
    expect(fetch).toHaveBeenCalledTimes(3);
    await click(messages.retry);
    expect(getState()).toBe('verified');
    expect(vi.mocked(fetch).mock.calls[3][0]).toBe('/api/auth/me/telegram-link/status');
  });

  it('does not trust a status response for another account', async () => {
    vi.mocked(fetch).mockResolvedValue(response({...identity(true, true), site_user_id: OTHER_ID}));
    render(tree());
    await flush();
    expect(getState()).toBe('unavailable');
    expect(screen.queryByText(messages.verified)).toBeNull();
  });

  it('waits for visibility before the initial check', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    render(tree());
    await flush();
    expect(fetch).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    await returned();
    expect(fetch).toHaveBeenCalledOnce();
    expect(getState()).toBe('idle');
  });
});
