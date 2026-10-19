import {StrictMode} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import AccountAnalyticsAccess from './AccountAnalyticsAccess';
import enMessages from '../../messages/en.json';

const response = (status: number) => new Response(null, {status});
const tree = (userId: string = 'account-a') => (
  <NextIntlClientProvider locale="en" messages={enMessages as never}>
    <AccountAnalyticsAccess userId={userId} locale="en" />
  </NextIntlClientProvider>
);
const flush = async () => {await act(async () => {});};
const advance = async (ms: number) => {await act(async () => vi.advanceTimersByTimeAsync(ms));};
const returned = async () => {await act(async () => {window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange'));});};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403)));
});
afterEach(() => {cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();});

describe('account Analytics eligibility', () => {
  it('shows a same-origin Analytics link only after a 204, without a Site-admin role requirement', async () => {
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
    render(tree());
    expect(screen.queryByRole('link')).toBeNull();
    await act(async () => finish(response(204)));
    expect(screen.getByRole('link', {name: 'Analytics'})).toHaveAttribute('href', '/analytics');
    expect(fetch).toHaveBeenCalledWith('/en/account/analytics-access', expect.objectContaining({credentials: 'same-origin', cache: 'no-store', redirect: 'error'}));
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toBeUndefined();
  });

  it.each([401, 403])('keeps denied status %s hidden without an empty owner frame or logging out', async status => {
    vi.mocked(fetch).mockResolvedValue(response(status));
    const {container} = render(tree());
    await flush();
    expect(screen.queryByRole('link')).toBeNull();
    expect(container).toBeEmptyDOMElement();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([200, 302, 503])('unconfirmed status %s is retryable and never grants access', async status => {
    vi.mocked(fetch).mockResolvedValueOnce(response(status)).mockResolvedValueOnce(response(204));
    render(tree());
    await flush();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent(/could not check Analytics access/i);
    await act(async () => fireEvent.click(screen.getByRole('button', {name: 'Check access again'})));
    expect(screen.getByRole('link', {name: 'Analytics'})).toHaveAttribute('href', '/analytics');
  });

  it('an aborted account-A allow result never grants account B access', async () => {
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;})).mockResolvedValueOnce(response(403));
    const mounted = render(tree());
    const signal = vi.mocked(fetch).mock.calls[0][1]?.signal;
    mounted.rerender(tree('account-b'));
    await flush();
    expect(signal?.aborted).toBe(true);
    await act(async () => finish(response(204)));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('focus return checks are throttled and revoke a previously visible link on denial', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response(204)).mockResolvedValueOnce(response(403));
    render(tree());
    await flush();
    expect(screen.getByRole('link')).toBeInTheDocument();
    await returned();
    expect(fetch).toHaveBeenCalledTimes(1);
    await advance(3000);
    await returned();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('times out a hanging check and ignores its later allow response', async () => {
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise(resolve => {finish = resolve;}));
    render(tree());
    await advance(10_000);
    expect(screen.getByRole('button', {name: 'Check access again'})).toBeEnabled();
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => finish(response(204)));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('a cross-tab logout removes access and blocks stale or focus responses', async () => {
    let finish!: (value: Response) => void;
    vi.mocked(fetch).mockResolvedValueOnce(response(204)).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
    render(tree());
    await flush();
    expect(screen.getByRole('link')).toBeInTheDocument();
    await advance(3000);
    await returned();
    act(() => window.dispatchEvent(new StorageEvent('storage', {key: 'reinasleo_logout', storageArea: localStorage})));
    await act(async () => finish(response(204)));
    await advance(3000);
    await returned();
    expect(screen.queryByRole('link')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('StrictMode cleanup aborts obsolete work and leaves no timer after unmount', async () => {
    vi.mocked(fetch).mockResolvedValue(response(204));
    const mounted = render(<StrictMode>{tree()}</StrictMode>);
    await flush();
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(vi.mocked(fetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
    mounted.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
