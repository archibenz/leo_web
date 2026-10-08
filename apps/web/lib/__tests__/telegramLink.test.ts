import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {issueTelegramLink, verifyTelegramLink} from '../telegramLink';

const USER_ID = '7813985d-1748-4537-9583-06c81b849c4c';
const NOW = new Date('2026-10-08T12:00:00Z');
const TOKEN = 'A'.repeat(43);
const signal = () => new AbortController().signal;
const challenge = () => ({challenge_token: TOKEN, deep_link: `https://t.me/test_bot?start=link_${TOKEN}`, expires_at: new Date(Date.now() + 240_000).toISOString()});
const identity = () => ({schema_version: 1, site_user_id: USER_ID, telegram_id: 123456789,
  telegram_verified: true, is_admin: true, telegram_username: null, expires_at: new Date(Date.now() + 50_000).toISOString()});

function respond(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({ok: status === 200, status, json: async () => body});
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Telegram linking transport and trusted response', () => {
  it('issues a cookie-backed, uncached challenge without an account or Telegram ID in the request', async () => {
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
    ['another host', {deep_link: `https://evil.example/test_bot?start=link_${TOKEN}`}],
    ['userinfo', {deep_link: `https://evil@t.me/test_bot?start=link_${TOKEN}`}],
    ['HTTP', {deep_link: `http://t.me/test_bot?start=link_${TOKEN}`}],
    ['a different token', {deep_link: `https://t.me/test_bot?start=link_${'B'.repeat(43)}`}],
    ['extra query data', {deep_link: `https://t.me/test_bot?start=link_${TOKEN}&next=evil`}],
    ['a fragment', {deep_link: `https://t.me/test_bot?start=link_${TOKEN}#other`}],
    ['an invalid token', {challenge_token: 'invalid'}],
    ['expired challenge', {expires_at: NOW.toISOString()}],
    ['excessive challenge lifetime', {expires_at: new Date(NOW.getTime() + 301_000).toISOString()}],
    ['an expiry without a timezone', {expires_at: '2026-10-08T12:04:00'}],
  ])('rejects %s before exposing a Telegram link', async (_case, change) => {
    respond({...challenge(), ...change});
    await expect(issueTelegramLink(signal())).rejects.toThrow();
  });

  it('checks a fresh live identity through the admin endpoint with the same cookie', async () => {
    const fetchMock = respond(identity());
    const abortSignal = signal();
    expect(await verifyTelegramLink(USER_ID, abortSignal)).toBe(Date.now() + 50_000);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/admin/analytics-session', {
      cache: 'no-store', signal: abortSignal, headers: {'Content-Type': 'application/json'}, credentials: 'include',
    });
  });

  it.each([
    ['another account UUID', {site_user_id: '164ff844-636f-42aa-9c23-60ced64a3fbe'}],
    ['unverified Telegram', {telegram_verified: false}],
    ['a non-admin', {is_admin: false}],
    ['a different schema', {schema_version: 2}],
    ['Telegram ID as text', {telegram_id: '123456789'}],
    ['non-positive Telegram ID', {telegram_id: 0}],
    ['fractional Telegram ID', {telegram_id: 1.1}],
    ['unsafe numeric Telegram ID', {telegram_id: Number.MAX_SAFE_INTEGER + 1}],
    ['invalid username', {telegram_username: 12}],
    ['an expired assertion', {expires_at: NOW.toISOString()}],
    ['an excessive assertion lifetime', {expires_at: new Date(NOW.getTime() + 61_000).toISOString()}],
    ['an expiry without a timezone', {expires_at: '2026-10-08T12:00:50'}],
  ])('rejects %s before showing confirmation', async (_case, change) => {
    respond({...identity(), ...change});
    await expect(verifyTelegramLink(USER_ID, signal())).rejects.toThrow();
  });

  it('cannot confirm an account whose authenticated ID is not a UUID', async () => {
    respond(identity());
    await expect(verifyTelegramLink(123, signal())).rejects.toThrow();
  });
});
