import {describe, it, expect} from 'vitest';
import {readdirSync, readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

// Порог зоны нажатия в редакторе на живой странице: 44px по высоте, кегль не
// мельче 13. Принят в приёмке админки (план 2026-09-13-admin-white.md).
//
// ПОЧЕМУ СТОРОЖ, А НЕ ПРОСТО ПОДНЯТЫЕ ПИКСЕЛИ. Замер 15.09 на 393×852 показал
// не разброс, а ВЫБОРОЧНОСТЬ: «Вверх / Вниз / Убрать» у кадров галереи — 44 px,
// те же самые кнопки у строк бегущей строки — 35. Один жест, две соседние
// панели, разный размер. Порог знали и применяли каждый раз заново, на глаз, —
// так и живут правила, которые никто не держит.
//
// Владелец правит с телефона. Промахнувшись мимо кнопки, он не думает
// «промахнулся» — он думает, что она не работает.
//
// ПОЧЕМУ ЭТА ПРОВЕРКА, А НЕ ЗАМЕР В БРАУЗЕРЕ. Замер честнее: он видит
// настоящую высоту, а не класс. Но e2e у нас в CI не гоняется вовсе (lw-sud7),
// то есть сторож на замере был бы сторожем, который никогда не просыпается.
// Эта проверка идёт с юнитами и потому просыпается на каждый PR. Когда e2e
// поедет в CI, замер стоит добавить рядом — он поймает то, чего класс не
// видит (перекрытие, нулевую ширину, transform).
const ПОРОГ = ['min-h-11', 'min-h-12', 'min-h-[44px]', 'h-11', 'h-12', 'h-20'];
const МЕЛКИЙ_КЕГЛЬ = /text-\[(10|11|12)(\.\d+)?px\]/;

// Элементы, которых палец не касается вовсе. Список короткий и каждый назван
// поимённо: «исключение по признаку» (например «все input[type=file]»)
// однажды пропустит настоящую кнопку.
const НЕ_КАСАЮТСЯ = [
  // Файловый вход спрятан, нажимают по кнопке рядом — она тут же и мерится.
  'sr-only',
  'hidden',
];

const ТЕГИ = ['button', 'input', 'select', 'textarea', 'Link'];

const каталог = join(dirname(fileURLToPath(import.meta.url)), '..');

function файлы(): string[] {
  return readdirSync(каталог)
    .filter((n) => n.endsWith('.tsx'))
    .map((n) => join(каталог, n));
}

/** `const X = '...'` в том же файле — className часто ссылается на такую строку. */
function строковыеКонстанты(source: string): Map<string, string> {
  const out = new Map<string, string>();
  const re = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*(?:\r?\n\s*)?'([^']*)'/g;
  for (const m of source.matchAll(re)) out.set(m[1]!, m[2]!);
  return out;
}

/**
 * Тело открывающего тега — от `<tag` до закрывающей `>` ЭТОГО тега.
 *
 * Не регулярным выражением: в атрибутах живут стрелки `=>` и вложенные
 * `{...}`, и `[^>]*` обрывает разбор на первой же стрелке. Обрыв не виден
 * глазом — он даёт «className не найден», то есть проверка молча считает
 * элемент безымянным и пропускает. Ровно тот отказ, ради которого ниже стоит
 * сторож на число найденного.
 */
function телоТега(source: string, from: number): string | null {
  let глубина = 0;
  let кавычка: string | null = null;
  for (let i = from; i < source.length; i++) {
    const c = source[i]!;
    if (кавычка !== null) {
      if (c === кавычка && source[i - 1] !== '\\') кавычка = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') кавычка = c;
    else if (c === '{') глубина++;
    else if (c === '}') глубина--;
    else if (c === '>' && глубина === 0) return source.slice(from, i);
  }
  return null;
}

/**
 * Комментарии — пробелами той же длины, чтобы номера строк не поехали.
 *
 * В шапках здешних файлов `<select>` и `<button>` упоминаются словами, и без
 * этого сторож ловил их как настоящие элементы «без className». Ложная тревога
 * хуже пропуска ровно наполовину: пропуск молчит, а тревога учит не верить.
 */
function безКомментариев(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^([ \t]*)\/\/.*$/gm, (m, отступ: string) => отступ + ' '.repeat(m.length - отступ.length));
}

/** Все className интерактивных тегов, с подставленными константами файла. */
function зоныНажатия(исходник: string): {tag: string; className: string; line: number}[] {
  const source = безКомментариев(исходник);
  const константы = строковыеКонстанты(source);
  const out: {tag: string; className: string; line: number}[] = [];
  for (const tag of ТЕГИ) {
    const re = new RegExp(`<${tag}(?=[\\s/>])`, 'g');
    for (const m of source.matchAll(re)) {
      const attrs = телоТега(source, m.index + tag.length + 1);
      if (attrs === null) continue;
      const строкой = /className="([^"]*)"/.exec(attrs);
      const выражением = /className=\{/.exec(attrs);
      let className = строкой?.[1] ?? '';
      if (!строкой && выражением) {
        className = attrs.slice(выражением.index);
        for (const [имя, значение] of константы) {
          className = className.split(имя).join(значение);
        }
      }
      out.push({tag, className, line: source.slice(0, m.index).split('\n').length});
    }
  }
  return out;
}

describe('редактор на живой странице — зоны нажатия', () => {
  const найдено = файлы().flatMap((путь) =>
    зоныНажатия(readFileSync(путь, 'utf8')).map((z) => ({...z, файл: путь.split('/').pop()!})),
  );

  // СТОРОЖ САМОГО СТОРОЖА. Разбор идёт по тексту, и любая перемена формы
  // записи (иной способ задать className, другой примитив) может оставить его
  // без единого элемента — то есть зелёным навсегда. Число намеренно ниже
  // нынешнего (на 15.09 их 14): оно ловит обвал разбора, а не запрещает
  // убирать поля.
  it('разбор вообще что-то находит — иначе проверка зелёная по пустоте', () => {
    expect(найдено.length).toBeGreaterThanOrEqual(10);
  });

  it('каждая зона нажатия не мельче 44px по высоте', () => {
    const мелкие = найдено
      .filter((з) => !НЕ_КАСАЮТСЯ.some((и) => з.className.includes(и)))
      .filter((з) => !ПОРОГ.some((к) => з.className.includes(к)))
      .map((з) => `${з.файл}:${з.line} <${з.tag}> — ${з.className.slice(0, 70) || '(без className)'}`);

    expect(мелкие, 'высоту берут из inputClass или из EditorButton — там она задана один раз').toEqual([]);
  });

  it('кегль не мельче 13 — подпись, по которой целятся пальцем', () => {
    const мелкие = найдено
      .filter((з) => !НЕ_КАСАЮТСЯ.some((и) => з.className.includes(и)))
      .filter((з) => МЕЛКИЙ_КЕГЛЬ.test(з.className))
      .map((з) => `${з.файл}:${з.line} <${з.tag}> — ${з.className.slice(0, 70)}`);

    expect(мелкие).toEqual([]);
  });

  // Не про размер, а про то, ПОЧЕМУ размер разъехался: у EditorButton был
  // выбор из двух размеров, и выбирали каждый раз заново. Пока выбора нет,
  // новая кнопка редактора не может родиться мелкой.
  it('у EditorButton один размер — выбора «помельче» не существует', () => {
    const источник = readFileSync(join(каталог, 'EditorFields.tsx'), 'utf8');
    expect(источник).not.toMatch(/size\?:\s*'sm'/);
    expect(источник).not.toMatch(/size="touch"/);
  });
});
