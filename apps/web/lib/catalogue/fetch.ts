import {API_BASE} from '../api';
import type {Storefront} from './types';

// Серверный доступ к каталогу. Один запрос на рендер страницы; Next кэширует
// ответ на 600 с (как revalidate у shop и PDP) и помечает тегом — этап 2
// сбрасывает его из админки через revalidateTag('storefront').
//
// Модуль серверный по использованию: его зовут только Server Components.
// Пакета `server-only` в проекте нет, и заводить зависимость ради одного
// импорта не стали — граница держится тем, что ни один 'use client' файл сюда
// не ходит (клиент получает каталог пропсами).
//
// CATALOGUE_SOURCE=fixture — для e2e и локальной разработки без API. В
// production запрещён, чтобы прод никогда не показал фикстуру вместо базы.

// Последний удачный ответ живёт в памяти процесса Node. Это НЕ замена Data
// Cache: у запущенного сервера снимок и так держит Next (провалившаяся фоновая
// ревалидация не стирает прошлый ответ). Закрыта другая дыра — холодный старт:
// деплой перезапускает и сайт, и API, и первый запрос к странице, пришедший
// раньше, чем поднялся API, уронил бы её пятисоткой. Копия своя у каждого
// процесса и умирает вместе с ним.
let lastKnownGood: Storefront | null = null;

export async function getStorefront(): Promise<Storefront> {
  if (process.env.CATALOGUE_SOURCE === 'fixture') {
    if (process.env.NODE_ENV === 'production') throw new Error('CATALOGUE_SOURCE=fixture is not allowed in production');
    const {STOREFRONT_FIXTURE} = await import('./fixture');
    return STOREFRONT_FIXTURE;
  }
  try {
    const res = await fetch(`${API_BASE}/api/catalog/storefront`, {next: {revalidate: 600, tags: ['storefront']}});
    if (!res.ok) throw new Error(`storefront fetch failed: ${res.status}`);
    const storefront = (await res.json()) as Storefront;
    lastKnownGood = storefront;
    return storefront;
  } catch (error) {
    if (lastKnownGood === null) throw error;
    console.error('storefront fetch failed; serving the last known good catalogue', error);
    return lastKnownGood;
  }
}

// Три честных исхода предпросмотра. Четвёртого — «показать что-нибудь» — нет.
export type StorefrontPreview =
  | {state: 'draft'; storefront: Storefront}
  // Смотрит не редактор: cookie чужая, протухшая или роль не admin. Страница
  // отдаёт опубликованное, как любому посетителю.
  | {state: 'forbidden'}
  // Сервер данных недоступен. Показывать при этом снимок нельзя — см. ниже.
  | {state: 'unavailable'; reason: string};

/**
 * Витрина глазами владельца: опубликованное с наложенным черновиком.
 *
 * ОТДЕЛЬНАЯ ДОРОГА, И ЭТО ТРЕБОВАНИЕ ЭТАПА, А НЕ УДОБСТВО:
 *   • своя ручка (`/api/admin/storefront/preview`, у неё нет @Cacheable);
 *   • `cache: 'no-store'` и никакого тега — черновик не имеет права попасть
 *     ни в общий Data Cache Next, ни под `revalidateTag('storefront')`;
 *   • `lastKnownGood` не читается и не пишется.
 *
 * Последнее — главное. Черновик это НАМЕРЕНИЕ. Увидев вместо него снимок,
 * владелец решит одно из двух: «правка потерялась» — и сделает её заново, или,
 * хуже, «правка применилась» — и нажмёт «Опубликовать» вслепую. Поэтому при
 * недоступном API предпросмотр обязан честно сказать, что данных нет, а не
 * подсунуть последнее удачное.
 *
 * Cookie передаётся явным параметром: модуль не знает про `next/headers` и
 * остаётся проверяемым без окружения запроса.
 */
export async function getStorefrontPreview(cookie: string): Promise<StorefrontPreview> {
  if (process.env.CATALOGUE_SOURCE === 'fixture') {
    if (process.env.NODE_ENV === 'production') throw new Error('CATALOGUE_SOURCE=fixture is not allowed in production');
    const {STOREFRONT_DRAFT_FIXTURE} = await import('./fixture');
    return {state: 'draft', storefront: STOREFRONT_DRAFT_FIXTURE};
  }
  try {
    const res = await fetch(`${API_BASE}/api/admin/storefront/preview`, {
      cache: 'no-store',
      headers: {cookie},
    });
    if (res.status === 401 || res.status === 403) return {state: 'forbidden'};
    if (!res.ok) return {state: 'unavailable', reason: `storefront preview failed: ${res.status}`};
    return {state: 'draft', storefront: (await res.json()) as Storefront};
  } catch (error) {
    return {state: 'unavailable', reason: error instanceof Error ? error.message : 'storefront preview failed'};
  }
}
