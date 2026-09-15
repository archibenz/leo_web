'use client';

import {useTranslations} from 'next-intl';
import {SidebarTrigger} from '@/components/ui/sidebar';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';

// В блоке Efferd подсказка содержала сочетание клавиш ⌘B. Оно убрано: у
// владельца телефон, клавиатуры там нет, а подсказка про несуществующую
// клавишу — обещание, которого мы не держим. Само сочетание примитив
// `sidebar` слушает по-прежнему, оно просто не рекламируется.
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
