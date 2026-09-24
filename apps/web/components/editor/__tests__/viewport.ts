import {act} from '@testing-library/react';

// Ширина экрана для тестов правки. В jsdom нет matchMedia, а правка витрины
// зависит от ширины (useIsDesktop.ts), поэтому ширину задаёт сам тест — явно,
// а не заглушкой «всегда компьютер» на весь прогон: иначе проверка «на
// телефоне правки нет» проходила бы на настольной раскладке.
//
// Понимает только (min-width: Npx) и (max-width: Npx) — ровно то, что
// спрашивает витрина. Смена ширины рассылает `change` подписчикам, как
// настоящий браузер при повороте телефона или сужении окна.

type Listener = (event: {matches: boolean}) => void;

let width = 1280;
const listeners = new Map<string, Set<Listener>>();

function evaluate(query: string): boolean {
  const min = /\(min-width:\s*(\d+)px\)/.exec(query);
  const max = /\(max-width:\s*(\d+)px\)/.exec(query);
  if (min && width < Number(min[1])) return false;
  if (max && width > Number(max[1])) return false;
  return Boolean(min || max);
}

function install(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches() {
        return evaluate(query);
      },
      media: query,
      addEventListener: (_: string, fn: Listener) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query)!.add(fn);
      },
      removeEventListener: (_: string, fn: Listener) => {
        listeners.get(query)?.delete(fn);
      },
    }),
  });
}

export function setViewport(next: number): void {
  width = next;
  install();
}

export function resizeViewport(next: number): void {
  act(() => {
    width = next;
    for (const [query, fns] of listeners) {
      for (const fn of fns) fn({matches: evaluate(query)});
    }
  });
}
