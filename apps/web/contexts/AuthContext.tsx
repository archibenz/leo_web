'use client';

import {createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode} from 'react';
import {isValidEmail} from '../lib/validation';
import {apiFetch, setToken, clearToken, getToken, setUnauthorizedHandler} from '../lib/api';
import {showToast} from '../lib/toast';
import {isInvalidMeSession, authRetryDelay, fetchSessionUser, logoutSession, readLogoutPhase} from '../lib/authSession';

export type User = {
  id: string;
  email: string | null;
  name: string;
  surname?: string;
  createdAt?: string;
  role?: string;
  newsletterPromos?: boolean;
  newsletterCollections?: boolean;
  newsletterProjects?: boolean;
  hasPassword?: boolean;
  hasTelegram?: boolean;
};

type RegisterData = {
  email: string;
  code: string;
  firstName: string;
  surname?: string;
  password: string;
  dateOfBirth?: string;
  newsletter: boolean;
  newsletterPromos: boolean;
  newsletterCollections: boolean;
  newsletterProjects: boolean;
  privacyAccepted: boolean;
};

type NewsletterPreferences = {
  promos: boolean;
  collections: boolean;
  projects: boolean;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: boolean;
  retryAuth: () => Promise<void>;
  logoutError: boolean;
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<{success: boolean; error?: string}>;
  sendCode: (email: string) => Promise<{success: boolean; error?: string}>;
  register: (data: RegisterData) => Promise<{success: boolean; error?: string}>;
  linkEmail: (email: string, code: string) => Promise<{success: boolean; error?: string}>;
  updateNewsletterPreferences: (prefs: NewsletterPreferences) => Promise<{success: boolean; error?: string}>;
  initTelegramAuth: () => Promise<{success: boolean; deepLink?: string; initToken?: string; error?: string}>;
  loginWithToken: (jwt: string) => Promise<void>;
  deleteAccount: (credential: string, confirmation: string) => Promise<{success: boolean; error?: string}>;
  requestDeleteChallenge: () => Promise<{success: boolean; error?: string}>;
  logout: () => Promise<{success: boolean}>;
  validateEmail: (email: string) => boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/;

type LoginApiResponse = {
  token: string;
  id: string;
  email: string | null;
  name: string;
  surname?: string;
  role?: string;
};

type TelegramInitApiResponse = {
  token: string;
  deepLink: string;
};

type MeApiResponse = {
  id: string;
  email: string | null;
  name: string;
  surname?: string;
  dateOfBirth?: string;
  createdAt: string;
  role?: string;
  newsletterPromos?: boolean;
  newsletterCollections?: boolean;
  newsletterProjects?: boolean;
  hasPassword?: boolean;
  hasTelegram?: boolean;
};

function meToUser(data: MeApiResponse): User {
  return {
    id: data.id, email: data.email, name: data.name, surname: data.surname,
    createdAt: data.createdAt, role: data.role,
    newsletterPromos: data.newsletterPromos,
    newsletterCollections: data.newsletterCollections,
    newsletterProjects: data.newsletterProjects,
    hasPassword: data.hasPassword,
    hasTelegram: data.hasTelegram,
  };
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const generation = useRef(0);
  const mounted = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<{generation: number; token: string | null; promise: Promise<void>} | null>(null);
  const logoutRequest = useRef<Promise<{success: boolean}> | null>(null);
  const remoteLogoutBlocked = useRef(false);
  const remoteLogoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelRemoteLogoutTimer = useCallback(() => {
    if (remoteLogoutTimer.current !== null) clearTimeout(remoteLogoutTimer.current);
    remoteLogoutTimer.current = null;
  }, []);

  const cancelRetry = useCallback(() => {
    if (retryTimer.current !== null) clearTimeout(retryTimer.current);
    retryTimer.current = null;
  }, []);

  const isCurrent = useCallback((current: number, token: string | null) => (
    mounted.current && generation.current === current && getToken() === token
  ), []);

  const invalidate = useCallback(() => {
    generation.current += 1;
    cancelRetry();
    inflight.current = null;
    setUser(null);
    setAuthError(false);
    setIsLoading(false);
    return generation.current;
  }, [cancelRetry]);

  const verifySession = useCallback(function verify(token: string | null, current: number, attempt = 0): Promise<void> {
    if (!isCurrent(current, token)) return Promise.resolve();
    if (inflight.current?.generation === current && inflight.current.token === token) {
      return inflight.current.promise;
    }
    setIsLoading(true);
    setAuthError(false);
    let request!: Promise<void>;
    request = (async () => {
      try {
        const {user: data, cookieVerified} = await fetchSessionUser<MeApiResponse>(token, () => isCurrent(current, token));
        if (isCurrent(current, token)) {
          if (cookieVerified && token) {
            clearToken();
            token = getToken();
          }
          setUser(meToUser(data));
        }
      } catch (error) {
        if (isCurrent(current, token)) {
          setUser(null);
          if (isInvalidMeSession(error)) {
            clearToken();
            invalidate();
          } else {
            setAuthError(true);
            const delay = authRetryDelay(error, attempt);
            if (attempt < 2 && Number.isFinite(delay)) {
              retryTimer.current = setTimeout(() => {
                retryTimer.current = null;
                if (isCurrent(current, token)) void verify(token, current, attempt + 1).catch(() => {});
              }, delay);
            }
          }
        }
        throw error;
      } finally {
        if (isCurrent(current, token)) setIsLoading(false);
        if (inflight.current?.promise === request) inflight.current = null;
      }
    })();
    inflight.current = {generation: current, token, promise: request};
    return request;
  }, [invalidate, isCurrent]);

  const retryAuth = useCallback(async () => {
    if (logoutRequest.current || remoteLogoutBlocked.current) return;
    if (inflight.current && isCurrent(inflight.current.generation, inflight.current.token)) {
      await inflight.current.promise.catch(() => {});
      return;
    }
    const current = invalidate();
    await verifySession(getToken(), current).catch(() => {});
  }, [invalidate, isCurrent, verifySession]);

  useEffect(() => {
    mounted.current = true;
    setUnauthorizedHandler(() => {
      if (logoutRequest.current) return;
      clearToken();
      invalidate();
      showToast({kind: 'error', messageKey: 'auth.errors.sessionExpired'});
    });
    const current = invalidate();
    void verifySession(getToken(), current).catch(() => {});
    function handleStorage(e: StorageEvent) {
      const phase = readLogoutPhase(e);
      if (phase) {
        if (logoutRequest.current) return;
        cancelRemoteLogoutTimer();
        remoteLogoutBlocked.current = phase !== 'complete';
        if (phase === 'complete') clearToken();
        invalidate();
        setIsLoggingOut(phase === 'pending');
        setLogoutError(phase === 'failed');
        if (phase === 'pending') {
          remoteLogoutTimer.current = setTimeout(() => {
            remoteLogoutTimer.current = null;
            if (!mounted.current || logoutRequest.current) return;
            setIsLoggingOut(false);
            setLogoutError(true);
          }, 15_000);
        }
        return;
      }
      if (e.key !== 'reinasleo_token' || e.storageArea !== localStorage) return;
      const next = invalidate();
      if (!logoutRequest.current && !remoteLogoutBlocked.current) void verifySession(getToken(), next).catch(() => {});
    }
    window.addEventListener('storage', handleStorage);
    return () => {
      mounted.current = false;
      generation.current += 1;
      cancelRetry();
      cancelRemoteLogoutTimer();
      inflight.current = null;
      setUnauthorizedHandler(null);
      window.removeEventListener('storage', handleStorage);
    };
  }, [cancelRetry, cancelRemoteLogoutTimer, invalidate, verifySession]);

  const validateEmail = useCallback((email: string): boolean => {
    return isValidEmail(email);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{success: boolean; error?: string}> => {
    if (!isValidEmail(email)) {
      return {success: false, error: 'invalid_email'};
    }

    if (remoteLogoutBlocked.current) return {success: false, error: 'login_failed'};
    if (logoutRequest.current) await logoutRequest.current;
    const current = invalidate();
    const previousToken = getToken();
    try {
      const data = await apiFetch<LoginApiResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({email: email.trim(), password}),
        skipAuthHandler: true,
      });

      if (!isCurrent(current, previousToken)) return {success: false, error: 'login_failed'};
      setToken(data.token);
      try {
        await verifySession(getToken(), current);
        if (isCurrent(current, getToken())) setLogoutError(false);
      } catch (meErr) {
        if (isInvalidMeSession(meErr)) return {success: false, error: 'login_failed'};
      }
      return {success: true};
    } catch (err: unknown) {
      const apiErr = err as {status?: number; body?: {error?: string}};
      if (apiErr.status === 401) {
        return {success: false, error: 'invalid_credentials'};
      }
      return {success: false, error: 'login_failed'};
    }
  }, [invalidate, isCurrent, verifySession]);

  const sendCode = useCallback(async (email: string): Promise<{success: boolean; error?: string}> => {
    if (!isValidEmail(email)) {
      return {success: false, error: 'invalid_email'};
    }

    try {
      await apiFetch<{message: string}>('/api/auth/send-code', {
        method: 'POST',
        body: JSON.stringify({email: email.trim()}),
        skipAuthHandler: true,
      });
      return {success: true};
    } catch (err: unknown) {
      console.error('sendCode failed', err);
      const apiErr = err as {status?: number};
      if (apiErr.status === 429) return {success: false, error: 'rate_limited'};
      if (apiErr.status === undefined) return {success: false, error: 'network_error'};
      return {success: false, error: 'send_code_failed'};
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<{success: boolean; error?: string}> => {
    if (!isValidEmail(data.email)) {
      return {success: false, error: 'invalid_email'};
    }
    if (!PASSWORD_RE.test(data.password)) {
      return {success: false, error: 'password_weak'};
    }
    if (!data.firstName.trim()) {
      return {success: false, error: 'name_required'};
    }
    const trimmedFirst = data.firstName.trim();
    if (trimmedFirst.length < 2 || trimmedFirst.length > 40) {
      return {success: false, error: 'name_length'};
    }
    const trimmedSurname = data.surname?.trim();
    if (trimmedSurname && (trimmedSurname.length < 2 || trimmedSurname.length > 40)) {
      return {success: false, error: 'surname_length'};
    }
    if (!data.privacyAccepted) {
      return {success: false, error: 'privacy_required'};
    }

    if (remoteLogoutBlocked.current) return {success: false, error: 'registration_failed'};
    if (logoutRequest.current) await logoutRequest.current;
    const current = invalidate();
    const previousToken = getToken();
    try {
      const resp = await apiFetch<LoginApiResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email.trim(),
          code: data.code.trim(),
          firstName: data.firstName.trim(),
          surname: data.surname?.trim() || null,
          password: data.password,
          dateOfBirth: data.dateOfBirth || null,
          newsletter: data.newsletter,
          newsletterPromos: data.newsletterPromos,
          newsletterCollections: data.newsletterCollections,
          newsletterProjects: data.newsletterProjects,
          privacyAccepted: data.privacyAccepted,
        }),
        skipAuthHandler: true,
      });

      if (!isCurrent(current, previousToken)) return {success: false, error: 'registration_failed'};
      setToken(resp.token);
      try {
        await verifySession(getToken(), current);
        if (isCurrent(current, getToken())) setLogoutError(false);
      } catch (meErr) {
        if (isInvalidMeSession(meErr)) return {success: false, error: 'registration_failed'};
      }
      return {success: true};
    } catch (err: unknown) {
      console.error('register failed', err);
      const apiErr = err as {
        status?: number;
        body?: {
          error?: string;
          message?: string;
          errors?: Array<{field?: string; message?: string}>;
        };
      };
      if (apiErr.status === 409) return {success: false, error: 'email_exists'};
      if (apiErr.status === 429) return {success: false, error: 'rate_limited'};
      if (apiErr.status === undefined) return {success: false, error: 'network_error'};
      if (apiErr.status === 400) {
        if (apiErr.body?.error === 'privacy_required') {
          return {success: false, error: 'privacy_required'};
        }
        const fieldErrors = apiErr.body?.errors;
        if (Array.isArray(fieldErrors)) {
          const passwordErr = fieldErrors.find(e => e?.field === 'password');
          if (passwordErr) return {success: false, error: 'password_weak'};
          const codeErr = fieldErrors.find(e => e?.field === 'code');
          if (codeErr) return {success: false, error: 'invalid_code'};
        }
        const bodyErr = apiErr.body?.error ?? apiErr.body?.message;
        if (typeof bodyErr === 'string' && bodyErr.toLowerCase().includes('code')) {
          return {success: false, error: 'invalid_code'};
        }
      }
      return {success: false, error: 'registration_failed'};
    }
  }, [invalidate, isCurrent, verifySession]);

  const linkEmail = useCallback(async (email: string, code: string): Promise<{success: boolean; error?: string}> => {
    if (!isValidEmail(email)) {
      return {success: false, error: 'invalid_email'};
    }

    const current = generation.current;
    const token = getToken();
    try {
      const data = await apiFetch<MeApiResponse>('/api/auth/link-email', {
        method: 'POST',
        body: JSON.stringify({email: email.trim(), code: code.trim()}),
        skipAuthHandler: true,
      });
      if (isCurrent(current, token)) setUser(meToUser(data));
      return {success: true};
    } catch (err: unknown) {
      const apiErr = err as {status?: number; body?: {error?: string}};
      if (apiErr.status === 409) {
        return {success: false, error: 'email_already_linked'};
      }
      if (apiErr.status === 400) {
        return {success: false, error: 'invalid_code'};
      }
      return {success: false, error: 'link_failed'};
    }
  }, [isCurrent]);

  const updateNewsletterPreferences = useCallback(async (prefs: NewsletterPreferences): Promise<{success: boolean; error?: string}> => {
    const current = generation.current;
    const token = getToken();
    try {
      const data = await apiFetch<MeApiResponse>('/api/auth/newsletter-preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      });
      if (isCurrent(current, token)) setUser(meToUser(data));
      return {success: true};
    } catch {
      return {success: false, error: 'update_failed'};
    }
  }, [isCurrent]);

  const initTelegramAuth = useCallback(async (): Promise<{success: boolean; deepLink?: string; initToken?: string; error?: string}> => {
    try {
      const data = await apiFetch<TelegramInitApiResponse>('/api/auth/telegram/init', {
        method: 'POST',
        skipAuthHandler: true,
      });
      return {success: true, deepLink: data.deepLink, initToken: data.token};
    } catch {
      return {success: false, error: 'telegram_init_failed'};
    }
  }, []);

  const loginWithToken = useCallback(async (jwt: string) => {
    if (remoteLogoutBlocked.current) throw new Error('Logout is not complete');
    if (logoutRequest.current) await logoutRequest.current;
    const current = invalidate();
    setToken(jwt);
    await verifySession(getToken(), current);
    if (isCurrent(current, getToken())) setLogoutError(false);
  }, [invalidate, isCurrent, verifySession]);

  const isAdmin = user?.role === 'admin' && !isLoading && !authError && !logoutError && !isLoggingOut;

  const logout = useCallback((): Promise<{success: boolean}> => {
    if (logoutRequest.current) return logoutRequest.current;
    cancelRemoteLogoutTimer();
    invalidate();
    clearToken();
    setIsLoggingOut(true);
    let cleared = false;
    const request = logoutSession().then(() => {
      cleared = true;
      remoteLogoutBlocked.current = false;
      if (mounted.current && logoutRequest.current === request) setLogoutError(false);
      return {success: true};
    }).catch(() => {
      if (mounted.current && logoutRequest.current === request) setLogoutError(true);
      return {success: false};
    }).finally(() => {
      if (logoutRequest.current !== request) return;
      logoutRequest.current = null;
      if (!mounted.current) return;
      setIsLoggingOut(false);
      const token = getToken();
      if (cleared && token) {
        const current = invalidate();
        void verifySession(token, current).catch(() => {});
      }
    });
    logoutRequest.current = request;
    return request;
  }, [cancelRemoteLogoutTimer, invalidate, verifySession]);

  const requestDeleteChallenge = useCallback(async (): Promise<{success: boolean; error?: string}> => {
    try {
      await apiFetch<void>('/api/auth/me/delete-challenge', {
        method: 'POST',
        skipAuthHandler: true,
      });
      return {success: true};
    } catch (err: unknown) {
      const apiErr = err as {status?: number};
      if (apiErr.status === 401) return {success: false, error: 'invalid_credentials'};
      if (apiErr.status === 409) return {success: false, error: 'challenge_not_supported'};
      if (apiErr.status === undefined) return {success: false, error: 'network_error'};
      return {success: false, error: 'challenge_failed'};
    }
  }, []);

  const deleteAccount = useCallback(async (credential: string, confirmation: string): Promise<{success: boolean; error?: string}> => {
    const current = generation.current;
    const token = getToken();
    try {
      await apiFetch<void>('/api/auth/me', {
        method: 'DELETE',
        body: JSON.stringify({credential, confirmation}),
        skipAuthHandler: true,
      });
      if (isCurrent(current, token)) {
        clearToken();
        invalidate();
      }
      return {success: true};
    } catch (err: unknown) {
      const apiErr = err as {status?: number; body?: {error?: string}};
      if (apiErr.status === 401) {
        return {success: false, error: 'invalid_credentials'};
      }
      if (apiErr.status === 400) {
        const bodyErr = apiErr.body?.error;
        if (bodyErr === 'confirmation_mismatch') {
          return {success: false, error: 'confirmation_mismatch'};
        }
        return {success: false, error: 'bad_request'};
      }
      if (apiErr.status === undefined) return {success: false, error: 'network_error'};
      return {success: false, error: 'delete_failed'};
    }
  }, [invalidate, isCurrent]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user && !authError && !logoutError && !isLoggingOut,
    isLoading,
    authError,
    retryAuth,
    logoutError,
    isLoggingOut,
    login,
    sendCode,
    register,
    linkEmail,
    updateNewsletterPreferences,
    initTelegramAuth,
    loginWithToken,
    deleteAccount,
    requestDeleteChallenge,
    logout,
    validateEmail,
    isAdmin,
  }), [user, isLoading, authError, retryAuth, logoutError, isLoggingOut, login, sendCode, register, linkEmail, updateNewsletterPreferences, initTelegramAuth, loginWithToken, deleteAccount, requestDeleteChallenge, logout, validateEmail, isAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: false,
  retryAuth: async () => {},
  logoutError: false,
  isLoggingOut: false,
  login: async () => ({success: false}),
  sendCode: async () => ({success: false}),
  register: async () => ({success: false}),
  linkEmail: async () => ({success: false}),
  updateNewsletterPreferences: async () => ({success: false}),
  initTelegramAuth: async () => ({success: false}),
  loginWithToken: async () => {},
  deleteAccount: async () => ({success: false}),
  requestDeleteChallenge: async () => ({success: false}),
  logout: async () => ({success: false}),
  validateEmail: () => false,
  isAdmin: false,
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
}
