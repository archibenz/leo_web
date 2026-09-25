import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, it, expect} from 'vitest';
import tokens from '../theme-tokens.json';

// Один набор цветов на админку сайта и дашборд аналитики (25.09): переход
// «админка → аналитика» должен выглядеть одним целым. Каноничная таблица
// лежит в leo_analytics packages/brand-tokens/theme-tokens.json, здесь её
// копия. Этот тест держит globals.css равным копии, такой же тест у
// аналитики держит её CSS равным оригиналу. Менять — только парой PR.
//
// Имена в таблице — shadcn без приставки; у нас --sh-*, и два имени свои:
// `accent` у нас брендовое золото, поэтому поверхность наведения зовётся
// ui-accent, а фон панели — просто sidebar.
function cssName(token: string): string {
  if (token === 'accent') return '--sh-ui-accent';
  if (token === 'accent-foreground') return '--sh-ui-accent-foreground';
  if (token === 'sidebar-background') return '--sh-sidebar';
  return `--sh-${token}`;
}

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

function block(selectorStart: RegExp): string {
  const start = css.search(selectorStart);
  expect(start, `нет блока ${selectorStart}`).toBeGreaterThanOrEqual(0);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

function declared(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of body.matchAll(/(--sh-[a-z-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim());
  return out;
}

const light = declared(block(/^:root\s*\{/m));
const dark = declared(block(/html:has\(\[data-admin-shell\]\)\s*\{/));

describe('токены темы равны общей таблице с аналитикой', () => {
  it('в таблице 27 токенов, одни и те же в обеих темах', () => {
    expect(Object.keys(tokens.light)).toHaveLength(27);
    expect(Object.keys(tokens.dark).sort()).toEqual(Object.keys(tokens.light).sort());
  });

  for (const theme of ['light', 'dark'] as const) {
    const actual = theme === 'light' ? light : dark;
    for (const [name, value] of Object.entries(tokens[theme])) {
      it(`${theme}: ${cssName(name)} = ${value}`, () => {
        expect(actual.get(cssName(name))).toBe(value);
      });
    }
  }
});
