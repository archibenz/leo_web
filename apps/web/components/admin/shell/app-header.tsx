'use client';

import {usePathname} from 'next/navigation';
import {Separator} from '@/components/ui/separator';
import {AppBreadcrumbs} from './app-breadcrumbs';
import {CustomSidebarTrigger} from './custom-sidebar-trigger';
import {NavUser} from './nav-user';
import {isMenuActive, menuTitle, siteLinks} from '@/lib/nav/menu';
import {MenuIcon} from './menu-icons';

// Шапка админки по блоку `app-shell-7`. Из неё убраны общий поиск и
// колокольчик уведомлений — см. объяснение в app-shared.tsx.
//
// Название текущего раздела здесь не украшение: на телефоне панель свёрнута
// до значков, и без него владелец не видит, где находится. В прежней
// оболочке ту же работу делала мобильная шапка.
export function AppHeader({locale}: {locale: string}) {
  const pathname = usePathname() || `/${locale}/admin`;
  // Из общего меню (lib/nav/menu.ts). Совпасть могут группа и её подпункт —
  // «Витрина» и «Главная» ведут на один адрес; берём последнее совпадение,
  // то есть самый глубокий пункт.
  const match = siteLinks().filter((n) => isMenuActive(n, pathname, locale)).at(-1);
  const active = match ? {title: menuTitle(match.title, locale), icon: <MenuIcon name={match.icon} />} : null;

  return (
    <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-3">
        <CustomSidebarTrigger />
        <Separator
          className="mr-2 h-4 data-[orientation=vertical]:self-center"
          orientation="vertical"
        />
        <AppBreadcrumbs page={active} />
      </div>
      <div className="flex items-center gap-3">
        <NavUser locale={locale} />
      </div>
    </header>
  );
}
