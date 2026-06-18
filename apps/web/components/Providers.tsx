'use client';

import type {ReactNode} from 'react';
import {MotionConfig} from 'framer-motion';
import {AuthProvider, CartProvider, FavoritesProvider} from '../contexts';
import Toaster from './Toaster';

type ProvidersProps = {
  children: ReactNode;
};

export default function Providers({children}: ProvidersProps) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            {children}
            <Toaster />
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
