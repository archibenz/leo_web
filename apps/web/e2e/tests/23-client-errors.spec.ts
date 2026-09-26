import {test, expect, type Page} from '@playwright/test';
import {copy} from '../fixtures/messages';

// Ошибка у покупателя доходит до API сайта пачкой (lib/clientErrors.ts →
// POST /api/client-errors → аналитика). Бэкенда в прогоне нет: ручку
// перехватываем и смотрим, ЧТО браузер в неё отдал.

type Sent = {events: Array<Record<string, unknown>>};

async function captureReports(page: Page): Promise<Sent[]> {
  const sent: Sent[] = [];
  await page.route('**/api/client-errors', async (route) => {
    sent.push(route.request().postDataJSON() as Sent);
    await route.fulfill({status: 202, body: ''});
  });
  return sent;
}

// Скрытие вкладки — момент отправки (как у lib/siteEvents.ts).
async function hideTab(page: Page): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

// Сборщик ставится эффектом гидрации, а он в dev приходит на 1–2 мс ПОЗЖЕ
// события load: брошенное сразу после load под нагрузкой улетало мимо
// слушателя (CI: 3 из 3 попыток на main после #105; локально 12 из 25 при
// четырёх воркерах). Плашка cookie рисуется только эффектом — её появление
// значит, что эффекты гидрации прошли (как в 14-site-events).
async function openHydrated(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('region', {name: copy('footer', 'cookieText')})).toBeVisible();
}

test('ошибка на странице уходит пачкой: путь без query, повторы склеены, браузер — семейство', async ({page}) => {
  const sent = await captureReports(page);
  // Токен в адресе — ровно то, что не должно уехать в аналитику.
  await openHydrated(page, '/ru?token=secret-login-token');

  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) setTimeout(() => { throw new Error('client-boom'); }, 0);
  });
  await page.waitForTimeout(100);
  await hideTab(page);

  await expect.poll(() => sent.length).toBeGreaterThan(0);
  const events = sent.flatMap((s) => s.events);
  const boom = events.filter((e) => e.message === 'client-boom');
  expect(boom).toHaveLength(1);
  expect(boom[0]).toMatchObject({kind: 'window_error', errorClass: 'Error', route: '/ru', count: 3});
  expect(String(boom[0]!.browser)).toMatch(/^Chrome \d+$/);
  expect(JSON.stringify(sent)).not.toContain('secret-login-token');
});

test('ошибок нет — отправки нет', async ({page}) => {
  const sent = await captureReports(page);
  // Без ожидания гидрации кейс зелёный и на пустой странице: слушателя
  // скрытия ещё нет, отправлять некому.
  await openHydrated(page, '/ru');
  await hideTab(page);
  await page.waitForTimeout(300);
  expect(sent).toEqual([]);
});
