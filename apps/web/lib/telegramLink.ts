import {apiFetch} from './api';

export type TelegramLinkChallenge = {deepLink: string; expiresAt: number};
export type TelegramLinkStatus = {linked: boolean; verified: boolean; verifiedUntil: number | null};
export type TelegramLinkFailure = 'sessionExpired' | 'accessRequired' | 'conflict' | 'rateLimited' | 'unavailable';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid response');
  return value as Record<string, unknown>;
}

function deadline(value: unknown, lifetime: number): number {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new Error('Invalid expiry');
  const expiresAt = Date.parse(value);
  const remaining = expiresAt - Date.now();
  if (!Number.isFinite(expiresAt) || remaining <= 0 || remaining > lifetime) throw new Error('Invalid expiry');
  return expiresAt;
}

export async function issueTelegramLink(signal: AbortSignal): Promise<TelegramLinkChallenge> {
  const data = record(await apiFetch<unknown>('/api/auth/me/telegram-link/challenge', {
    method: 'POST', cache: 'no-store', signal, skipAuthHandler: true, skipBearer: true,
  }));
  if (typeof data.challenge_token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.challenge_token)
    || typeof data.deep_link !== 'string') throw new Error('Invalid challenge');
  const link = new URL(data.deep_link);
  if (link.origin !== 'https://t.me' || link.username || link.password || link.hash
    || !/^\/[A-Za-z0-9_]{1,32}$/.test(link.pathname)
    || link.search !== `?start=link_${data.challenge_token}`) throw new Error('Invalid link');
  return {deepLink: link.href, expiresAt: deadline(data.expires_at, 300_000)};
}

export async function getTelegramLinkStatus(userId: string | number, signal: AbortSignal): Promise<TelegramLinkStatus> {
  const data = record(await apiFetch<unknown>('/api/auth/me/telegram-link/status', {
    cache: 'no-store', signal, skipAuthHandler: true, skipBearer: true,
  }));
  if (typeof userId !== 'string' || !UUID.test(userId)
    || data.schema_version !== 1 || data.site_user_id !== userId
    || typeof data.linked !== 'boolean' || typeof data.verified !== 'boolean'
    || (data.verified && !data.linked)
    || (!data.verified && data.verified_until !== null)) {
    throw new Error('Invalid identity');
  }
  return {
    linked: data.linked,
    verified: data.verified,
    verifiedUntil: data.verified ? deadline(data.verified_until, 90 * 86_400_000) : null,
  };
}

export function telegramLinkFailure(error: unknown): TelegramLinkFailure {
  const status = (error as {status?: unknown} | null)?.status;
  if (status === 401) return 'sessionExpired';
  if (status === 403) return 'accessRequired';
  if (status === 409) return 'conflict';
  if (status === 429) return 'rateLimited';
  return 'unavailable';
}

export function telegramLinkRetryAt(error: unknown): number {
  const value = (error as {retryAfter?: unknown} | null)?.retryAfter;
  const delay = typeof value === 'string' && /^\d+$/.test(value)
    ? Number(value) * 1000
    : typeof value === 'string' ? Date.parse(value) - Date.now() : NaN;
  if (delay > 2_147_483_647) return Infinity;
  return Date.now() + (Number.isFinite(delay) && delay > 0 ? delay : 60_000);
}
