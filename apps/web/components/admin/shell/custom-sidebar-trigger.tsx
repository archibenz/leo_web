'use client';

import {useTranslations} from 'next-intl';
import {SidebarTrigger} from '@/components/ui/sidebar';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';

// В блоке Efferd подсказка содержала сочетание клавиш ⌘B. Оно убрано: у
// владельца телефон, клавиатуры там нет, а подсказка про несуществующую
// клавишу — обещание, которого мы не держим. Само сочетание примитив
// `sidebar` слушает по-прежнему, оно просто не рекламируется.
//
// УСЛОВИЕ ЛОВУШКИ, А НЕ ФАКТ. Русское имя этой кнопки приходит ОТСЮДА,
// из t('toggleNav'), а не из примитива: внутри shadcn SidebarTrigger лежит
// <span className="sr-only">Toggle Sidebar</span>, и наш aria-label его
// перебивает при вычислении доступного имени. Значит `SidebarTrigger`,
// смонтированный НАПРЯМУЮ и без aria-label, молча получит английское имя —
// глазом это не видно вовсе, слышно только читалке.
//
// Проверено 17.09 наблюдением следствия, а не рассуждением про aria: спек
// e2e/tests/16-admin-white-shell.spec.ts ищет кнопку по имени «Свернуть
// навигацию» с exact: true в настоящем браузере на /ru/admin. Но он стережёт
// ЭТОТ вызов; второй такой же, заведённый в другом месте, он не увидит.
//
// И причина, по которой чинить это внутри components/ui/sidebar.tsx нельзя:
// файлом управляет реестр, `npx shadcn add sidebar` перезапишет его целиком.
// Там же лежит мёртвый SidebarRail с теми же английскими строками — его не
// монтирует никто, и трогать его нет смысла по той же причине.
export function CustomSidebarTrigger() {
  const t = useTranslations('admin');

  return (
    <Tooltip delayDuration={1000}>
      <TooltipTrigger asChild>
        {/* Размер переопределён нарочно. У shadcn SidebarTrigger — `h-7 w-7`,
            то есть 28px, а наш принятый порог зоны нажатия 44 (lw-cjzy). На
            телефоне это ЕДИНСТВЕННЫЙ орган перехода между разделами: панель
            там уезжает в шторку, и не попав по кнопке, владелец не попадёт
            никуда. 28px для пальца мало. */}
        <SidebarTrigger aria-label={t('toggleNav')} className="size-11 md:size-9" />
      </TooltipTrigger>
      <TooltipContent className="px-2 py-1" side="right">
        {t('toggleNav')}
      </TooltipContent>
    </Tooltip>
  );
}
