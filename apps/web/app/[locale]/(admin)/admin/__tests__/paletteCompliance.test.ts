import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, it, expect} from 'vitest';

// Приёмка task-admin-white-brief.md, п.1: «ноль вхождений var(--accent),
// paper-card, lux-, золотых hex-констант и shadow-» в файлах, которые эта
// ветка переодевает в язык витрины (оболочка + дашборд). Проверка поиском по
// коду, а не глазами — этот файл и есть та проверка. Мутация из брифа («верни
// var(--accent) в один элемент оболочки») обязана красить ровно эти кейсы.
//
// Список токенов шире буквального перечня брифа (добавлены var(--ink),
// var(--ink-soft), var(--paper — токены той же градиентной темы — и
// rounded-*, раз «никакого золота, теней и скруглений» тоже часть приёмки).
// Более строгая проверка не противоречит брифу: она проходит ровно тогда же,
// когда прошёл бы буквальный список, и ловит больше настоящих регрессий.

// process.cwd() — apps/web/: и npm test, и CI запускают vitest из этого
// каталога (package.json:scripts.test). new URL(rel, import.meta.url) здесь
// не годится — Vitest отдаёт import.meta.url не как файловый URL, а как путь
// через свой dev-сервер (схема отличается от "file"), поэтому readFileSync
// падает с «The URL must be of scheme file».
function read(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

const FILES = [
  'app/[locale]/(admin)/admin/page.tsx',
  'components/admin/AdminLayout.tsx',
  'components/admin/AdminPrimitives.tsx',
] as const;

const FORBIDDEN: ReadonlyArray<{name: string; pattern: RegExp}> = [
  {name: 'var(--accent)', pattern: /var\(--accent\)/},
  {name: 'var(--ink)', pattern: /var\(--ink\)/},
  {name: 'var(--ink-soft)', pattern: /var\(--ink-soft\)/},
  {name: 'var(--paper', pattern: /var\(--paper/},
  {name: 'paper-card', pattern: /paper-card/},
  {name: 'lux- класс', pattern: /\blux-[a-z]/},
  {name: 'золотой hex #D4A574', pattern: /#D4A574/i},
  {name: 'золотой hex #c9955f', pattern: /#c9955f/i},
  {name: 'золотой hex #a87a48', pattern: /#a87a48/i},
  // rounded-none разрешён явно — это снятие скругления, не скругление.
  {name: 'rounded-* (скругление)', pattern: /\brounded-(?!none\b)[a-z0-9]/},
  {name: 'shadow- класс', pattern: /\bshadow-[a-z]/},
];

describe('оболочка и дашборд админки — язык витрины, не градиент (task-admin-white-brief.md)', () => {
  for (const file of FILES) {
    describe(file, () => {
      const source = read(file);
      for (const {name, pattern} of FORBIDDEN) {
        it(`не содержит ${name}`, () => {
          expect(source).not.toMatch(pattern);
        });
      }
    });
  }
});
