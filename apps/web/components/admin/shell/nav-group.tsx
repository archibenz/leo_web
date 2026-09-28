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
import {MENU_FOOTER, containsActive, isMenuActive, menuHref, menuTitle, type MenuNode, type MenuSection} from '@/lib/nav/menu';
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
// не ведёт сама — так же устроено у аналитики. Раскрыта, если внутри текущий
// раздел: владелец видит, где он, не открывая руками.
//
// Раздел с fold (WB, Ozon, Сайт, Служебное — меню от 28.09) складывается
// целиком и раскрыт, только если в нём текущая страница. Пункты аналитики на
// сайте текущими не бывают, поэтому в админке раскрыт один «Сайт».
// emphasis — «Главное · Свод»: заголовок и пункт темнее и жирнее.

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

// Открыт ли блок: следует за страницей, но даёт себя свернуть и раскрыть
// руками. Управляемое, а не defaultOpen: панель живёт между переходами, и
// defaultOpen сработал бы только при первой загрузке — перейдя в другой
// раздел, владелец видел бы раскрытым прежний (так же у аналитики, 28.09).
function useFollowOpen(activeNow: boolean): [boolean, (open: boolean) => void] {
  const [open, setOpen] = React.useState(activeNow);
  React.useEffect(() => setOpen(activeNow), [activeNow]);
  return [open, setOpen];
}

function MenuEntry({node, pathname, locale}: {node: MenuNode; pathname: string; locale: string}) {
  const title = menuTitle(node.title, locale);

  if (node.kind === 'action') {
    // Единственное действие меню — «Правка» сайта.
    return node.id === 'site-edit' ? <EditModeMenuItem /> : null;
  }

  if (node.children?.length) {
    return <MenuBranch node={node} pathname={pathname} locale={locale} title={title} />;
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

function MenuBranch({node, pathname, locale, title}: {node: MenuNode; pathname: string; locale: string; title: string}) {
  const [open, setOpen] = useFollowOpen(containsActive(node, pathname, locale));
  const children = node.children ?? [];
  return (
      <Collapsible asChild open={open} onOpenChange={setOpen} className="group/collapsible">
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
              {children.map((child) => (
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

export function NavGroup({section, pathname, locale}: {section: MenuSection; pathname: string; locale: string}) {
  const label = menuTitle(section.title, locale);
  const sectionActive = section.items.some((node) => containsActive(node, pathname, locale));
  const [open, setOpen] = useFollowOpen(sectionActive);

  const menu = (
    <SidebarMenu className={section.emphasis ? '[&_a]:font-semibold [&_a>span]:text-foreground' : undefined}>
      {section.items.map((node) => (
        <MenuEntry key={node.id} node={node} pathname={pathname} locale={locale} />
      ))}
    </SidebarMenu>
  );

  // text-[13px] — пол админки, тот же, что держит сторож зон нажатия
  // (components/editor/__tests__/touchTargets.test.ts). У shadcn здесь
  // text-xs, то есть 12: замерено 18.09, это была самая мелкая строка
  // панели, и владелец читает её с телефона.
  const labelClass = 'text-[13px] duration-[calc(var(--sidebar-animation-duration)*0.8)] ease-(--sidebar-animation-ease)';

  if (!section.fold) {
    return (
      <SidebarGroup data-section={section.id} data-emphasis={section.emphasis ? '' : undefined}>
        {label && (
          <SidebarGroupLabel className={cn(labelClass, section.emphasis && 'font-semibold text-foreground')}>
            {label}
          </SidebarGroupLabel>
        )}
        {menu}
      </SidebarGroup>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/section">
      <SidebarGroup data-section={section.id}>
        <SidebarGroupLabel asChild className={labelClass}>
          <CollapsibleTrigger className="flex w-full min-h-11 items-center md:min-h-8">
            {label}
            <ChevronRightIcon className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/section:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>{menu}</CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

// Кнопки внизу панели из footer общего меню — «На сайт» (28.09 переехала сюда
// из «Служебного»). Не пункты списка: не складываются и не подсвечиваются.
export function NavFooter({locale}: {locale: string}) {
  if (MENU_FOOTER.length === 0) return null;
  return (
    <SidebarMenu>
      {MENU_FOOTER.map((node) => {
        const title = menuTitle(node.title, locale);
        return (
          <SidebarMenuItem key={node.id}>
            <CustomMenuButton asChild tooltip={title}>
              <NodeLink node={node} locale={locale} data-footer={node.id}>
                <MenuIcon name={node.icon} />
                <span className="text-[15px]">{title}</span>
              </NodeLink>
            </CustomMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
