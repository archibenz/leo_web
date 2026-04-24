'use client';

import {createContext, useContext, useCallback, useMemo, type ReactNode} from 'react';
import {useAuth} from './AuthContext';
import {apiFetch, getToken} from '../lib/api';
import {useSyncedList, defaultSerializeArray} from '../lib/useSyncedList';

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

function parseFavoritesLocal(raw: string): FavoriteItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FavoriteItem =>
      item != null && typeof item === 'object' && typeof item.id === 'string' && typeof item.title === 'string',
    );
  } catch {
    return [];
  }
}

export function FavoritesProvider({children}: {children: ReactNode}) {
  const {isAuthenticated, isLoading: authLoading} = useAuth();

  const fetchServer = useCallback(async (): Promise<FavoriteItem[]> => {
    const data = await apiFetch<ApiFavorite[]>('/api/me/favorites');
    return data.map(apiFavToLocal);
  }, []);

  const mergeGuest = useCallback(async (guestItems: FavoriteItem[]): Promise<void> => {
    await Promise.all(
      guestItems.map(item =>
        apiFetch(`/api/me/favorites/${item.id}`, {method: 'POST'}).catch(() => {}),
      ),
    );
  }, []);

  const {items, setItems, isLoading, refresh} = useSyncedList<FavoriteItem>({
    localStorageKey: FAVORITES_STORAGE_KEY,
    fetchServer,
    mergeGuest,
    parseLocal: parseFavoritesLocal,
    serializeLocal: defaultSerializeArray,
    isAuthenticated,
    authLoading,
  });

  const addItem = useCallback((item: FavoriteItem) => {
    if (isAuthenticated && getToken()) {
      apiFetch<ApiFavorite>(`/api/me/favorites/${item.id}`, {method: 'POST'})
        .then(() => refresh())
        .catch(() => {});
    } else {
      setItems(prev => {
        if (prev.some(i => i.id === item.id)) return prev;
        return [...prev, item];
      });
    }
  }, [isAuthenticated, setItems, refresh]);

  const removeItem = useCallback((id: string) => {
    if (isAuthenticated && getToken()) {
      apiFetch(`/api/me/favorites/${id}`, {method: 'DELETE'})
        .then(() => refresh())
        .catch(() => {});
    } else {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  }, [isAuthenticated, setItems, refresh]);

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
  }, [setItems]);

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
