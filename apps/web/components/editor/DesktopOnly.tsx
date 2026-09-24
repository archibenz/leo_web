'use client';

import type {ReactNode} from 'react';
import {useIsDesktop} from './useIsDesktop';

// Обёртка для СЕРВЕРНОЙ разметки, которую нельзя показывать на узком экране:
// сервер ширины не знает, решает браузер (useIsDesktop.ts).
export default function DesktopOnly({children}: {children: ReactNode}) {
  return useIsDesktop() ? <>{children}</> : null;
}
