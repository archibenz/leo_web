import menu from './menu.json';

// Общее боковое меню админки сайта и дашборда аналитики (решение владельца
// 26.09, «А»). Источник — leo_analytics packages/brand-tokens/menu.json, здесь
// побайтная копия. Менять только парой PR с аналитикой; тест
// lib/nav/__tests__/menu.test.ts держит копию годной для сайта.
//
// Правила, о которых договорились с аналитикой:
// - app: 'site' — свой пункт, next/link и подсветка по адресу; 'analytics' —
//   чужое приложение на том же домене, обычная <a> и никакой подсветки здесь;
// - адрес сайта — шаблон '/{locale}/admin/…', локаль подставляет приложение;
// - kind: 'action' — не ссылка (у сайта одна: «Правка»);
// - roles у пунктов аналитики ('section:…') сайт не проверяет: админку видит
//   только ROLE_ADMIN, это владелец, и доступ к каждому разделу аналитики
//   решает сама аналитика, когда по ссылке перейдут.

export type MenuApp = 'site' | 'analytics';

export interface MenuNode {
  id: string;
  title: {ru: string; en?: string};
  icon?: string;
  app: MenuApp;
  kind: 'link' | 'action';
  path?: string;
  match?: 'exact' | 'prefix';
  roles?: string[] | null;
  children?: MenuNode[];
}

export interface MenuSection {
  id: string;
  title: {ru: string; en?: string};
  items: MenuNode[];
}

export const MENU: ReadonlyArray<MenuSection> = (menu as unknown as {sections: MenuSection[]}).sections;

export function menuTitle(title: {ru: string; en?: string}, locale: string): string {
  return (locale === 'en' && title.en) || title.ru;
}

export function menuHref(node: MenuNode, locale: string): string | undefined {
  return node.path?.replace('{locale}', locale);
}

// Подсвечивается только свой пункт: адрес аналитики на страницах сайта
// никогда не текущий, и двойной отметки в общем меню не бывает.
export function isMenuActive(node: MenuNode, pathname: string, locale: string): boolean {
  if (node.app !== 'site' || node.kind !== 'link') return false;
  const href = menuHref(node, locale);
  if (!href) return false;
  if (node.match === 'exact') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Раскрыта ли группа: её собственный адрес или любой вложенный — текущий. */
export function containsActive(node: MenuNode, pathname: string, locale: string): boolean {
  return isMenuActive(node, pathname, locale) || (node.children ?? []).some((c) => containsActive(c, pathname, locale));
}

/** Все ссылки сайта плоским списком — для хлебных крошек в шапке. */
export function siteLinks(): MenuNode[] {
  const out: MenuNode[] = [];
  const walk = (nodes: MenuNode[]) => {
    for (const n of nodes) {
      if (n.app === 'site' && n.kind === 'link' && n.path) out.push(n);
      if (n.children) walk(n.children);
    }
  };
  MENU.forEach((s) => walk(s.items));
  return out;
}
