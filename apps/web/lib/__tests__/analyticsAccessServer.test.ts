import {afterEach, describe, expect, it, vi} from 'vitest';
import {checkAnalyticsAccess} from '../analyticsAccessServer';

afterEach(() => {vi.unstubAllGlobals(); vi.useRealTimers();});

describe('account analytics permission proxy', () => {
  it('forwards only the unique Site cookie to the fixed local gate', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, {status: 204}));
    vi.stubGlobal('fetch', fetcher);
    const response = await checkAnalyticsAccess(new Request('https://reinasleo.com/ru/account/analytics-access', {
      headers: {cookie: 'analytics_session=other-user; rl_session=site-proof; theme=dark', authorization: 'Bearer other-user'},
    }));
    expect(response.status).toBe(204);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('http://127.0.0.1:8081/api/v1/auth/web-gate', expect.objectContaining({
      method: 'GET', headers: {Cookie: 'rl_session=site-proof'}, redirect: 'error', cache: 'no-store', credentials: 'omit',
    }));
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.has('set-cookie')).toBe(false);
  });

  it.each([null, '', 'analytics_session=other-user', 'rl_session=', 'rl_session=a; rl_session=b', 'rl_session=a%0D%0Ab'])('rejects missing, ambiguous or invalid identity cookie %s', async (cookie) => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    const response = await checkAnalyticsAccess(new Request('https://reinasleo.com/ru/account/analytics-access', {headers: cookie ? {cookie} : {}}));
    expect(response.status).toBe(401);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([[401, 401], [403, 403], [503, 503], [429, 503], [200, 503], [302, 503], [500, 503]])('maps upstream %s to %s without returning its body or cookies', async (upstream, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('PRIVATE_ERROR', {status: upstream, headers: {'set-cookie': 'analytics_session=secret'}})));
    const response = await checkAnalyticsAccess(new Request('https://reinasleo.com/ru/account/analytics-access', {headers: {cookie: 'rl_session=site-proof'}}));
    expect(response.status).toBe(expected);
    expect(await response.text()).toBe('');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.has('set-cookie')).toBe(false);
  });

  it('times out an unresponsive gate without granting access', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_url, options) => {signal = options.signal; return new Promise(() => {});}));
    const pending = checkAnalyticsAccess(new Request('https://reinasleo.com/ru/account/analytics-access', {headers: {cookie: 'rl_session=site-proof'}}));
    await vi.advanceTimersByTimeAsync(5000);
    const response = await pending;
    expect(response.status).toBe(503);
    expect(signal?.aborted).toBe(true);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(vi.getTimerCount()).toBe(0);
  });
});
