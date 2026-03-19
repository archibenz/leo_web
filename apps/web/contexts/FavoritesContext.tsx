'use client';

import {createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode} from 'react';
import {useAuth} from './AuthContext';
import {apiFetch, getToken} from '../lib/api';

export type FavoriteItem = {
  id: string;
  title: string;
  image?: string;
};

type FavoritesContextType = {
  items: FavoriteItem[];
  count: number;
  isLoading: boolean;
  addItem: (item: FavoriteItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
  clearFavorites: () => void;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

const FAVORITES_STORAGE_KEY = 'reinasleo_favorites';

type ApiFavorite = {
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string | null;
  addedAt: string;
};

function apiFavToLocal(f: ApiFavorite): FavoriteItem {
  return {
    id: f.productId,
    title: f.productTitle,
    image: f.productImage ?? undefined,
  };
}

export function FavoritesProvider({children}: {children: ReactNode}) {
  const {isAuthenticated, isLoading: authLoading} = useAuth();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites: from API if authenticated, from localStorage otherwise
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated && getToken()) {
      // Merge guest favorites to server
      const guestItems = loadLocalFavorites();
      const mergePromise = guestItems.length > 0
        ? mergeGuestFavorites(guestItems)
        : Promise.resolve();

      mergePromise.then(() => fetchServerFavorites()).finally(() => {
        if (guestItems.length > 0) {
          localStorage.removeItem(FAVORITES_STORAGE_KEY);
        }
        setIsLoading(false);
      });
    } else {
      const stored = loadLocalFavorites();
      setItems(stored);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  // Save to localStorage when guest
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoading, isAuthenticated]);

  const fetchServerFavorites = useCallback(async () => {
    try {
      const data = await apiFetch<ApiFavorite[]>('/api/me/favorites');
      setItems(data.map(apiFavToLocal));
    } catch {
      // keep current items
    }
  }, []);

  async function mergeGuestFavorites(guestItems: FavoriteItem[]): Promise<void> {
    await Promise.all(guestItems.map(item =>
      apiFetch(`/api/me/favorites/${item.id}`, {method: 'POST'}).catch(() => {})
    ));
  }

  const addItem = useCallback((item: FavoriteItem) => {
    if (isAuthenticated && getToken()) {
      apiFetch<ApiFavorite>(`/api/me/favorites/${item.id}`, {method: 'POST'})
        .then(() => fetchServerFavorites())
        .catch(() => {});
    } else {
      setItems(prev => {
        if (prev.some(i => i.id === item.id)) return prev;
        return [...prev, item];
      });
    }
  }, [isAuthenticated, fetchServerFavorites]);

  const removeItem = useCallback((id: string) => {
    if (isAuthenticated && getToken()) {
      apiFetch(`/api/me/favorites/${id}`, {method: 'DELETE'})
        .then(() => fetchServerFavorites())
        .catch(() => {});
    } else {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  }, [isAuthenticated, fetchServerFavorites]);

  const toggleItem = useCallback((item: FavoriteItem) => {
    const exists = items.some(i => i.id === item.id);
    if (exists) {
      removeItem(item.id);
    } else {
      addItem(item);
    }
  }, [items, addItem, removeItem]);

  const isFavorite = useCallback((id: string) => {
    return items.some(item => item.id === id);
  }, [items]);

  const clearFavorites = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(() => ({
    items,
    count: items.length,
    isLoading,
    addItem,
    removeItem,
    toggleItem,
    isFavorite,
    clearFavorites,
  }), [items, isLoading, addItem, removeItem, toggleItem, isFavorite, clearFavorites]);

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

function loadLocalFavorites(): FavoriteItem[] {
  try {
    const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as FavoriteItem[];
    }
  } catch {
    // ignore
  }
  return [];
}

const defaultFavoritesContext: FavoritesContextType = {
  items: [],
  count: 0,
  isLoading: true,
  addItem: () => {},
  removeItem: () => {},
  toggleItem: () => {},
  isFavorite: () => false,
  clearFavorites: () => {},
};

export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  return context ?? defaultFavoritesContext;
}
