'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import {NavEditMode} from './nav-edit-mode';
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
      {/* СВЁРНУТАЯ ПАНЕЛЬ ПОКАЗЫВАЛА «REI». Слово REINASLEO просто обрезалось
          шириной значка, и владелец видел обрубок собственной марки.
          Свёрнутая — монограмма, развёрнутая — слово целиком.

          Взят icon-black.svg: это буква R с обводкой и ромбом, та же марка,
          что стоит в букве O на витрине. Квадратные logo-square.svg и
          square-ink.svg — это ромб в квадратной плашке, то есть ровно то,
          чего владелец просил не брать. */}
      <SidebarHeader className="h-14 justify-center border-b">
        {/* Свой отступ в свёрнутом виде. У shadcn кнопка там становится 32×32
            с !p-2 (sidebar.tsx:525), то есть под содержимое остаётся 16×16 —
            марка сплющивалась в 16×28. Замерено. Отступ в 4 px отдаёт марке
            24×24 и оставляет кнопку тех же 32. */}
        <CustomMenuButton asChild className="group-data-[collapsible=icon]:!p-1">
          <Link href={`/${locale}/admin`}>
            <Image
              src="/logos/icon-black.svg"
              alt="REINASLEO"
              width={1000}
              height={1000}
              className="hidden h-6 w-6 shrink-0 group-data-[collapsible=icon]:block"
            />
            {/* 20px, а не 15. Замер 18.09: имя дома читалось 15 px, а имя страницы
                рядом — 32 px тем же шрифтом. Дом получался вдвое тише страницы.
                20 ставит его между подписями панели и заголовком, не споря с
                ним: витрина держит своё слово картинкой высотой 23 px, и здесь
                та же величина голоса. */}
            <span className="font-display text-[20px] tracking-[0.12em] group-data-[collapsible=icon]:hidden">REINASLEO</span>
          </Link>
        </CustomMenuButton>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <NavGroup key={group.label} {...group} locale={locale} pathname={pathname} />
        ))}
        {/* Режим правки — последним в списке и НЕ внутри NavGroup: там данные
            описывают ссылки, а это переключатель. Втиснуть его в тот же список
            значило бы завести в данных поле «на самом деле не ссылка», и
            каждый следующий пункт пришлось бы читать с оглядкой на него. */}
        <NavEditMode />
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
