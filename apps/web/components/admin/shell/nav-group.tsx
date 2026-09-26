'use client';

import * as React from 'react';
import Link from 'next/link';
import {ChevronRightIcon} from 'lucide-react';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible';
import {cn} from '@/lib/utils';
import {containsActive, isMenuActive, menuHref, menuTitle, type MenuNode, type MenuSection} from '@/lib/nav/menu';
import {CustomMenuButton} from './app-shared';
import {EditModeMenuItem} from './nav-edit-mode';
import {MenuIcon} from './menu-icons';

// Раздел общего меню (lib/nav/menu.ts): Свод, WB, Ozon, Сайт, Служебное.
//
// Свой пункт (app: 'site') — next/link. В блоке Efferd стояли обычные ссылки,
// а у нас обычная ссылка означала ПОЛНУЮ ПЕРЕЗАГРУЗКУ на каждый переход между
// разделами (замерено: два перехода страницы на один щелчок). Пункт аналитики
// — обычная <a>: это другое приложение, клиентский роутер Next туда не ведёт.
//
// Группа с подпунктами («Витрина», «Финансы», «Книги») раскрывается и никуда
// не ведёт сама — так же устроено у аналитики. Раскрыта сразу, если внутри
// текущий раздел: владелец видит, где он, не открывая руками.

// Подпункты — тот же язык, что у пунктов (app-shared.tsx): 44 px на телефоне,
// текущий отмечен чертой слева, а не заливкой.
const SUB_BUTTON = cn(
  'min-h-11 md:min-h-7 [&>span]:text-[14px] [&>span]:text-foreground/80',
  'relative data-[active=true]:bg-transparent data-[active=true]:font-medium data-[active=true]:[&>span]:text-foreground',
  'data-[active=true]:before:absolute data-[active=true]:before:inset-y-1 data-[active=true]:before:-left-[9px] data-[active=true]:before:w-[2px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-foreground',
);

// Кнопка меню стоит с asChild: Slot кладёт свои className, data-active и
// обработчики на ДОЧЕРНИЙ элемент. Обёртка обязана пробросить их до ссылки и
// взять ref — иначе пропадают отметка текущего раздела, 44 px на телефоне и
// вся вёрстка пункта (поймано тестом 26.09: data-active не доходил до <a>).
type NodeLinkProps = {node: MenuNode; locale: string} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>;

const NodeLink = React.forwardRef<HTMLAnchorElement, NodeLinkProps>(function NodeLink({node, locale, ...rest}, ref) {
  const href = menuHref(node, locale) ?? '#';
  return node.app === 'site' ? <Link ref={ref} href={href} {...rest} /> : <a ref={ref} href={href} {...rest} />;
});

function MenuEntry({node, pathname, locale}: {node: MenuNode; pathname: string; locale: string}) {
  const title = menuTitle(node.title, locale);

  if (node.kind === 'action') {
    // Единственное действие меню — «Правка» сайта.
    return node.id === 'site-edit' ? <EditModeMenuItem /> : null;
  }

  if (node.children?.length) {
    return (
      <Collapsible asChild defaultOpen={containsActive(node, pathname, locale)} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <CustomMenuButton tooltip={title}>
              <MenuIcon name={node.icon} />
              <span className="text-[15px]">{title}</span>
              <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
            </CustomMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {node.children.map((child) => (
                <SidebarMenuSubItem key={child.id}>
                  <SidebarMenuSubButton asChild isActive={isMenuActive(child, pathname, locale)} className={SUB_BUTTON}>
                    <NodeLink node={child} locale={locale}>
                      <span>{menuTitle(child.title, locale)}</span>
                    </NodeLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <CustomMenuButton asChild isActive={isMenuActive(node, pathname, locale)} tooltip={title}>
        <NodeLink node={node} locale={locale}>
          <MenuIcon name={node.icon} />
          {/* 15px: у shadcn кнопка идёт text-sm, то есть 14. Замер 18.09 —
              14 против 32 у заголовка страницы, список читался как служебная
              мелочь. Шаг один, плотность списка сохраняется. */}
          <span className="text-[15px]">{title}</span>
        </NodeLink>
      </CustomMenuButton>
    </SidebarMenuItem>
  );
}

export function NavGroup({section, pathname, locale}: {section: MenuSection; pathname: string; locale: string}) {
  const label = menuTitle(section.title, locale);
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
        {section.items.map((node) => (
          <MenuEntry key={node.id} node={node} pathname={pathname} locale={locale} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
