'use client';

import type {ReactNode} from 'react';
import {AuthProvider, CartProvider, FavoritesProvider} from '../contexts';
import Toaster from './Toaster';

type ProvidersProps = {
  children: ReactNode;
};

// No MotionConfig here on purpose: framer-motion has been fully removed from
// the app. Its last consumers — the account page + DeleteAccountModal — now
// animate via CSS transitions (see lib/useMountTransition).
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
