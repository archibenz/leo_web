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
};

type MeApiResponse = {id: number | string; email: string; name: string; surname?: string};
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
      cachedUser = {id: me.id, email: me.email, name: me.name, surname: me.surname};
    })
    .catch(() => {
      // Stale/invalid token — drop it so the UI honestly shows signed-out.
      clearToken();
      cachedUser = null;
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
  const [, force] = useState(0);

  useEffect(() => {
    const listener = () => force((n) => n + 1);
    listeners.add(listener);
    // Fire-and-forget: resolveUser owns its own error handling, but catch here
    // too so nothing can escape as an unhandled rejection if it throws before
    // its internal chain is set up.
    resolveUser().catch(() => {});
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {user: cachedUser, ready: resolved};
}
