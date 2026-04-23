'use client';

import {createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode} from 'react';
import {isValidEmail} from '../lib/validation';
import {apiFetch, setToken, clearToken, getToken, setUnauthorizedHandler} from '../lib/api';
import {showToast} from '../lib/toast';

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
  login: (email: string, password: string) => Promise<{success: boolean; error?: string}>;
  sendCode: (email: string) => Promise<{success: boolean; error?: string}>;
  register: (data: RegisterData) => Promise<{success: boolean; error?: string}>;
  linkEmail: (email: string, code: string) => Promise<{success: boolean; error?: string}>;
  updateNewsletterPreferences: (prefs: NewsletterPreferences) => Promise<{success: boolean; error?: string}>;
  initTelegramAuth: () => Promise<{success: boolean; deepLink?: string; initToken?: string; error?: string}>;
  loginWithToken: (jwt: string) => Promise<void>;
  logout: () => void;
  validateEmail: (email: string) => boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

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
};

function meToUser(data: MeApiResponse): User {
  return {
    id: data.id, email: data.email, name: data.name, surname: data.surname,
    createdAt: data.createdAt, role: data.role,
    newsletterPromos: data.newsletterPromos,
    newsletterCollections: data.newsletterCollections,
    newsletterProjects: data.newsletterProjects,
  };
}

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
      showToast({kind: 'error', messageKey: 'auth.errors.sessionExpired'});
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    apiFetch<MeApiResponse>('/api/auth/me', {skipAuthHandler: true})
      .then(data => setUser(meToUser(data)))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const validateEmail = useCallback((email: string): boolean => {
    return isValidEmail(email);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{success: boolean; error?: string}> => {
    if (!isValidEmail(email)) {
      return {success: false, error: 'invalid_email'};
    }

    try {
      const data = await apiFetch<LoginApiResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({email: email.trim(), password}),
        skipAuthHandler: true,
      });

      setToken(data.token);
      setUser({id: data.id, email: data.email, name: data.name, surname: data.surname, role: data.role});
      return {success: true};
    } catch (err: unknown) {
      const apiErr = err as {status?: number; body?: {error?: string}};
      if (apiErr.status === 401) {
        return {success: false, error: 'invalid_credentials'};
      }
      return {success: false, error: 'login_failed'};
    }
  }, []);

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
    if (data.password.length < 6) {
      return {success: false, error: 'password_too_short'};
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

      setToken(resp.token);
      setUser({id: resp.id, email: resp.email, name: resp.name, surname: resp.surname, role: resp.role});
      return {success: true};
    } catch (err: unknown) {
      console.error('register failed', err);
      const apiErr = err as {status?: number; body?: {error?: string; message?: string}};
      if (apiErr.status === 409) return {success: false, error: 'email_exists'};
      if (apiErr.status === 429) return {success: false, error: 'rate_limited'};
      if (apiErr.status === undefined) return {success: false, error: 'network_error'};
      const bodyErr = apiErr.body?.error ?? apiErr.body?.message;
      if (apiErr.status === 400 && typeof bodyErr === 'string' && bodyErr.toLowerCase().includes('code')) {
        return {success: false, error: 'invalid_code'};
      }
      return {success: false, error: 'registration_failed'};
    }
  }, []);

  const linkEmail = useCallback(async (email: string, code: string): Promise<{success: boolean; error?: string}> => {
    if (!isValidEmail(email)) {
      return {success: false, error: 'invalid_email'};
    }

    try {
      const data = await apiFetch<MeApiResponse>('/api/auth/link-email', {
        method: 'POST',
        body: JSON.stringify({email: email.trim(), code: code.trim()}),
        skipAuthHandler: true,
      });
      setUser(meToUser(data));
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
  }, []);

  const updateNewsletterPreferences = useCallback(async (prefs: NewsletterPreferences): Promise<{success: boolean; error?: string}> => {
    try {
      const data = await apiFetch<MeApiResponse>('/api/auth/newsletter-preferences', {
        method: 'PUT',
        body: JSON.stringify(prefs),
      });
      setUser(meToUser(data));
      return {success: true};
    } catch {
      return {success: false, error: 'update_failed'};
    }
  }, []);

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
    setToken(jwt);
    try {
      const data = await apiFetch<MeApiResponse>('/api/auth/me', {skipAuthHandler: true});
      setUser(meToUser(data));
    } catch (err) {
      clearToken();
      setUser(null);
      throw err;
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    sendCode,
    register,
    linkEmail,
    updateNewsletterPreferences,
    initTelegramAuth,
    loginWithToken,
    logout,
    validateEmail,
    isAdmin,
  }), [user, isLoading, login, sendCode, register, linkEmail, updateNewsletterPreferences, initTelegramAuth, loginWithToken, logout, validateEmail, isAdmin]);

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
  login: async () => ({success: false}),
  sendCode: async () => ({success: false}),
  register: async () => ({success: false}),
  linkEmail: async () => ({success: false}),
  updateNewsletterPreferences: async () => ({success: false}),
  initTelegramAuth: async () => ({success: false}),
  loginWithToken: async () => {},
  logout: () => {},
  validateEmail: () => false,
  isAdmin: false,
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context ?? defaultAuthContext;
}
