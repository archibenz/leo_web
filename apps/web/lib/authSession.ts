import {apiFetch} from './api';

export const AUTH_LOGOUT_KEY = 'reinasleo_logout';
type LogoutPhase = 'pending' | 'complete' | 'failed';

function publishLogout(phase: LogoutPhase): void {
  try {
    localStorage.setItem(AUTH_LOGOUT_KEY, JSON.stringify({phase, nonce: `${Date.now()}-${Math.random()}`}));
  } catch { /* cross-tab storage may be unavailable */ }
}

export function readLogoutPhase(event: StorageEvent): LogoutPhase | null {
  if (event.key !== AUTH_LOGOUT_KEY || !event.newValue) return null;
  try {
    if (event.storageArea && event.storageArea !== localStorage) return null;
    const data = JSON.parse(event.newValue);
    return typeof data.nonce === 'string' && ['pending', 'complete', 'failed'].includes(data.phase) ? data.phase : null;
  } catch { return null; }
}

// Only /auth/me uses 403 for a missing session; admin 403 is a permissions error.
export function isInvalidMeSession(error: unknown): boolean {
  const status = (error as {status?: number} | null)?.status;
  return status === 401 || status === 403;
}

export async function fetchSessionUser<T>(token: string | null, isCurrent: () => boolean): Promise<{user: T; cookieVerified: boolean}> {
  try {
    const user = await apiFetch<T>('/api/auth/me', {skipAuthHandler: true, skipBearer: true});
    return {user, cookieVerified: true};
  } catch (error) {
    // Only a definitive anonymous cookie response permits legacy bearer fallback.
    if (!token || !isInvalidMeSession(error) || !isCurrent()) throw error;
    const user = await apiFetch<T>('/api/auth/me', {skipAuthHandler: true});
    return {user, cookieVerified: false};
  }
}

export function authRetryDelay(error: unknown, attempt: number): number {
  const header = (error as {retryAfter?: string | null} | null)?.retryAfter?.trim();
  let wait = 0;
  if (header) {
    if (/^\d+$/.test(header)) wait = Number(header) * 1000;
    else if (!/^[+-]?\d/.test(header)) {
      const date = Date.parse(header);
      if (Number.isFinite(date)) wait = Math.max(0, date - Date.now());
    }
  }
  // A delay larger than setTimeout's range must never turn into an immediate retry.
  if (!Number.isFinite(wait) || wait > 2_147_483_647) return Infinity;
  return Math.max(1000 * (attempt + 1), wait);
}

export async function logoutSession(): Promise<void> {
  publishLogout('pending');
  try {
    await apiFetch<void>('/api/auth/logout', {method: 'POST', skipAuthHandler: true});
    publishLogout('complete');
  } catch (error) {
    publishLogout('failed');
    throw error;
  }
}
