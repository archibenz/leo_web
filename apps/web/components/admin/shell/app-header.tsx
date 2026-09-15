'use client';

import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {Separator} from '@/components/ui/separator';
import {AppBreadcrumbs} from './app-breadcrumbs';
import {CustomSidebarTrigger} from './custom-sidebar-trigger';
import {NavUser} from './nav-user';
import {adminNavLinks, isActivePath} from './app-shared';

// Шапка админки по блоку `app-shell-7`. Из неё убраны общий поиск и
// колокольчик уведомлений — см. объяснение в app-shared.tsx.
//
// Название текущего раздела здесь не украшение: на телефоне панель свёрнута
// до значков, и без него владелец не видит, где находится. В прежней
// оболочке ту же работу делала мобильная шапка.
export function AppHeader({locale}: {locale: string}) {
  const t = useTranslations('admin');
  const pathname = usePathname() || `/${locale}/admin`;
  const links = adminNavLinks(locale, t);
  const active = links.find((item) => isActivePath(pathname, locale, item.path));

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
