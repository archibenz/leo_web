import type {ReactNode} from 'react';
import {AuthProvider} from '../../../contexts';
import Toaster from '../../../components/Toaster';

// Админке нужны ровно два общих механизма: кто вошёл (AuthProvider) и куда
// показывать сообщения (Toaster, им пользуется тот же AuthProvider, когда
// сеанс истёк).
//
// РАНЬШЕ ЗДЕСЬ СТОЯЛ ОБЩИЙ <Providers>, И ЭТО СТОИЛО ДВУХ ЛИШНИХ ЗАПРОСОВ НА
// КАЖДЫЙ ЭКРАН. Он поднимает ещё корзину и избранное, а они при монтировании
// идут в сеть: `/api/me/cart` и `/api/me/favorites`. В админке ими не
// пользуется НИ ОДИН файл — проверено поиском, ноль вхождений `useCart` и
// `useFavorites` во всём разделе.
//
// Цена была не только в запросах. На стенде без базы корзина не отвечала, и
// поверх каждого админского экрана вставало красное «Не удалось загрузить
// корзину» — сообщение о беде, которой у владельца нет и быть не может,
// потому что он в админке ничего не покупает.
//
// Витринная оболочка здесь не нужна: у админки своя
// (components/admin/AdminLayout.tsx на блоке app-shell-7).
export default function AdminRouteLayout({children}: {children: ReactNode}) {
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
