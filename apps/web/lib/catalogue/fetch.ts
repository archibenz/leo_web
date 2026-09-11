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
export async function getStorefront(): Promise<Storefront> {
  if (process.env.CATALOGUE_SOURCE === 'fixture') {
    if (process.env.NODE_ENV === 'production') throw new Error('CATALOGUE_SOURCE=fixture is not allowed in production');
    const {STOREFRONT_FIXTURE} = await import('./fixture');
    return STOREFRONT_FIXTURE;
  }
  const res = await fetch(`${API_BASE}/api/catalog/storefront`, {next: {revalidate: 600, tags: ['storefront']}});
  if (!res.ok) throw new Error(`storefront fetch failed: ${res.status}`);
  return (await res.json()) as Storefront;
}
