'use client';

import {createContext, useContext, useCallback, useMemo, useRef, type ReactNode} from 'react';
import {useAuth} from './AuthContext';
import {apiFetch, getToken} from '../lib/api';
import {showToast} from '../lib/toast';
import {useSyncedList, defaultSerializeArray} from '../lib/useSyncedList';

export type CartItem = {
  id: string;
  title: string;
  price?: number;
  image?: string;
  size?: string;
  quantity: number;
  isTest?: boolean;
};

type CartContextType = {
  items: CartItem[];
  count: number;
  total: number;
  isLoading: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (id: string) => number;
};

const CartContext = createContext<CartContextType | null>(null);

const CART_STORAGE_KEY = 'reinasleo_cart';

type ApiCartItem = {
  id: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage: string | null;
  size: string | null;
  quantity: number;
};

type ApiCartResponse = {
  items: ApiCartItem[];
  totalItems: number;
  totalPrice: number;
};

type ServerIdMap = Record<string, string>;

function compositeId(productId: string, size?: string | null): string {
  return size ? `${productId}__${size}` : productId;
}

function apiItemToLocal(item: ApiCartItem): CartItem {
  return {
    id: compositeId(item.productId, item.size),
    title: item.productTitle,
    price: item.productPrice,
    image: item.productImage ?? undefined,
    size: item.size ?? undefined,
    quantity: item.quantity,
  };
}

function errorStatus(err: unknown): number | undefined {
  return (err as {status?: number} | null)?.status;
}

function reportCartError(err: unknown, messageKey: string): void {
  if (errorStatus(err) === 401) return;
  showToast({kind: 'error', messageKey});
}

function parseCartLocal(raw: string): CartItem[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CartItem =>
      item != null && typeof item === 'object' && typeof item.id === 'string' && typeof item.quantity === 'number',
    );
  } catch {
    return [];
  }
}

export function CartProvider({children}: {children: ReactNode}) {
  const {isAuthenticated, isLoading: authLoading} = useAuth();
  const serverIds = useRef<ServerIdMap>({});

  const fetchServer = useCallback(async (): Promise<CartItem[]> => {
    const data = await apiFetch<ApiCartResponse>('/api/me/cart');
    const map: ServerIdMap = {};
    const mapped = data.items.map(item => {
      const cid = compositeId(item.productId, item.size);
      map[cid] = item.id;
      return apiItemToLocal(item);
    });
    serverIds.current = map;
    return mapped;
  }, []);

  const mergeGuest = useCallback(async (guestItems: CartItem[]): Promise<void> => {
    const results = await Promise.allSettled(
      guestItems.map(item => {
        const productId = item.id.includes('__') ? item.id.split('__')[0] : item.id;
        const size = item.size ?? (item.id.includes('__') ? item.id.split('__')[1] : undefined);
        return apiFetch('/api/me/cart', {
          method: 'POST',
          body: JSON.stringify({productId, size: size ?? null, quantity: item.quantity}),
        });
      }),
    );
    const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    const unauthorized = failed.some(r => errorStatus(r.reason) === 401);
    if (unauthorized) return;
    if (failed.length > 0) {
      showToast({kind: 'error', messageKey: 'cart.errors.mergeFailed'});
    }
  }, []);

  const {items, setItems, isLoading} = useSyncedList<CartItem>({
    localStorageKey: CART_STORAGE_KEY,
    fetchServer,
    mergeGuest,
    parseLocal: parseCartLocal,
    serializeLocal: defaultSerializeArray,
    isAuthenticated,
    authLoading,
    onServerLoadError: err => reportCartError(err, 'cart.errors.loadFailed'),
  });

  const applyApiResponse = useCallback((data: ApiCartResponse) => {
    const map: ServerIdMap = {};
    const mapped = data.items.map(item => {
      const cid = compositeId(item.productId, item.size);
      map[cid] = item.id;
      return apiItemToLocal(item);
    });
    serverIds.current = map;
    setItems(mapped);
  }, [setItems]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    if (isAuthenticated && getToken()) {
      const productId = item.id.includes('__') ? item.id.split('__')[0] : item.id;
      const size = item.size ?? (item.id.includes('__') ? item.id.split('__')[1] : undefined);

      const prevServerIds = {...serverIds.current};
      let rollback: CartItem[] | null = null;

      setItems(current => {
        rollback = current;
        const existing = current.find(i => i.id === item.id);
        if (existing) {
          return current.map(i =>
            i.id === item.id ? {...i, quantity: i.quantity + 1} : i,
          );
        }
        return [...current, {...item, quantity: 1}];
      });

      apiFetch<ApiCartResponse>('/api/me/cart', {
        method: 'POST',
        body: JSON.stringify({productId, size: size ?? null, quantity: 1}),
      })
        .then(data => applyApiResponse(data))
        .catch(err => {
          if (rollback) setItems(rollback);
          serverIds.current = prevServerIds;
          reportCartError(err, 'cart.errors.addFailed');
        });
    } else {
      setItems(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
          return prev.map(i =>
            i.id === item.id ? {...i, quantity: i.quantity + 1} : i,
          );
        }
        return [...prev, {...item, quantity: 1}];
      });
    }
  }, [isAuthenticated, setItems, applyApiResponse]);

  const removeItem = useCallback((id: string) => {
    if (isAuthenticated && getToken()) {
      const serverId = serverIds.current[id];
      if (!serverId) return;

      const prevServerIds = {...serverIds.current};
      let rollback: CartItem[] | null = null;

      setItems(current => {
        rollback = current;
        return current.filter(i => i.id !== id);
      });
      const nextServerIds = {...serverIds.current};
      delete nextServerIds[id];
      serverIds.current = nextServerIds;

      apiFetch<ApiCartResponse>(`/api/me/cart/${serverId}`, {method: 'DELETE'})
        .then(data => applyApiResponse(data))
        .catch(err => {
          if (rollback) setItems(rollback);
          serverIds.current = prevServerIds;
          reportCartError(err, 'cart.errors.removeFailed');
        });
    } else {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  }, [isAuthenticated, setItems, applyApiResponse]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    if (isAuthenticated && getToken()) {
      const serverId = serverIds.current[id];
      if (!serverId) return;

      const prevServerIds = {...serverIds.current};
      let rollback: CartItem[] | null = null;

      setItems(current => {
        rollback = current;
        return current.map(i => i.id === id ? {...i, quantity} : i);
      });

      apiFetch<ApiCartResponse>(`/api/me/cart/${serverId}`, {
        method: 'PATCH',
        body: JSON.stringify({quantity}),
      })
        .then(data => applyApiResponse(data))
        .catch(err => {
          if (rollback) setItems(rollback);
          serverIds.current = prevServerIds;
          reportCartError(err, 'cart.errors.updateFailed');
        });
    } else {
      setItems(prev =>
        prev.map(item => item.id === id ? {...item, quantity} : item),
      );
    }
  }, [isAuthenticated, setItems, applyApiResponse, removeItem]);

  const clearCart = useCallback(() => {
    if (isAuthenticated && getToken()) {
      const prevServerIds = {...serverIds.current};
      let rollback: CartItem[] | null = null;

      setItems(current => {
        rollback = current;
        return [];
      });
      serverIds.current = {};

      apiFetch('/api/me/cart', {method: 'DELETE'})
        .catch(err => {
          if (rollback) setItems(rollback);
          serverIds.current = prevServerIds;
          reportCartError(err, 'cart.errors.clearFailed');
        });
    } else {
      setItems([]);
    }
  }, [isAuthenticated, setItems]);

  const getItemQuantity = useCallback((id: string) => {
    const item = items.find(i => i.id === id);
    return item?.quantity ?? 0;
  }, [items]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);

  const value = useMemo(() => ({
    items,
    count,
    total,
    isLoading,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
  }), [items, count, total, isLoading, addItem, removeItem, updateQuantity, clearCart, getItemQuantity]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

const defaultCartContext: CartContextType = {
  items: [],
  count: 0,
  total: 0,
  isLoading: true,
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getItemQuantity: () => 0,
};

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  return context ?? defaultCartContext;
}
