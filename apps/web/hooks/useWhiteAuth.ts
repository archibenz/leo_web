import {useEffect, useState} from 'react';
import {apiFetch, getToken, setToken, clearToken} from '../lib/api';
import {authRetryDelay, fetchSessionUser, isInvalidMeSession, logoutSession, readLogoutPhase} from '../lib/authSession';

// White-side auth over the existing backend (/api/auth/*): a light module
// store instead of the gradient's AuthContext — White pages don't mount the
// gradient providers. The JWT lives under the same key, so a session started
// on either design is valid on both.

export type WhiteUser = {
  id: number | string;
  email: string;
  name: string;
  surname?: string;
  // `/api/auth/me` отдаёт роль тем же ответом (UserResponse.role) — раньше её
  // здесь выбрасывали, и режим правки спрашивал ту же ручку ВТОРОЙ раз ради
  // одного поля. Два запроса на страницу против лимита в десять в минуту:
  // пять переходов подряд, и владелец получал 429 на ровном месте.
  role?: string;
};

type MeApiResponse = {
  id: number | string;
  email: string;
  name: string;
  surname?: string;
  role?: string;
};
type LoginApiResponse = {token: string};

// Letters and digits, 8-128 — the backend's own rule (mirrors the gradient form).
export const WHITE_PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

let cachedUser: WhiteUser | null = null;
let resolved = false;
let inflight: Promise<void> | null = null;
let generation = 0;
let sessionToken: string | null = null;
let authError = false;
let logoutError = false;
let isLoggingOut = false;
let logoutInflight: Promise<{ok: boolean}> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let remoteLogoutTimer: ReturnType<typeof setTimeout> | null = null;
let retryAt: number | null = null;
let retries = 0;
const listeners = new Set<() => void>();

function broadcast(): void {
  for (const l of listeners) l();
}

function cancelRetry(): void {
  if (retryTimer != null) clearTimeout(retryTimer);
  retryTimer = null;
}

function cancelRemoteLogoutTimer(): void {
  if (remoteLogoutTimer != null) clearTimeout(remoteLogoutTimer);
  remoteLogoutTimer = null;
}

function watchRemoteLogout(): void {
  cancelRemoteLogoutTimer();
  remoteLogoutTimer = setTimeout(() => {
    remoteLogoutTimer = null;
    if (logoutInflight || !isLoggingOut) return;
    isLoggingOut = false;
    logoutError = true;
    broadcast();
  }, 15_000);
}

function resetSession(token: string | null): void {
  generation++;
  sessionToken = token;
  cachedUser = null;
  resolved = isLoggingOut || logoutError;
  authError = false;
  inflight = null;
  retries = 0;
  retryAt = null;
  cancelRetry();
}

function isCurrent(version: number, token: string | null): boolean {
  return generation === version && sessionToken === token && getToken() === token;
}

function scheduleRetry(): void {
  if (!listeners.size || retryTimer != null || retryAt == null || !Number.isFinite(retryAt)) return;
  const version = generation;
  const token = sessionToken;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    retryAt = null;
    if (!isCurrent(version, token) || !authError || isLoggingOut || logoutError) return;
    retries++;
    resolved = false;
    authError = false;
    broadcast();
    void resolveUser();
  }, Math.max(0, retryAt - Date.now()));
}

async function resolveUser(): Promise<void> {
  let token = getToken();
  if (token !== sessionToken) resetSession(token);
  if (isLoggingOut || logoutError) return;
  if (resolved || inflight) return inflight ?? Promise.resolve();
  const version = generation;
  let failure: unknown;
  const request = fetchSessionUser<MeApiResponse>(token, () => isCurrent(version, token))
    .then(({user: me, cookieVerified}) => {
      if (!isCurrent(version, token)) return;
      if (cookieVerified && token) {
        clearToken();
        token = sessionToken = getToken();
      }
      cachedUser = {
        id: me.id,
        email: me.email,
        name: me.name,
        surname: me.surname,
        role: me.role,
      };
    })
    .catch((err: unknown) => {
      if (!isCurrent(version, token)) return;
      cachedUser = null;
      if (isInvalidMeSession(err)) {
        clearToken();
        resetSession(null);
        resolved = true;
        broadcast();
      } else {
        authError = true;
        failure = err;
      }
    })
    .finally(() => {
      if (!isCurrent(version, token) || inflight !== request) return;
      resolved = true;
      inflight = null;
      broadcast();
      if (authError && retries < 2) {
        retryAt = Date.now() + authRetryDelay(failure, retries);
        scheduleRetry();
      }
    });
  inflight = request;
  return request;
}

export async function whiteRetryAuth(): Promise<void> {
  if (inflight || isLoggingOut || logoutError) return inflight ?? Promise.resolve();
  cancelRetry();
  retryAt = null;
  retries = 0;
  resolved = false;
  authError = false;
  broadcast();
  await resolveUser();
}

// Adopt a JWT minted elsewhere (the Telegram bot flow hands one over via
// /api/auth/telegram/poll) and refresh the cached user from it.
export async function whiteAdoptToken(token: string): Promise<{ok: boolean}> {
  if (isLoggingOut || logoutError) return {ok: false};
  setToken(token);
  resetSession(getToken());
  const version = generation;
  await resolveUser();
  return {ok: generation === version && cachedUser != null};
}

export async function whiteLogin(email: string, password: string): Promise<{ok: boolean; error?: string}> {
  if (isLoggingOut || logoutError) return {ok: false, error: 'logout'};
  const version = generation;
  try {
    const data = await apiFetch<LoginApiResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({email: email.trim(), password}),
      skipAuthHandler: true,
    });
    if (version !== generation) return {ok: false};
    return await whiteAdoptToken(data.token);
  } catch {
    return {ok: false, error: 'credentials'};
  }
}

export async function whiteSendCode(email: string): Promise<{ok: boolean}> {
  try {
    await apiFetch<{message: string}>('/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({email: email.trim()}),
      skipAuthHandler: true,
    });
    return {ok: true};
  } catch {
    return {ok: false};
  }
}

export async function whiteRegister(data: {email: string; code: string; firstName: string; password: string}): Promise<{ok: boolean; error?: string}> {
  if (isLoggingOut || logoutError) return {ok: false, error: 'logout'};
  const version = generation;
  try {
    const resp = await apiFetch<LoginApiResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email.trim(),
        code: data.code.trim(),
        firstName: data.firstName.trim(),
        password: data.password,
        // The sign-up form gates submit on a required consent checkbox, so a
        // request reaching here always carries an explicit consent action.
        privacyAccepted: true,
        newsletter: false,
        newsletterPromos: false,
        newsletterCollections: false,
        newsletterProjects: false,
      }),
      skipAuthHandler: true,
    });
    if (version !== generation) return {ok: false};
    return await whiteAdoptToken(resp.token);
  } catch {
    return {ok: false, error: 'register'};
  }
}

export function whiteLogout(): Promise<{ok: boolean}> {
  if (logoutInflight) return logoutInflight;
  cancelRemoteLogoutTimer();
  clearToken();
  resetSession(null);
  resolved = true;
  logoutError = false;
  isLoggingOut = true;
  broadcast();
  const request = logoutSession()
    .then(() => {
      logoutError = false;
      return {ok: true};
    })
    .catch(() => {
      logoutError = true;
      return {ok: false};
    })
    .finally(() => {
      if (logoutInflight !== request) return;
      logoutInflight = null;
      isLoggingOut = false;
      if (!logoutError && getToken()) {
        resolved = false;
        void resolveUser();
      }
      broadcast();
    });
  logoutInflight = request;
  return request;
}

function syncStorage(event: StorageEvent): void {
  const phase = readLogoutPhase(event);
  if (phase) {
    if (logoutInflight) return;
    cancelRemoteLogoutTimer();
    isLoggingOut = phase === 'pending';
    logoutError = phase === 'failed';
    if (phase === 'complete') clearToken();
    resetSession(getToken());
    resolved = true;
    if (phase === 'pending') watchRemoteLogout();
    broadcast();
    return;
  }
  if (event.key !== 'reinasleo_token' && event.key !== null) return;
  try {
    if (event.storageArea && event.storageArea !== window.localStorage) return;
  } catch {return;}
  resetSession(getToken());
  broadcast();
  void resolveUser();
}

export function useWhiteAuth(): {
  user: WhiteUser | null; ready: boolean; authError: boolean; logoutError: boolean; isLoggingOut: boolean;
} {
  // The store is module state, and by the time a page subtree hydrates it may
  // already have been resolved by a component that hydrated earlier — the
  // header calls this hook too, and for a guest resolveUser() flips `resolved`
  // synchronously. Reading it straight out during render therefore made the
  // first client render disagree with the server's, and React threw the
  // account page away and re-rendered it. The first render on the client has
  // to be the server's render; only after mount may it differ.
  const [mounted, setMounted] = useState(false);
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    if (listeners.size === 1) window.addEventListener('storage', syncStorage);
    setMounted(true);
    // Fire-and-forget: resolveUser owns its own error handling, but catch here
    // too so nothing can escape as an unhandled rejection if it throws before
    // its internal chain is set up.
    resolveUser().catch(() => {});
    scheduleRetry();
    if (isLoggingOut && !logoutInflight && remoteLogoutTimer === null) watchRemoteLogout();
    return () => {
      listeners.delete(listener);
      if (!listeners.size) {
        window.removeEventListener('storage', syncStorage);
        cancelRetry();
        cancelRemoteLogoutTimer();
      }
    };
  }, []);

  if (!mounted) return {user: null, ready: false, authError: false, logoutError: false, isLoggingOut: false};
  return {user: cachedUser, ready: resolved, authError, logoutError, isLoggingOut};
}
