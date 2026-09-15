import {useEffect, useState} from 'react';
import {apiFetch, getToken, setToken, clearToken} from '../lib/api';

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
const listeners = new Set<() => void>();

function broadcast(): void {
  for (const l of listeners) l();
}

async function resolveUser(): Promise<void> {
  if (resolved || inflight) return inflight ?? Promise.resolve();
  if (!getToken()) {
    resolved = true;
    // Notify subscribers just like the token path does — a guest's first
    // render sees ready=false, and without this no re-render ever follows.
    broadcast();
    return;
  }
  inflight = apiFetch<MeApiResponse>('/api/auth/me', {skipAuthHandler: true})
    .then((me) => {
      cachedUser = {
        id: me.id,
        email: me.email,
        name: me.name,
        surname: me.surname,
        role: me.role,
      };
    })
    .catch((err: unknown) => {
      cachedUser = null;
      // Токен стираем ТОЛЬКО на 401, то есть когда бэкенд сказал «этот токен
      // недействителен». Раньше стирали на любой неудаче — и тогда всякая
      // временная беда выкидывала посетителя из аккаунта: 429 от лимитера,
      // 502 при перезапуске API, оборванная сеть в лифте. apiFetch бросает
      // на ЛЮБОМ плохом ответе, так что «не получилось спросить» было
      // неотличимо от «тебе больше нельзя».
      const status = (err as {status?: number} | null)?.status;
      if (status === 401) clearToken();
    })
    .finally(() => {
      resolved = true;
      inflight = null;
      broadcast();
    });
  return inflight;
}

// Adopt a JWT minted elsewhere (the Telegram bot flow hands one over via
// /api/auth/telegram/poll) and refresh the cached user from it.
export async function whiteAdoptToken(token: string): Promise<{ok: boolean}> {
  setToken(token);
  resolved = false;
  cachedUser = null;
  await resolveUser();
  return {ok: cachedUser != null};
}

export async function whiteLogin(email: string, password: string): Promise<{ok: boolean; error?: string}> {
  try {
    const data = await apiFetch<LoginApiResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({email: email.trim(), password}),
      skipAuthHandler: true,
    });
    setToken(data.token);
    resolved = false;
    cachedUser = null;
    await resolveUser();
    return {ok: cachedUser != null};
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
    setToken(resp.token);
    resolved = false;
    cachedUser = null;
    await resolveUser();
    return {ok: cachedUser != null};
  } catch {
    return {ok: false, error: 'register'};
  }
}

export function whiteLogout(): void {
  clearToken();
  cachedUser = null;
  resolved = true;
  broadcast();
}

export function useWhiteAuth(): {user: WhiteUser | null; ready: boolean} {
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
    setMounted(true);
    // Fire-and-forget: resolveUser owns its own error handling, but catch here
    // too so nothing can escape as an unhandled rejection if it throws before
    // its internal chain is set up.
    resolveUser().catch(() => {});
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!mounted) return {user: null, ready: false};
  return {user: cachedUser, ready: resolved};
}
