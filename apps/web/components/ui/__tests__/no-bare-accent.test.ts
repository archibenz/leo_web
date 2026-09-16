import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

// Сторож против возврата одной конкретной поломки, а не против «некрасивого».
//
// У shadcn токен `accent` означает ПОВЕРХНОСТЬ НАВЕДЕНИЯ: пункт списка под
// курсором. У нас ключ `accent` в tailwind.config.ts означает БРЕНДОВОЕ ЗОЛОТО
// #D4A574 — им набраны заголовки и рамки витрины, 130 применений в 23 файлах.
//
// Одно имя на два смысла даёт золото по золоту с неопределённым цветом текста:
// наведение на пункт выпадающего списка заливает его золотом, а надпись красится
// в `text-accent-foreground`, которого в конфиге нет вовсе. На снимке это
// незаметно — беда видна только рукой, поэтому и нужен сторож, а не глаз.
//
// Лечение выбрано такое, чтобы золото витрины не сдвинулось ни на единицу:
// ключ `accent` не тронут вовсе, а примитивам дан отдельный `ui-accent`
// (--sh-ui-accent в globals.css). Замена сделана руками в 18 местах.
//
// Почему сторож нужен: `npx shadcn add <любой из этих>` перезаписывает файл
// исходником из реестра, и `bg-accent` возвращается молча.
//
// СПИСОК ПОПОЛНЕН 17.09, И ВОТ ЧЕМУ ЭТО НАУЧИЛО. Исключение было файловым:
// «наши собственные примитивы пользуются золотом законно». У button.tsx это
// верно ровно про один вариант — `white`, который надевает .wv-btn. А варианты
// `outline` и `ghost` несли золото ИЗ КОРОБКИ shadcn, и файловое исключение
// закрывало сторожу глаза на них обоих.
//
// Замерено на /ru/admin: тумблер навигации под курсором давал
// rgb(212, 165, 116). Сторож стоял, был зелёным и не мог увидеть — потому что
// прощал файл целиком, а не конкретное применение.
//
// Теперь button в списке: законное золото в нём идёт через .wv-btn, а не через
// классы accent, значит запрет ему не мешает. Остальные исключения
// (carousel, navbar-menu, search-bar, ConfirmDialog) оставлены как были —
// проверено 17.09 обходом импортов: ни один из них не достижим из маршрутов
// app/, это мёртвый код градиентной эпохи. Трогать их — отдельная уборка.
const SHADCN_MANAGED = [
  'avatar',
  'badge',
  'breadcrumb',
  'button',
  'card',
  'chart',
  'checkbox',
  'collapsible',
  'command',
  'dialog',
  'dropdown-menu',
  'empty',
  'input',
  'input-group',
  'item',
  'kbd',
  'label',
  'popover',
  'scroll-area',
  'select',
  'separator',
  'sheet',
  'sidebar',
  'skeleton',
  'table',
  'textarea',
  'toggle',
  'toggle-group',
  'tooltip',
] as const;

// Класс вида `bg-accent`, `focus:text-accent-foreground`, `[a]:hover:bg-accent/50`.
// Приставку `sidebar-` и нашу `ui-` пропускаем: это отдельные токены, они заданы.
const BARE_ACCENT = /(?<![-\w])(?:[a-z[\]&>_:=.-]*:)?(?:bg|text|border|ring|from|to|via|fill|stroke|outline|divide|shadow)-accent\b/g;

function read(name: string): string {
  return readFileSync(join(__dirname, '..', `${name}.tsx`), 'utf8');
}

describe('примитивы shadcn не красятся брендовым золотом', () => {
  it.each(SHADCN_MANAGED)('%s не использует голый класс accent', name => {
    const source = read(name);
    const found = source.match(BARE_ACCENT) ?? [];

    expect(
      found,
      `${name}.tsx снова красится золотом витрины: ${found.join(', ')}. ` +
        'Скорее всего файл перезаписан «npx shadcn add». Замени accent на ui-accent — ' +
        'см. комментарий в tailwind.config.ts.',
    ).toEqual([]);
  });

  // Сторож обязан уметь краснеть: если выражение перестанет что-либо находить
  // (переписали, сломали, экранировали не то), проверки выше станут зелёными
  // всегда — в том числе на вернувшемся золоте. Этот кейс держит выражение
  // живым на заведомо плохом входе.
  it('выражение действительно находит голый accent', () => {
    const bad = 'focus:bg-accent focus:text-accent-foreground data-[state=on]:bg-accent';
    expect(bad.match(BARE_ACCENT)).toHaveLength(3);
  });

  it('и не срабатывает на тех, что заданы нами', () => {
    const good = 'bg-ui-accent text-ui-accent-foreground bg-sidebar-accent [a]:hover:bg-ui-accent/50';
    expect(good.match(BARE_ACCENT)).toBeNull();
  });
});
