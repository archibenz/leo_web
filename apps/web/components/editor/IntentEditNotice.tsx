import {cookies} from 'next/headers';
import {EDIT_COOKIE} from '../../lib/catalogue/editMode';
import {FOOT, HAIR, INK} from '../../app/[locale]/wv-palette';

// Полоса для страниц, где править НЕЧЕГО.
//
// Правка живёт на двух экранах из двенадцати (главная и карточка товара):
// только они зовут storefrontForViewer и монтируют EditorProvider. На
// остальных десяти владелец, включивший режим, не видел ничего — страница
// выглядела обычной. Режим, который включается и ничего не делает, читается
// как поломка.
//
// ГОВОРИМ О НАМЕРЕНИИ, А НЕ О ПРАВЕ. Различение уже есть в проекте и названо
// в lib/catalogue/viewer.ts: «флаг в адресе ИЛИ кука rl_edit — намерение, а не
// право; право даёт cookie сессии, которую проверяет бэкенд». Здесь мы
// показываем ровно намерение: черновика на этих страницах не бывает вовсе,
// значит и утверждать про признанную сессию нечего. Новой правды не заводится,
// используется существующая под своим именем.
//
// Кука сессии — не доказательство права, а отсечка постороннего: без неё
// человек, подставивший rl_edit=1 в консоли, увидел бы полосу, которая ему
// ничего не говорит и говорить не должна.
//
// НАМЕРЕНИЕ БЕРЁТСЯ ТОЛЬКО ИЗ КУКИ. Layout в App Router не получает
// searchParams — ни один наш layout их и не берёт, — поэтому одноразовая
// ссылка `?edit=1` сюда не доходит. Это осознанное ограничение: постоянный
// режим ставит выключатель в аккаунте, и он ставит именно куку.
//
// НИ ОДНОГО ДЕЙСТВИЯ. Ни кнопки, ни ссылки: полоса только извещает. Кнопка,
// которая ничего не делает, хуже отсутствующей.
export function shouldShowIntentNotice({intent, session}: {intent: boolean; session: boolean}): boolean {
  return intent && session;
}

export default async function IntentEditNotice() {
  const jar = await cookies();
  const показывать = shouldShowIntentNotice({
    intent: jar.get(EDIT_COOKIE)?.value === '1',
    session: jar.has('rl_session'),
  });
  if (!показывать) return null;

  // data-edit-bar="intent" — метка для правила в globals.css: на главной и в
  // карточке рядом встаёт подробная полоса (data-edit-bar="full"), и две
  // полосы подряд противоречили бы друг другу.
  return (
    <div
      data-edit-bar="intent"
      className="flex flex-wrap items-center gap-3 px-4 py-2 text-[11px] uppercase tracking-[0.16em]"
      style={{background: FOOT, borderBottom: `1px solid ${HAIR}`, color: INK}}
    >
      <span>Режим правки включён · на этой странице нечего править</span>
    </div>
  );
}
