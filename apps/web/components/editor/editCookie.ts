'use client';

import {EDIT_COOKIE} from '../../lib/catalogue/editMode';

// document.cookie, не next/headers: этот модуль живёт только в браузере.
// Имя куки — не недосмотр про HttpOnly, а причина, почему её вообще можно
// прочитать и поставить отсюда: она не секрет, это просьба «покажи
// черновик», и ставить/снимать её обязан браузер. Подробности и цена этого
// решения — в lib/catalogue/viewer.ts, там же, где кука читается сервером.

export function readEditCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').includes(`${EDIT_COOKIE}=1`);
}

export function writeEditCookie(on: boolean): void {
  document.cookie = on
    ? `${EDIT_COOKIE}=1; Path=/; SameSite=Lax; Secure`
    : `${EDIT_COOKIE}=; Path=/; SameSite=Lax; Secure; Max-Age=0`;
}
