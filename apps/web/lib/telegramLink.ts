import {apiFetch} from './api';

export type TelegramLinkChallenge = {deepLink: string; expiresAt: number};
export type TelegramLinkFailure = 'sessionExpired' | 'accessRequired' | 'pending' | 'conflict' | 'rateLimited' | 'unavailable';

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
    method: 'POST', cache: 'no-store', signal, skipAuthHandler: true,
  }));
  if (typeof data.challenge_token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(data.challenge_token)
    || typeof data.deep_link !== 'string') throw new Error('Invalid challenge');
  const link = new URL(data.deep_link);
  if (link.origin !== 'https://t.me' || link.username || link.password || link.hash
    || !/^\/[A-Za-z0-9_]{1,32}$/.test(link.pathname)
    || link.search !== `?start=link_${data.challenge_token}`) throw new Error('Invalid link');
  return {deepLink: link.href, expiresAt: deadline(data.expires_at, 300_000)};
}

export async function verifyTelegramLink(userId: string | number, signal: AbortSignal): Promise<number> {
  const data = record(await apiFetch<unknown>('/api/admin/analytics-session', {
    cache: 'no-store', signal, skipAuthHandler: true,
  }));
  if (typeof userId !== 'string' || !UUID.test(userId)
    || data.schema_version !== 1 || data.site_user_id !== userId
    || data.telegram_verified !== true || data.is_admin !== true
    || typeof data.telegram_id !== 'number' || !Number.isSafeInteger(data.telegram_id) || data.telegram_id <= 0
    || !(data.telegram_username === null || typeof data.telegram_username === 'string')) {
    throw new Error('Invalid identity');
  }
  return deadline(data.expires_at, 60_000);
}

export function telegramLinkFailure(error: unknown): TelegramLinkFailure {
  const status = (error as {status?: unknown} | null)?.status;
  if (status === 401) return 'sessionExpired';
  if (status === 403) {
    const body = (error as {body?: unknown}).body;
    const message = body && typeof body === 'object' ? (body as {message?: unknown}).message : null;
    return message === 'telegram_link_required' || message === 'telegram_link_refresh_required' ? 'pending' : 'accessRequired';
  }
  if (status === 409) return 'conflict';
  if (status === 429) return 'rateLimited';
  return 'unavailable';
}
