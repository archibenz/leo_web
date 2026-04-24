// Browser: relative URL (current origin routes /api/* through nginx → Spring Boot).
// Server (Node.js SSR/RSC): relative URLs fail, so fall back to internal API URL.
// API_BASE_INTERNAL is set only on the prod server; dev defaults to localhost:8080.
export const API_BASE =
  typeof window !== 'undefined'
    ? ''
    : (process.env.API_BASE_INTERNAL
        || process.env.NEXT_PUBLIC_API_BASE
        || process.env.NEXT_PUBLIC_SITE_URL
        || 'http://127.0.0.1:8080');

const TOKEN_KEY = 'reinasleo_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export type ApiFetchOptions = RequestInit & {
  skipAuthHandler?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {skipAuthHandler, ...fetchOptions} = options;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    if (res.status === 401 && !skipAuthHandler) {
      unauthorizedHandler?.();
    }
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message ?? `API error ${res.status}`) as Error & {
      status: number;
      body: Record<string, unknown>;
    };
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return res.json() as Promise<T>;
}
