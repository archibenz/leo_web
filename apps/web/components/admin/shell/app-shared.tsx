'use client';

import type {ReactNode} from 'react';
import {cn} from '@/lib/utils';
import {SidebarMenuButton} from '@/components/ui/sidebar';
import {
  LayoutGridIcon,
  ShirtIcon,
  LayersIcon,
  BoxesIcon,
  SparklesIcon,
  HomeIcon,
} from 'lucide-react';

// Разделяемая часть оболочки админки. Композиция — блок `app-shell-7` из
// реестра Efferd (он парный к `dashboard-7`, который выбрал владелец);
// содержимое наше целиком.
//
// Имена файлов в этой папке оставлены такими, как их назвал реестр
// (`app-shell`, `app-sidebar`, `nav-group`), нарочно: так видно, откуда
// взялась композиция, и следующий сможет сверить наш вариант с исходным
// блоком. Всё остальное в `components/admin/` названо по-нашему.
//
// Из блока НЕ взяты четыре его части, и это решение, а не недоделка:
// переключатель организаций (у нас одна мастерская), колокольчик уведомлений
// (266 строк выдуманных сообщений), лента изменений и общий поиск по
// приложению. Последний соблазнителен, но искать ему у нас нечего: поиск
// нужен по товарам, и он приезжает в самой таблице товаров. Показать
// владельцу строку поиска, которая ничего не находит, хуже, чем не показать
// её вовсе.
//
// Заодно не взят декоративный `progressive-blur` внизу полотна: он тянул
// целый пакет анимации (`motion`) ради затухания, которого владелец не
// просил. Одна зависимость из шестнадцати убрана этим решением.

export type SidebarNavItem = {
  title: string;
  path?: string;
  icon?: ReactNode;
  subItems?: SidebarNavItem[];
};

export type SidebarNavGroup = {
  label: string;
  items: SidebarNavItem[];
};

export function CustomMenuButton({
  className,
  ...props
}: React.ComponentProps<typeof SidebarMenuButton>) {
  return (
    <SidebarMenuButton
      className={cn(
        '[&>span:last-child]:text-clip [&>span]:text-nowrap [&>span]:text-foreground/80',
        'data-[active=true]:[&>span]:text-foreground',
        'duration-[calc(var(--sidebar-animation-duration)*0.5)] ease-(--sidebar-animation-ease) group-data-[collapsible=icon]:duration-(--sidebar-animation-duration)',
        className,
      )}
      {...props}
    />
  );
}

// Разделы админки — те же шесть, что были в прежней оболочке
// (components/admin/AdminLayout.tsx), в том же порядке. Переезд меняет вид, а
// не состав: владелец знает, где что лежит, и перекладывать разделы под новую
// оболочку значило бы чинить то, на что он не жаловался.
type Translate = (key: string) => string;

export function adminNavGroups(locale: string, t: Translate): SidebarNavGroup[] {
  return [
    {
      label: t('navCatalogue'),
      items: [
        {title: t('dashboard'), path: `/${locale}/admin`, icon: <LayoutGridIcon />},
        {title: t('products'), path: `/${locale}/admin/products`, icon: <ShirtIcon />},
        {title: t('collections'), path: `/${locale}/admin/collections`, icon: <LayersIcon />},
        {title: t('inventory'), path: `/${locale}/admin/inventory`, icon: <BoxesIcon />},
      ],
    },
    {
      label: t('navSite'),
      items: [
        {title: t('homepage'), path: `/${locale}/admin/homepage`, icon: <HomeIcon />},
        {title: t('care'), path: `/${locale}/admin/care`, icon: <SparklesIcon />},
      ],
    },
  ];
}

export function adminNavLinks(locale: string, t: Translate): SidebarNavItem[] {
  return adminNavGroups(locale, t).flatMap((group) =>
    group.items.flatMap((item) => (item.subItems?.length ? [item, ...item.subItems] : [item])),
  );
}

// У Efferd `isActive` сравнивался с ЗАШИТОЙ строкой — блок показывает один
// снимок, ему этого хватало. Нам нужен настоящий адрес, поэтому путь приходит
// снаружи, из usePathname().
//
// Дашборд проверяется на точное совпадение, остальные — на префикс: иначе
// `/ru/admin` подсвечивался бы на каждой странице админки, потому что все они
// начинаются с него. Ровно это правило действовало и в прежней оболочке.
export function isActivePath(pathname: string, locale: string, path?: string): boolean {
  if (!path) return false;
  if (path === `/${locale}/admin`) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}
