import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {getTelegramLinkStatus, issueTelegramLink, telegramLinkFailure, telegramLinkRetryAt} from '../telegramLink';

const USER_ID = '7813985d-1748-4537-9583-06c81b849c4c';
const NOW = new Date('2026-10-08T12:00:00Z');
const TOKEN = 'A'.repeat(43);
const signal = () => new AbortController().signal;
const challenge = () => ({challenge_token: TOKEN, deep_link: 'https://t.me/test_bot?start=link_' + TOKEN, expires_at: new Date(Date.now() + 240_000).toISOString()});
const identity = () => ({schema_version: 1, site_user_id: USER_ID, linked: true, verified: true, verified_until: new Date(Date.now() + 50_000).toISOString()});

function respond(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ok: status === 200, status, json: async () => body});
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubGlobal('localStorage', {getItem: vi.fn().mockReturnValue('stale-legacy-bearer')});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Telegram linking transport and trusted response', () => {
  it('issues a cookie-backed uncached challenge without the legacy bearer or identity parameters', async () => {
    const fetchMock = respond(challenge());
    const abortSignal = signal();
    const result = await issueTelegramLink(abortSignal);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/auth/me/telegram-link/challenge', {
      method: 'POST', cache: 'no-store', signal: abortSignal, headers: {'Content-Type': 'application/json'}, credentials: 'include',
    });
    expect(result).toEqual({deepLink: challenge().deep_link, expiresAt: Date.now() + 240_000});
    expect(result).not.toHaveProperty('challenge_token');
  });

  it.each([
    ['another host', {deep_link: 'https://evil.example/test_bot?start=link_' + TOKEN}],
    ['userinfo', {deep_link: 'https://evil@t.me/test_bot?start=link_' + TOKEN}],
    ['HTTP', {deep_link: 'http://t.me/test_bot?start=link_' + TOKEN}],
    ['a different token', {deep_link: 'https://t.me/test_bot?start=link_' + 'B'.repeat(43)}],
    ['extra query data', {deep_link: 'https://t.me/test_bot?start=link_' + TOKEN + '&next=evil'}],
    ['a fragment', {deep_link: 'https://t.me/test_bot?start=link_' + TOKEN + '#other'}],
    ['an invalid token', {challenge_token: 'invalid'}],
    ['expired challenge', {expires_at: NOW.toISOString()}],
    ['excessive challenge lifetime', {expires_at: new Date(NOW.getTime() + 301_000).toISOString()}],
    ['an expiry without a timezone', {expires_at: '2026-10-08T12:04:00'}],
  ])('rejects %s before exposing a Telegram link', async (_case, change) => {
    respond({...challenge(), ...change});
    await expect(issueTelegramLink(signal())).rejects.toThrow();
  });

  it('checks only the signed-in cookie account without requesting an admin assertion or exposing Telegram identity', async () => {
    const fetchMock = respond({...identity(), telegram_id: 123456, telegram_username: 'private_name'});
    const abortSignal = signal();
    expect(await getTelegramLinkStatus(USER_ID, abortSignal)).toEqual({linked: true, verified: true, verifiedUntil: Date.now() + 50_000});
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/auth/me/telegram-link/status', {
      cache: 'no-store', signal: abortSignal, headers: {'Content-Type': 'application/json'}, credentials: 'include',
    });
  });

  it.each([false, true])('accepts linked=%s with no fresh proof without turning absence into an error', async (linked) => {
    respond({...identity(), linked, verified: false, verified_until: null});
    expect(await getTelegramLinkStatus(USER_ID, signal())).toEqual({linked, verified: false, verifiedUntil: null});
  });

  it.each([2, 30, 90])('accepts a current session with %s days of remaining confirmation', async (days) => {
    const verifiedUntil = NOW.getTime() + days * 86_400_000;
    respond({...identity(), verified_until: new Date(verifiedUntil).toISOString()});
    expect(await getTelegramLinkStatus(USER_ID, signal())).toEqual({linked: true, verified: true, verifiedUntil});
  });

  it.each([
    ['another account UUID', {site_user_id: '164ff844-636f-42aa-9c23-60ced64a3fbe'}],
    ['a different schema', {schema_version: 2}],
    ['a non-boolean connection', {linked: 'true'}],
    ['a non-boolean proof', {verified: 1}],
    ['proof without a connection', {linked: false}],
    ['an expiry on unverified status', {verified: false}],
    ['missing proof expiry', {verified_until: null}],
    ['an expired proof', {verified_until: NOW.toISOString()}],
    ['a proof lasting longer than 90 days', {verified_until: new Date(NOW.getTime() + 90 * 86_400_000 + 1).toISOString()}],
    ['an expiry without a timezone', {verified_until: '2026-10-08T12:00:50'}],
  ])('rejects %s before showing confirmation', async (_case, change) => {
    respond({...identity(), ...change});
    await expect(getTelegramLinkStatus(USER_ID, signal())).rejects.toThrow();
  });

  it('cannot confirm an account whose authenticated ID is not a UUID', async () => {
    respond(identity());
    await expect(getTelegramLinkStatus(123, signal())).rejects.toThrow();
  });

  it.each([null, [], 'linked'])('rejects a malformed response envelope %s', async (body) => {
    respond(body);
    await expect(getTelegramLinkStatus(USER_ID, signal())).rejects.toThrow();
  });

  it.each([
    [401, 'sessionExpired'], [403, 'accessRequired'], [409, 'conflict'], [429, 'rateLimited'], [503, 'unavailable'],
  ])('maps HTTP %s to a safe recoverable state', (status, expected) => {
    expect(telegramLinkFailure({status, body: {message: 'private_detail'}})).toBe(expected);
  });

  it.each([
    ['120', 120_000], ['Thu, 08 Oct 2026 12:02:00 GMT', 120_000], ['invalid', 60_000], ['0', 60_000], [undefined, 60_000],
  ])('uses Retry-After %s before allowing another attempt', (retryAfter, delay) => {
    expect(telegramLinkRetryAt({retryAfter})).toBe(Date.now() + delay);
  });

  it('does not turn a Retry-After larger than the timer range into an immediate retry', () => {
    expect(telegramLinkRetryAt({retryAfter: '2147483648'})).toBe(Infinity);
  });
});
