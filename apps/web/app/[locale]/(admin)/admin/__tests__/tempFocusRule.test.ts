import {readFileSync, readdirSync, statSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {describe, it, expect} from 'vitest';

// Сторож за ВРЕМЕННЫМ правилом, которое иначе останется навсегда.
//
// Обёртка админки носила класс `gradient-chrome`, и на нём висело видимое
// кольцо фокуса для полей `.admin-input`. Класс снят при переезде оболочки на
// блок Efferd: он красил золотом и новые поля shadcn, у которых кольцо своё.
//
// Но три непереехавшие формы (ProductForm, CollectionForm, CareGuideForm) до
// сих пор на `.admin-input`, а у него в `:focus` только смена цвета рамки. При
// глобальном `:focus { outline: none }` это означало бы потерю видимого фокуса
// с клавиатуры — WCAG 2.4.7. Поэтому в globals.css заведено правило
// `.admin-input:focus-visible`, и оно ВРЕМЕННОЕ.
//
// Пометки «снять потом» недостаточно: её не читают, а доступность просядет
// молча и заметит это не тот, кто чинит. Поэтому проверка, а не комментарий.
//
// Пока `.admin-input` есть хоть у одного экрана — правило обязано быть.
// Исчез последний — правило обязано уйти, и этот кейс покраснеет, чтобы о нём
// вспомнили тем же днём.

const ROOTS = ['app', 'components'] as const;
const TEMP_RULE = '.admin-input:focus-visible';

// Тесты из обхода исключены, и это не оптимизация. Этот файл САМ содержит
// строку 'admin-input' — он же её и ищет. Без исключения сторож находил себя,
// вечно видел «класс ещё жив» и не сработал бы НИКОГДА, даже когда последний
// экран переедет. Поймано на том, что он насчитал три файла там, где их два.
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === '__tests__') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      if (full.includes('.test.')) continue;
      out.push(full);
    }
  }
  return out;
}

// Комментарии выбрасываем перед поиском, и это не мелочь: пояснение «раньше
// здесь был .admin-input» считалось бы применением, и правило не сняли бы
// НИКОГДА — сторож стоял бы вечно зелёным. Ошибиться в эту сторону можно
// безопасно: если вырезать лишнего, список пользователей опустеет, кейс ниже
// покраснеет и потребует снять правило. Это громкий отказ, а не тихий.
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const usersOfAdminInput = ROOTS.flatMap((root) => walk(resolve(process.cwd(), root)))
  .filter((file) => withoutComments(readFileSync(file, 'utf8')).includes('admin-input'))
  .map((file) => file.replace(`${process.cwd()}/`, ''));

const css = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');

describe('временное правило фокуса живёт ровно столько, сколько нужно', () => {
  it('поиск по коду вообще работает (иначе проверка ниже зелёная всегда)', () => {
    // Без этого кейса переименование папок или поломка обхода дали бы пустой
    // список, и «правило больше не нужно» стало бы вердиктом на пустом месте.
    const allFiles = ROOTS.flatMap((root) => walk(resolve(process.cwd(), root)));
    expect(allFiles.length).toBeGreaterThan(100);
  });

  it(
    usersOfAdminInput.length > 0
      ? `.admin-input ещё живёт в ${usersOfAdminInput.length} файлах — правило фокуса обязано быть`
      : '.admin-input больше нет нигде — правило фокуса пора убрать из globals.css',
    () => {
      if (usersOfAdminInput.length > 0) {
        expect(css).toContain(TEMP_RULE);
      } else {
        expect(
          css.includes(TEMP_RULE),
          'Последний .admin-input переехал. Убери правило .admin-input:focus-visible ' +
            'из app/globals.css — оно заводилось только на время переезда форм.',
        ).toBe(false);
      }
    },
  );
});
