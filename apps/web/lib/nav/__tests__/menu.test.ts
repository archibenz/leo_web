import {existsSync, readdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {describe, it, expect} from 'vitest';
import {MENU, type MenuNode} from '../menu';
import {MENU_ICONS} from '../../../components/admin/shell/menu-icons';

// Копия общего меню (источник — leo_analytics packages/brand-tokens/menu.json)
// годна для сайта. Побайтное равенство с источником сверяется при каждом
// обновлении копии (cmp по ветке аналитики); здесь — то, что сломалось бы
// у нас молча: пустая иконка, ссылка на несуществующий раздел, потерянный
// раздел админки.

const root = process.cwd();

function all(): MenuNode[] {
  const out: MenuNode[] = [];
  const walk = (nodes: MenuNode[]) => nodes.forEach((n) => (out.push(n), n.children && walk(n.children)));
  MENU.forEach((s) => walk(s.items));
  return out;
}

// '/{locale}/admin/products' → app/[locale]/(admin)/admin/products/page.tsx.
function sitePage(path: string): string | null {
  const rest = path.replace(/^\/\{locale\}/, '');
  const candidates = rest.startsWith('/admin')
    ? [join('app/[locale]/(admin)', rest, 'page.tsx')]
    : [join('app/[locale]/(shop)', rest, 'page.tsx'), join('app/[locale]', rest, 'page.tsx')];
  return candidates.find((c) => existsSync(resolve(root, c))) ?? null;
}

describe('общее меню годно для сайта', () => {
  const nodes = all();

  // Раздел и пункт могут совпасть (у «Свода» оба — summary): ключи React у них
  // на разных уровнях. Повтор среди пунктов — уже беда: два пункта с одним
  // ключом в одном списке, и подсветка/раскрытие путаются.
  it('id не повторяются среди разделов и среди пунктов', () => {
    const sections = MENU.map((s) => s.id);
    const items = nodes.map((n) => n.id);
    expect(new Set(sections).size).toBe(sections.length);
    expect(items.filter((id, i) => items.indexOf(id) !== i)).toEqual([]);
  });

  it('у каждой иконки есть компонент — неизвестное имя не рисует пустое место', () => {
    const missing = nodes.filter((n) => n.icon && !MENU_ICONS[n.icon]).map((n) => `${n.id}: ${n.icon}`);
    expect(missing).toEqual([]);
  });

  it('каждая ссылка сайта ведёт на существующую страницу', () => {
    const broken = nodes
      .filter((n) => n.app === 'site' && n.kind === 'link')
      .filter((n) => !n.path || !sitePage(n.path))
      .map((n) => `${n.id}: ${n.path}`);
    expect(broken).toEqual([]);
  });

  it('ссылки аналитики — под /analytics, без локали', () => {
    const odd = nodes.filter((n) => n.app === 'analytics' && !/^\/analytics(\/|$)/.test(n.path ?? '')).map((n) => n.id);
    expect(odd).toEqual([]);
  });

  it('единственное действие — «Правка» сайта: другого сайт рисовать не умеет', () => {
    expect(nodes.filter((n) => n.kind === 'action').map((n) => n.id)).toEqual(['site-edit']);
  });

  // Раздел админки, у которого есть страница, но нет пункта меню, владелец
  // не найдёт вовсе — так было с /admin до 24.09 (ссылки не было нигде).
  it('ни один раздел админки не потерян при переезде в общее меню', () => {
    const adminDir = resolve(root, 'app/[locale]/(admin)/admin');
    const sections = readdirSync(adminDir, {withFileTypes: true})
      .filter((d) => d.isDirectory() && !d.name.startsWith('__') && existsSync(join(adminDir, d.name, 'page.tsx')))
      .map((d) => `/{locale}/admin/${d.name}`);
    const linked = new Set(nodes.filter((n) => n.app === 'site').map((n) => n.path));
    expect(sections.filter((p) => !linked.has(p))).toEqual([]);
    expect(linked.has('/{locale}/admin')).toBe(true);
  });
});
