import {cookies} from 'next/headers';
import {getStorefront, getStorefrontPreview} from './fetch';
import type {Storefront} from './types';

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
 * Флаг в адресе — намерение, а не право. Право даёт cookie сессии, которую
 * проверяет БЭКЕНД: ручка предпросмотра лежит под `/api/admin/**`, то есть под
 * ROLE_ADMIN. Посторонний с прямой ссылкой `?edit=1` получит 403 и увидит
 * опубликованное — не потому, что мы спрятали кнопку, а потому что черновик
 * ему физически не отдан.
 *
 * Без cookie мы не ходим в API вовсе: анонимный посетитель не должен уметь
 * дёргать админскую ручку одним параметром в адресе.
 */
export async function storefrontForViewer(wantsEdit: boolean): Promise<StorefrontView> {
  if (!wantsEdit) return {editing: false, storefront: await getStorefront()};

  const session = (await cookies()).get(SESSION_COOKIE);
  if (!session?.value) return {editing: false, storefront: await getStorefront()};

  const preview = await getStorefrontPreview(`${SESSION_COOKIE}=${session.value}`);
  if (preview.state === 'draft') return {editing: true, storefront: preview.storefront};
  if (preview.state === 'forbidden') return {editing: false, storefront: await getStorefront()};
  // Снимок здесь запрещён: показать опубликованное под видом черновика — это
  // либо «правка потерялась» и вторая правка поверх первой, либо «правка
  // применилась» и «Опубликовать» вслепую. Лучше сказать прямо.
  return {editing: true, storefront: null, previewError: preview.reason};
}
