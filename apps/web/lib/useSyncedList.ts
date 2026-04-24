'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {apiFetch, getToken} from './api';

const TOKEN_STORAGE_KEY = 'reinasleo_token';

export type SyncConfig<T> = {
  localStorageKey: string;
  fetchServer: () => Promise<T[]>;
  mergeGuest: (guest: T[]) => Promise<void>;
  parseLocal: (raw: string) => T[];
  serializeLocal: (items: T[]) => string;
  isAuthenticated: boolean;
  authLoading: boolean;
  onServerLoadError?: (err: unknown) => void;
};

export type SyncedList<T> = {
  items: T[];
  setItems: (updater: T[] | ((prev: T[]) => T[])) => void;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

function readLocal<T>(key: string, parse: (raw: string) => T[]): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return parse(raw);
  } catch {
    return [];
  }
}

function writeLocal(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota / privacy-mode errors
  }
}

function removeLocal(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function useSyncedList<T>(config: SyncConfig<T>): SyncedList<T> {
  const {
    localStorageKey,
    fetchServer,
    mergeGuest,
    parseLocal,
    serializeLocal,
    isAuthenticated,
    authLoading,
    onServerLoadError,
  } = config;

  const [items, setItemsState] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refs so async handlers see latest callbacks without retriggering effects
  const fetchServerRef = useRef(fetchServer);
  const mergeGuestRef = useRef(mergeGuest);
  const parseLocalRef = useRef(parseLocal);
  const serializeLocalRef = useRef(serializeLocal);
  const onServerLoadErrorRef = useRef(onServerLoadError);
  const isAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    fetchServerRef.current = fetchServer;
    mergeGuestRef.current = mergeGuest;
    parseLocalRef.current = parseLocal;
    serializeLocalRef.current = serializeLocal;
    onServerLoadErrorRef.current = onServerLoadError;
    isAuthenticatedRef.current = isAuthenticated;
  });

  const refresh = useCallback(async () => {
    if (isAuthenticatedRef.current && getToken()) {
      try {
        const data = await fetchServerRef.current();
        setItemsState(data);
      } catch (err) {
        onServerLoadErrorRef.current?.(err);
      }
    } else {
      const stored = readLocal(localStorageKey, parseLocalRef.current);
      setItemsState(stored);
    }
  }, [localStorageKey]);

  // Primary load: runs on auth transitions
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    if (isAuthenticated && getToken()) {
      const guestItems = readLocal(localStorageKey, parseLocalRef.current);
      const mergePromise = guestItems.length > 0
        ? mergeGuestRef.current(guestItems)
        : Promise.resolve();

      mergePromise
        .then(() => fetchServerRef.current())
        .then(data => {
          if (!cancelled) setItemsState(data);
        })
        .catch(err => {
          if (!cancelled) onServerLoadErrorRef.current?.(err);
        })
        .finally(() => {
          if (guestItems.length > 0) {
            removeLocal(localStorageKey);
          }
          if (!cancelled) setIsLoading(false);
        });
    } else {
      const stored = readLocal(localStorageKey, parseLocalRef.current);
      setItemsState(stored);
      setIsLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, localStorageKey]);

  // Persist to localStorage in guest mode
  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    writeLocal(localStorageKey, serializeLocalRef.current(items));
  }, [items, isLoading, isAuthenticated, localStorageKey]);

  // Cross-tab sync: listen for storage events (B18 fix)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null) {
        // Storage cleared entirely — reset from current state of the world
        void refresh();
        return;
      }

      if (event.key === TOKEN_STORAGE_KEY) {
        // Auth changed in another tab — re-load in whichever direction fits.
        // Note: the auth context in THIS tab hasn't updated yet; the next
        // auth-transition effect run will re-sync. We trigger an immediate
        // refresh so UI doesn't look stale while the auth context catches up.
        void refresh();
        return;
      }

      if (event.key === localStorageKey) {
        if (isAuthenticatedRef.current && getToken()) {
          // In auth mode the server is the source of truth — ignore local edits.
          return;
        }
        const next = event.newValue
          ? (() => {
              try {
                return parseLocalRef.current(event.newValue!);
              } catch {
                return [] as T[];
              }
            })()
          : [];
        setItemsState(next);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [localStorageKey, refresh]);

  const setItems = useCallback((updater: T[] | ((prev: T[]) => T[])) => {
    setItemsState(prev =>
      typeof updater === 'function'
        ? (updater as (prev: T[]) => T[])(prev)
        : updater,
    );
  }, []);

  return {items, setItems, isLoading, refresh};
}

// Default helpers for common use cases
export function defaultParseArray<T>(raw: string): T[] {
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

export function defaultSerializeArray<T>(items: T[]): string {
  return JSON.stringify(items);
}

// Re-export to avoid duplicating the literal in wrappers
export {apiFetch};
