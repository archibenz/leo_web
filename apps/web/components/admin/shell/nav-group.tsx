'use client';

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
      {label && (
        <SidebarGroupLabel className="duration-[calc(var(--sidebar-animation-duration)*0.8)] ease-(--sidebar-animation-ease)">
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
              <a href={item.path}>
                {item.icon}
                <span>{item.title}</span>
              </a>
            </CustomMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
