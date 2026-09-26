'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/lib/utils';
import {Sidebar, SidebarContent, SidebarHeader} from '@/components/ui/sidebar';
import {MENU} from '@/lib/nav/menu';
import {CustomMenuButton} from './app-shared';
import {NavGroup} from './nav-group';

// Боковая панель по блоку `app-shell-7`. Свёрнутое состояние — до значков
// (collapsible="icon"), а не до нуля: владелец правит сайт с телефона, и
// панель, схлопнутая насовсем, лишает его перехода между разделами.
//
// Шапкой стоит наше слово, а не значок Efferd: их логотип из блока удалён
// вместе с файлом. Ведёт на дашборд — то место, куда владелец возвращается
// чаще всего.
//
// ПУНКТЫ — ИЗ ОБЩЕГО МЕНЮ С АНАЛИТИКОЙ (lib/nav/menu.json, решение владельца
// 26.09): Свод, WB, Ozon, Сайт, Служебное — одно и то же в админке и в
// дашборде. Всё прежнее меню админки — раздел «Сайт»; «Правка» — его пункт,
// «На сайт» — пункт «Служебного». Отдельного подвала с выходами больше нет:
// обе двери наружу теперь в самом меню.
export function AppSidebar({locale}: {locale: string}) {
  const pathname = usePathname() || `/${locale}/admin`;

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
            {/* Маска, а не <Image>: файл чёрный, и на тёмной админке (тема по
                системной, globals.css) чёрная марка на тёмной панели пропадала
                бы. Маска берёт форму из файла, а цвет — currentColor, то есть
                текст панели в любой теме. */}
            <span
              role="img"
              aria-label="REINASLEO"
              className="hidden h-6 w-6 shrink-0 bg-current group-data-[collapsible=icon]:block"
              style={{
                WebkitMask: 'url(/logos/icon-black.svg) center / contain no-repeat',
                mask: 'url(/logos/icon-black.svg) center / contain no-repeat',
              }}
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
        {MENU.map((section) => (
          <NavGroup key={section.id} section={section} locale={locale} pathname={pathname} />
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
