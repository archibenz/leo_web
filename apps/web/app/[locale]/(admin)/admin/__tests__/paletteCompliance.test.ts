import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, it, expect} from 'vitest';

// Сторож против протечки СТАРОЙ ТЁМНОЙ ТЕМЫ в админку: золото `var(--accent)`,
// бумага `var(--paper*)`, чернила `var(--ink*)`, классы `lux-` и `paper-card`.
// Проверка поиском по коду, а не глазами.
//
// ЗАЧЕМ ОН НУЖЕН И ПОСЛЕ ПЕРЕЕЗДА. Инверсия темы эти токены не обезвреживает:
// `--paper-base` это `#1e120d`, и экран, поставивший его себе, остаётся тёмным,
// что бы ни говорило глобальное правило. Замерено 15.09: в непереехавших
// разделах 112 вхождений старой палитры в 15 файлах. Пока они не переехали,
// сторож держит границу для тех, что переехали.
//
// ─── ДВА ПРАВИЛА СНЯТЫ 15.09, И ЭТО РЕШЕНИЕ, А НЕ ПОСЛАБЛЕНИЕ ───
//
// Прежняя редакция запрещала ещё `rounded-*` и `shadow-*`. Эти два пришли не
// из тёмной темы, а из ЯЗЫКА ВИТРИНЫ: острые углы, никаких теней. Владелец
// язык админки отменил прямо — «у тебя же есть пример с efferd сделай по нему
// дашборды», — а блоки Efferd скруглены и пользуются лёгкой тенью.
//
// Держать запрет значило бы сторожем отменять слово владельца. Снимаю их
// здесь, а не обхожу в коде: обход оставил бы правило на месте, и следующий
// потратил бы время, выясняя, почему оно нарушено везде.
//
// Остальные запреты сильнее прежних: список файлов теперь включает ВСЮ
// оболочку и все части дашборда, а не три файла. Золото, протёкшее в любой из
// них, красит этот сторож.

function read(relPath: string): string {
  // process.cwd() — apps/web/: и npm test, и CI запускают vitest отсюда.
  return readFileSync(resolve(process.cwd(), relPath), 'utf8');
}

function tsxIn(dir: string): string[] {
  try {
    return readdirSync(resolve(process.cwd(), dir))
      .filter((name) => name.endsWith('.tsx') || name.endsWith('.ts'))
      .map((name) => `${dir}/${name}`);
  } catch {
    return [];
  }
}

// СПИСОК РАСТЁТ ПО МЕРЕ ПЕРЕЕЗДА, и это его свойство, а не недоделка: девять
// экранов ещё в старой палитре, и включить их сюда сейчас значило бы завести
// сторож, который красный с первого дня и потому ничего не сторожит.
// Переодел экран — добавь его сюда тем же коммитом.
//
// Признак, по которому файл сюда попадает: он РИСУЕТСЯ ВНУТРИ АДМИНКИ.
// Не «лежит в components/admin/» — на этом признаке список уже один раз
// оказался неполон: `components/Toaster.tsx` монтируется админской веткой,
// вставал поверх каждого экрана в старой тёмной палитре, и поиск по папке его
// не находил. Нашёлся он на кадре.
const FILES: ReadonlyArray<string> = [
  'app/[locale]/(admin)/layout.tsx',
  'app/[locale]/(admin)/admin/page.tsx',
  'app/[locale]/(admin)/admin/homepage/page.tsx',
  'app/[locale]/(admin)/admin/products/page.tsx',
  'app/[locale]/(admin)/admin/care/page.tsx',
  'app/[locale]/(admin)/admin/inventory/page.tsx',
  'app/[locale]/(admin)/admin/products/[id]/page.tsx',
  'app/[locale]/(admin)/admin/products/new/page.tsx',
  'app/[locale]/(admin)/admin/care/[id]/page.tsx',
  'app/[locale]/(admin)/admin/care/new/page.tsx',
  'app/[locale]/(admin)/admin/socials/page.tsx',
  'app/[locale]/(admin)/admin/texts/page.tsx',
  'components/admin/AdminLayout.tsx',
  'components/admin/AdminPrimitives.tsx',
  'components/admin/ProductForm.tsx',
  'components/admin/CareGuideForm.tsx',
  'components/admin/AdminGuard.tsx',
  'components/admin/ImageUpload.tsx',
  'components/Toaster.tsx',
  ...tsxIn('components/admin/shell'),
  ...tsxIn('components/admin/dashboard'),
  ...tsxIn('components/admin/list'),
  ...tsxIn('components/admin/form'),
];

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
];

describe('админка не красится старой тёмной темой', () => {
  // Если список файлов вдруг окажется пустым (папку переименовали, глоб
  // перестал находить), все проверки ниже пройдут молча — ноль файлов даёт
  // ноль нарушений. Сторож, который нечего сторожить, хуже отсутствующего.
  it('файлы под присмотром вообще найдены', () => {
    expect(FILES.length).toBeGreaterThanOrEqual(10);
    expect(FILES.some((f) => f.startsWith('components/admin/shell/'))).toBe(true);
    expect(FILES.some((f) => f.startsWith('components/admin/dashboard/'))).toBe(true);
  });

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
