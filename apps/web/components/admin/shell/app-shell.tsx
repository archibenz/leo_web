'use client';

import {cn} from '@/lib/utils';
// TooltipProvider отдельно не нужен: SidebarProvider оборачивает в него сам
// (components/ui/sidebar.tsx:140) — ради подсказок у значков свёрнутой панели.
import {SidebarInset, SidebarProvider} from '@/components/ui/sidebar';
import {AppHeader} from './app-header';
import {AppSidebar} from './app-sidebar';

// Оболочка админки — блок `app-shell-7` из реестра Efferd, парный к
// `dashboard-7`, который выбрал владелец.
//
// СВОЙ ФОН ЗДЕСЬ ОБЯЗАТЕЛЕН, ЭТО НЕ ОФОРМЛЕНИЕ.
// Белый фон витрине даёт правило `body:has(.wv-root)` в globals.css — оно же
// гасит зерно и виньетку прежней тёмной темы. Админка рендерится ВНЕ
// `.wv-root`, поэтому без собственного фона она встала бы на старую подложку,
// и владелец в третий раз сказал бы «почему всё ещё тёмное». Отсюда
// `bg-background` на корне: он читает --sh-background, то есть белый.
export function AppShell({children, locale}: {children: React.ReactNode; locale: string}) {
  return (
    <div className="bg-background text-foreground overflow-hidden">
      <SidebarProvider
        className={cn(
          'h-svh w-full',
          '[--sidebar-animation-duration:250ms]',
          '[--sidebar-animation-ease:ease-[cubic-bezier(0.32,0.72,0,1)]]',
          '**:data-[slot=sidebar-gap]:duration-(--sidebar-animation-duration) **:data-[slot=sidebar-gap]:ease-(--sidebar-animation-ease)',
        )}
      >
        <AppSidebar locale={locale} />
        <SidebarInset
          className={cn(
            'relative shadow-xs! md:border md:peer-data-[variant=inset]:rounded-xl!',
            'md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-0',
          )}
        >
          <AppHeader locale={locale} />
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
