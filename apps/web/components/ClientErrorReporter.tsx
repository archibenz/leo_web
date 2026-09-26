'use client';

import {useEffect} from 'react';
import {installClientErrorReporting} from '../lib/clientErrors';

// Ставит window.onerror / unhandledrejection один раз на вкладку — на витрине
// и в админке одинаково (lib/clientErrors.ts). Ничего не рисует.
export default function ClientErrorReporter() {
  useEffect(() => {
    installClientErrorReporting();
  }, []);
  return null;
}
