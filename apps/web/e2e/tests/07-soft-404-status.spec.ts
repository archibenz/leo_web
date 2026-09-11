import {test, expect, type APIRequestContext} from '@playwright/test';

// Код ответа, а не тело. Тело у несуществующего адреса было правильным всё
// время, пока сайт отдавал его со статусом 200: next-intl переписывает каждый
// запрос страницы, а переписанный ответ берёт статус у переписывателя, поэтому
// notFound() внутри страницы до клиента не доходит. Поисковик читает статус —
// и заводит в индекс каждую опечатку.
//
// Юнит на middleware (lib/__tests__/middleware.test.ts) видит решение функции,
// но не этот механизм: он живёт в собранном приложении. Поэтому проверка здесь
// и снаружи — обычным HTTP-запросом, без разбора разметки.
//
// Прогон против собранного приложения:
//   npm run build && npm run start -- -p 3100
//   E2E_SKIP_WEB_SERVER=1 E2E_BASE_URL=http://127.0.0.1:3100 \
//     npx playwright test e2e/tests/07-soft-404-status.spec.ts

const UNKNOWN_SLUG = 'takogo-tovara-net-i-ne-bylo';
const UNKNOWN_SECTION = 'takogo-razdela-net';

// Слаг спрашиваем у самой витрины: на что она ссылается, то и обязано жить.
// Список в lib/catalogue/slugs.generated.ts взять было бы проще, но тогда спек
// сверял бы список сам с собой — а проверять надо связку «каталог → edge».
async function firstGarmentPath(request: APIRequestContext): Promise<string> {
  const res = await request.get('/ru/shop');
  expect(res.status(), '/ru/shop must answer before anything here means something').toBe(200);
  const html = await res.text();
  const match = html.match(/href="(\/ru\/product\/[a-z0-9-]+)"/);
  if (!match) throw new Error('the shop page links to no garment — nothing to check a live address against');
  return match[1]!;
}

test.describe('404 status survives the next-intl rewrite', () => {
  test('a product slug the catalogue does not carry answers 404', async ({request}) => {
    const res = await request.get(`/ru/product/${UNKNOWN_SLUG}`);
    expect(res.status()).toBe(404);
  });

  test('a garment the shop links to answers 200', async ({request}) => {
    const path = await firstGarmentPath(request);
    const res = await request.get(path);
    expect(res.status(), `${path} is a live garment`).toBe(200);
  });

  test('an unknown section answers 404 while the storefront answers 200', async ({request}) => {
    expect((await request.get(`/ru/${UNKNOWN_SECTION}`)).status()).toBe(404);
    expect((await request.get('/ru')).status()).toBe(200);
  });

  test('the 404 keeps the security headers', async ({request}) => {
    // Статус ставится на переписыватель отдельным ответом, и заголовки в него
    // переносятся руками (middleware.ts). Пропусти цикл копирования — и
    // страница 404 поедет без CSP.
    const headers = (await request.get(`/ru/product/${UNKNOWN_SLUG}`)).headers();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
