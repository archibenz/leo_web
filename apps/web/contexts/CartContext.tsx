'use client';

import {createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode} from 'react';
import {useAuth} from './AuthContext';
import {apiFetch, getToken} from '../lib/api';

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

// Map to track server item UUIDs by composite id
type ServerIdMap = Record<string, string>;

export function CartProvider({children}: {children: ReactNode}) {
  const {isAuthenticated, isLoading: authLoading} = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const serverIds = useRef<ServerIdMap>({});
  const prevAuth = useRef<boolean>(false);

  // Load cart: from API if authenticated, from localStorage otherwise
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated && getToken()) {
      // Merge guest cart into server on first auth
      const guestItems = loadLocalCart();
      const mergePromise = guestItems.length > 0
        ? mergeGuestCart(guestItems)
        : Promise.resolve();

      mergePromise.then(() => fetchServerCart()).finally(() => {
        // Clear localStorage cart after merge
        if (guestItems.length > 0) {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
        setIsLoading(false);
      });

      prevAuth.current = true;
    } else {
      // Guest mode: load from localStorage
      const stored = loadLocalCart();
      setItems(stored);
      serverIds.current = {};
      setIsLoading(false);

      // If user just logged out, we already have items state cleared via the effect below
      prevAuth.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  // Save to localStorage when guest
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, isLoading, isAuthenticated]);

  const fetchServerCart = useCallback(async () => {
    try {
      const data = await apiFetch<ApiCartResponse>('/api/me/cart');
      const map: ServerIdMap = {};
      const mapped = data.items.map(item => {
        const cid = compositeId(item.productId, item.size);
        map[cid] = item.id; // server UUID
        return apiItemToLocal(item);
      });
      serverIds.current = map;
      setItems(mapped);
    } catch {
      // fallback: keep current items
    }
  }, []);

  async function mergeGuestCart(guestItems: CartItem[]): Promise<void> {
    await Promise.all(guestItems.map(item => {
      const productId = item.id.includes('__') ? item.id.split('__')[0] : item.id;
      const size = item.size ?? (item.id.includes('__') ? item.id.split('__')[1] : undefined);
      return apiFetch('/api/me/cart', {
        method: 'POST',
        body: JSON.stringify({productId, size: size ?? null, quantity: item.quantity}),
      }).catch(() => {});
    }));
  }

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    if (isAuthenticated && getToken()) {
      const productId = item.id.includes('__') ? item.id.split('__')[0] : item.id;
      const size = item.size ?? (item.id.includes('__') ? item.id.split('__')[1] : undefined);
      apiFetch<ApiCartResponse>('/api/me/cart', {
        method: 'POST',
        body: JSON.stringify({productId, size: size ?? null, quantity: 1}),
      }).then(data => {
        const map: ServerIdMap = {};
        setItems(data.items.map(i => {
          const cid = compositeId(i.productId, i.size);
          map[cid] = i.id;
          return apiItemToLocal(i);
        }));
        serverIds.current = map;
      }).catch(() => {});
    } else {
      setItems(prev => {
        const existing = prev.find(i => i.id === item.id);
        if (existing) {
          return prev.map(i =>
            i.id === item.id ? {...i, quantity: i.quantity + 1} : i
          );
        }
        return [...prev, {...item, quantity: 1}];
      });
    }
  }, [isAuthenticated]);

  const removeItem = useCallback((id: string) => {
    if (isAuthenticated && getToken()) {
      const serverId = serverIds.current[id];
      if (serverId) {
        apiFetch<ApiCartResponse>(`/api/me/cart/${serverId}`, {method: 'DELETE'})
          .then(data => {
            const map: ServerIdMap = {};
            setItems(data.items.map(i => {
              const cid = compositeId(i.productId, i.size);
              map[cid] = i.id;
              return apiItemToLocal(i);
            }));
            serverIds.current = map;
          }).catch(() => {});
      }
    } else {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  }, [isAuthenticated]);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    if (isAuthenticated && getToken()) {
      const serverId = serverIds.current[id];
      if (serverId) {
        apiFetch<ApiCartResponse>(`/api/me/cart/${serverId}`, {
          method: 'PATCH',
          body: JSON.stringify({quantity}),
        }).then(data => {
          const map: ServerIdMap = {};
          setItems(data.items.map(i => {
            const cid = compositeId(i.productId, i.size);
            map[cid] = i.id;
            return apiItemToLocal(i);
          }));
          serverIds.current = map;
        }).catch(() => {});
      }
    } else {
      setItems(prev =>
        prev.map(item => item.id === id ? {...item, quantity} : item)
      );
    }
  }, [isAuthenticated, removeItem]);

  const clearCart = useCallback(() => {
    if (isAuthenticated && getToken()) {
      apiFetch('/api/me/cart', {method: 'DELETE'})
        .then(() => {
          setItems([]);
          serverIds.current = {};
        }).catch(() => {});
    } else {
      setItems([]);
    }
  }, [isAuthenticated]);

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

function loadLocalCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as CartItem[];
    }
  } catch {
    // ignore
  }
  return [];
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
