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
let sessionGeneration = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === TOKEN_KEY || event.key === 'reinasleo_logout' || event.key === null) sessionGeneration++;
  });
}

// localStorage access can throw, not just return null: Safari private mode,
// storage disabled by policy, or blocked third-party cookies all raise
// SecurityError/QuotaExceededError. Swallow it so a read degrades to
// "signed out" and a write is best-effort, rather than throwing synchronously
// into callers (e.g. the async resolveUser, where it would surface as an
// unhandled rejection).
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  sessionGeneration++;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* storage unavailable — best-effort */
  }
}

export function clearToken(): void {
  sessionGeneration++;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — best-effort */
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;
const pendingCookieResponses = new Set<Promise<Response>>();
const cookieAuthPaths = new Set([
  '/api/auth/login', '/api/auth/register', '/api/auth/telegram/poll', '/api/auth/telegram/exchange',
]);

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export type ApiFetchOptions = RequestInit & {
  skipAuthHandler?: boolean;
  skipBearer?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {skipAuthHandler, skipBearer, ...fetchOptions} = options;
  if (path === '/api/auth/logout' && fetchOptions.method?.toUpperCase() === 'POST') {
    sessionGeneration++;
    // A late login response can set the cookie again after logout has cleared it.
    if (pendingCookieResponses.size) {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.allSettled([...pendingCookieResponses]),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Authentication response is still pending')), 15_000);
          }),
        ]);
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
    }
  }
  const version = sessionGeneration;
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> ?? {}),
  };
  if (token && !skipBearer && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    // Send the httpOnly rl_session cookie automatically. New logins are
    // authenticated via the cookie; existing localStorage tokens still work
    // through the Authorization header above (transitional period).
    credentials: 'include',
  });
  if (cookieAuthPaths.has(path)) {
    pendingCookieResponses.add(response);
    void response.then(
      () => pendingCookieResponses.delete(response),
      () => pendingCookieResponses.delete(response),
    );
  }
  const res = await response;

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    const usesSession = !headers['Authorization'] || headers['Authorization'] === `Bearer ${token}`;
    if (res.status === 401 && !skipAuthHandler && usesSession && version === sessionGeneration && token === getToken()) {
      unauthorizedHandler?.();
    }
    const body = await res.json().catch((e) => {
      console.error('apiFetch: failed to parse JSON response', {status: res.status, error: e});
      return {} as Record<string, unknown>;
    });
    const err = new Error(body.message ?? `API error ${res.status}`) as Error & {
      status: number;
      body: Record<string, unknown>;
      retryAfter: string | null;
    };
    err.status = res.status;
    err.body = body;
    err.retryAfter = res.headers?.get('Retry-After') ?? null;
    throw err;
  }

  const data = await res.json() as T;
  if (cookieAuthPaths.has(path) && version !== sessionGeneration) {
    throw new Error('Authentication request superseded');
  }
  return data;
}
