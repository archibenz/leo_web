'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {cn} from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {CustomMenuButton, adminNavGroups} from './app-shared';
import {NavGroup} from './nav-group';
import {ExternalLinkIcon} from 'lucide-react';

// Боковая панель по блоку `app-shell-7`. Свёрнутое состояние — до значков
// (collapsible="icon"), а не до нуля: владелец правит сайт с телефона, и
// панель, схлопнутая насовсем, лишает его перехода между разделами.
//
// Шапкой стоит наше слово, а не значок Efferd: их логотип из блока удалён
// вместе с файлом. Ведёт на дашборд — то место, куда владелец возвращается
// чаще всего.
export function AppSidebar({locale}: {locale: string}) {
  const t = useTranslations('admin');
  const pathname = usePathname() || `/${locale}/admin`;
  const groups = adminNavGroups(locale, t);

  return (
    <Sidebar
      className={cn(
        '*:data-[slot=sidebar-inner]:overflow-hidden *:data-[slot=sidebar-inner]:rounded-xl *:data-[slot=sidebar-inner]:bg-background',
        '*:data-[slot=sidebar-inner]:shadow-xs',
        '*:data-[slot=sidebar-inner]:border',
        'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]',
        'duration-(--sidebar-animation-duration) ease-(--sidebar-animation-ease)',
      )}
      collapsible="icon"
      variant="inset"
    >
      <SidebarHeader className="h-14 justify-center border-b">
        <CustomMenuButton asChild>
          <Link href={`/${locale}/admin`}>
            <span className="font-display text-[15px] tracking-[0.12em]">REINASLEO</span>
          </Link>
        </CustomMenuButton>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <NavGroup key={group.label} {...group} locale={locale} pathname={pathname} />
        ))}
      </SidebarContent>

      {/* Выход на витрину внизу панели — он же был внизу прежней оболочки.
          Это единственная дверь наружу из админки, и она обязана быть видна
          без раскрытия меню пользователя. */}
      <SidebarFooter className="gap-0 p-0">
        <SidebarMenu className="border-t p-2">
          <SidebarMenuItem>
            <CustomMenuButton asChild className="text-muted-foreground" size="sm" tooltip={t('toSite')}>
              <Link href={`/${locale}`}>
                <ExternalLinkIcon />
                <span>{t('toSite')}</span>
              </Link>
            </CustomMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
