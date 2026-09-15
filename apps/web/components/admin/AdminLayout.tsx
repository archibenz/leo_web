'use client';

import {usePathname} from 'next/navigation';
import AdminGuard from './AdminGuard';
import {AppShell} from './shell/app-shell';

// Оболочка админки. Все тринадцать страниц админки оборачиваются в неё сами,
// поэтому переезд на блок Efferd сделан ЗДЕСЬ, а не правкой тринадцати
// страниц: вид меняется у всех разом, а сами страницы не трогаются вовсе.
// Это прямо служит правилу переезда — «диф только по виду».
//
// Внутренности переехали на `app-shell-7` из реестра Efferd (парный к
// `dashboard-7`, который выбрал владелец) — см. components/admin/shell/.
// Прежняя разметка на примитивах языка витрины убрана целиком.
//
// AdminGuard остаётся снаружи и в прежнем виде: он решает, пускать ли, и к
// оформлению отношения не имеет. Поменять заодно и его значило бы смешать
// правку вида с правкой доступа в одном коммите.
//
// Требование владельца, которое обязано пережить переезд: на телефоне первым
// экраном виден РАЗДЕЛ, а не список разделов. У блока это устроено иначе, чем
// у нас раньше (панель уезжает в выдвижную шторку, а не сворачивается тумблером),
// но само требование то же — см. components/admin/__tests__/AdminLayout.test.tsx.
export default function AdminLayout({children}: {children: React.ReactNode}) {
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';

  return (
    <AdminGuard>
      <AppShell locale={locale}>{children}</AppShell>
    </AdminGuard>
  );
}
