'use client';

import Link from 'next/link';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {CustomMenuButton, isActivePath, type SidebarNavGroup} from './app-shared';

// Группа разделов в боковой панели. У Efferd здесь была ещё и раскладная
// ветка с подпунктами (Collapsible + SidebarMenuSub) — она убрана: ни один из
// наших шести разделов подпунктов не имеет, и пустая механика раскрытия
// осталась бы мёртвым кодом, который следующий будет бояться трогать.
// Вернуть её из блока `app-shell-7` — десять минут, если подпункты появятся.
export function NavGroup({
  label,
  items,
  pathname,
  locale,
}: SidebarNavGroup & {pathname: string; locale: string}) {
  return (
    <SidebarGroup>
      {/* text-[13px] — пол админки, тот же, что держит сторож зон нажатия
          (components/editor/__tests__/touchTargets.test.ts). У shadcn здесь
          text-xs, то есть 12: замерено 18.09, это была самая мелкая строка
          панели, и владелец читает её с телефона. */}
      {label && (
        <SidebarGroupLabel className="text-[13px] duration-[calc(var(--sidebar-animation-duration)*0.8)] ease-(--sidebar-animation-ease)">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <CustomMenuButton
              asChild
              isActive={isActivePath(pathname, locale, item.path)}
              tooltip={item.title}
            >
              {/* next/link, а не <a>. В блоке Efferd стояли обычные ссылки —
                  блок показывает один снимок, и переходов у него нет. У нас
                  обычная ссылка означала ПОЛНУЮ ПЕРЕЗАГРУЗКУ на каждый переход
                  между разделами: замерено на живом стенде, два перехода
                  страницы на один щелчок. Мягкий переход нужен не ради
                  скорости — без него нечего и анимировать. */}
              <Link href={item.path ?? '#'}>
                {item.icon}
                {/* 15px: у shadcn кнопка идёт text-sm, то есть 14. Замер 18.09
                    — 14 против 32 у заголовка страницы, список читался как
                    служебная мелочь. Шаг один, плотность списка сохраняется. */}
                <span className="text-[15px]">{item.title}</span>
              </Link>
            </CustomMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
