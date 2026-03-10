'use client';

import type {ReactNode} from 'react';
import {AuthProvider, CartProvider, FavoritesProvider} from '../contexts';

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({children}: ProvidersProps) {
  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          {children}
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
