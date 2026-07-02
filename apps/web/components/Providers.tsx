'use client';

import type {ReactNode} from 'react';
import {AuthProvider, CartProvider, FavoritesProvider} from '../contexts';
import Toaster from './Toaster';

type ProvidersProps = {
  children: ReactNode;
};

// No MotionConfig here on purpose: framer-motion is off the global critical
// path. The only remaining framer-motion consumers (account page + its
// DeleteAccountModal) set their own local <MotionConfig reducedMotion="user">.
export default function Providers({children}: ProvidersProps) {
  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          {children}
          <Toaster />
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
