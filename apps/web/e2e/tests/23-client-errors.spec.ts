import {test, expect, type Page} from '@playwright/test';

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

test('ошибка на странице уходит пачкой: путь без query, повторы склеены, браузер — семейство', async ({page}) => {
  const sent = await captureReports(page);
  // Токен в адресе — ровно то, что не должно уехать в аналитику.
  await page.goto('/ru?token=secret-login-token');
  await page.waitForLoadState('load');

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
  await page.goto('/ru');
  await page.waitForLoadState('load');
  await hideTab(page);
  await page.waitForTimeout(300);
  expect(sent).toEqual([]);
});
