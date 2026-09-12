import {cookies} from 'next/headers';
import {getStorefront, getStorefrontPreview} from './fetch';
import type {Storefront} from './types';
import {EDIT_COOKIE} from './editMode';

// Кто перед нами и что ему показывать. Серверный модуль: ходит в `cookies()`,
// поэтому его нельзя импортировать из клиентских компонентов.
//
// Разделение чтения — правило этапа, а не деталь реализации:
//   • публичное чтение витрины идёт через getStorefront (со снимком);
//   • предпросмотр черновика — через getStorefrontPreview (без снимка, без
//     кэша, по своей ручке).
// Ни одна ветка ниже не смешивает эти два источника.

// Флаг живёт в editMode.ts — модуле без серверных импортов, чтобы шапка
// витрины могла взять его, не утащив в браузер `next/headers`.
export {EDIT_PARAM, wantsEditing} from './editMode';

const SESSION_COOKIE = 'rl_session';

export type StorefrontView =
  | {editing: false; storefront: Storefront}
  | {editing: true; storefront: Storefront}
  | {editing: true; storefront: null; previewError: string};

/**
 * Что показать этому посетителю.
 *
 * Флаг в адресе ИЛИ кука `rl_edit` — намерение, а не право. Право даёт cookie
 * сессии, которую проверяет БЭКЕНД: ручка предпросмотра лежит под
 * `/api/admin/**`, то есть под ROLE_ADMIN. Посторонний с прямой ссылкой
 * `?edit=1` или с подставленной в консоли `rl_edit=1` получит 403 и увидит
 * опубликованное — не потому, что мы спрятали кнопку, а потому что черновик
 * ему физически не отдан.
 *
 * Без cookie сессии мы не ходим в API вовсе: анонимный посетитель не должен
 * уметь дёргать админскую ручку параметром или кукой в адресе.
 */
export async function storefrontForViewer(wantsEditParam: boolean): Promise<StorefrontView> {
  const jar = await cookies();

  // Кука rl_edit — второй, персистентный способ попросить то же самое, что
  // ?edit=1. Она НЕ HttpOnly, и это не недосмотр: ставит и снимает её
  // document.cookie в браузере (выключатель в аккаунте/админке — см.
  // components/editor/editCookie.ts), значит прочитать её обязан и клиент.
  // Секрета в ней и так нет — значение ровно '1', угадывается с одной
  // попытки, — поэтому она ничего не решает сама: решает то же, что и
  // раньше, ниже по функции (сессия + бэкенд на ручке предпросмотра).
  //
  // Предупреждение на будущее, не про сегодня: сейчас черновик живёт по
  // ОТДЕЛЬНОМУ адресу (?edit=1), а с кукой он садится на тот же адрес, что и
  // публичная страница. Это безопасно, пока HTML никто не кэширует (на
  // проде `Cache-Control: private, no-cache, no-store`). Как только между
  // нами и покупателем встанет кэш HTML (nginx proxy_cache, CDN), один адрес
  // начнёт означать две разные страницы, и без заголовка `Vary: Cookie` кэш
  // начнёт раздавать черновик покупателям или публичную страницу владельцу.
  // Решение включить кэш принимают не в этом файле — но цену должен увидеть
  // тот, кто здесь читает куку.
  const wantsEdit = wantsEditParam || jar.get(EDIT_COOKIE)?.value === '1';
  if (!wantsEdit) return {editing: false, storefront: await getStorefront()};

  const session = jar.get(SESSION_COOKIE);
  if (!session?.value) return {editing: false, storefront: await getStorefront()};

  const preview = await getStorefrontPreview(`${SESSION_COOKIE}=${session.value}`);
  if (preview.state === 'draft') return {editing: true, storefront: preview.storefront};
  if (preview.state === 'forbidden') return {editing: false, storefront: await getStorefront()};
  // Снимок здесь запрещён: показать опубликованное под видом черновика — это
  // либо «правка потерялась» и вторая правка поверх первой, либо «правка
  // применилась» и «Опубликовать» вслепую. Лучше сказать прямо.
  return {editing: true, storefront: null, previewError: preview.reason};
}
