import {test, expect, type Page} from '@playwright/test';
import {copy} from '../fixtures/messages';

// Ошибка у покупателя доходит до API сайта пачкой (lib/clientErrors.ts →
// POST /api/client-errors → аналитика). Бэкенда в прогоне нет: ручку
// перехватываем и смотрим, ЧТО браузер в неё отдал.
//
// Кто отправил, видно по полю browser: сборщик пишет семейство («Chrome
// 128»), инлайн из <head> (lib/earlyErrors.ts), отправляющий сам, когда
// гидрации нет, — null.

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

// Плашка cookie рисуется только эффектом — её появление значит, что
// гидрация прошла и сборщик стоит.
const cookieNotice = (page: Page) => page.getByRole('region', {name: copy('footer', 'cookieText')});

test('ошибка сразу после load уходит пачкой: путь без query, повторы склеены, браузер — семейство', async ({page}) => {
  const sent = await captureReports(page);
  // Токен в адресе — ровно то, что не должно уехать в аналитику.
  await page.goto('/ru?token=secret-login-token');
  await page.waitForLoadState('load');

  // Сразу после load, не дожидаясь гидрации: сборщик в dev ставится на 1–2 мс
  // позже load, и до инлайна из <head> такие ошибки терялись (CI: 3 из 3
  // попыток на main после #105).
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) setTimeout(() => { throw new Error('client-boom'); }, 0);
  });
  await expect(cookieNotice(page)).toBeVisible();
  await hideTab(page);

  await expect.poll(() => sent.length).toBeGreaterThan(0);
  const events = sent.flatMap((s) => s.events);
  const boom = events.filter((e) => e.message === 'client-boom');
  expect(boom).toHaveLength(1);
  expect(boom[0]).toMatchObject({kind: 'window_error', errorClass: 'Error', route: '/ru', count: 3});
  expect(String(boom[0]!.browser)).toMatch(/^Chrome \d+$/);
  expect(JSON.stringify(sent)).not.toContain('secret-login-token');
});

test('ошибка до гидрации не теряется: её забирает сборщик и шлёт вместе со своими', async ({page}) => {
  const sent = await captureReports(page);
  // Гидрацию придерживаем, чтобы «до» было не везением, а условием.
  await page.route('**/_next/static/chunks/main-app*', async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as {__probe: boolean}).__probe = Array.isArray(window.__earlyErrors);
      void Promise.reject(new Error('early-reject'));
      throw new Error('early-boom');
    });
  });

  await page.goto('/ru');
  await expect(cookieNotice(page)).toBeVisible();
  // В момент ошибок буфер был ещё не забран — значит, сборщика ещё не было.
  expect(await page.evaluate(() => (window as unknown as {__probe: boolean}).__probe)).toBe(true);
  await hideTab(page);

  await expect.poll(() => sent.length).toBeGreaterThan(0);
  await page.waitForTimeout(300);
  expect(sent).toHaveLength(1);
  const events = sent[0]!.events;
  expect(events).toEqual(expect.arrayContaining([
    expect.objectContaining({kind: 'window_error', message: 'early-boom', count: 1}),
    expect.objectContaining({kind: 'unhandled_rejection', message: 'early-reject', count: 1}),
  ]));
  for (const e of events) expect(String(e.browser)).toMatch(/^Chrome \d+$/);
});

test('упал чанк — гидрации нет, а поломка всё равно уходит на скрытии вкладки, одна', async ({page}) => {
  const sent = await captureReports(page);
  await page.route('**/_next/static/chunks/main-app*', (route) => route.fulfill({status: 404, body: ''}));

  await page.goto('/ru');
  await page.waitForLoadState('load');
  await page.waitForTimeout(1500);
  // Белая страница покупателя: сборщик не появился и не появится.
  await expect(cookieNotice(page)).toHaveCount(0);

  await hideTab(page);
  await expect.poll(() => sent.length).toBeGreaterThan(0);
  await hideTab(page);
  await page.waitForTimeout(300);

  expect(sent).toHaveLength(1);
  expect(sent[0]!.events).toEqual([
    expect.objectContaining({
      kind: 'window_error',
      errorClass: 'ChunkLoadError',
      message: 'Loading script failed: /_next/static/chunks/main-app.js',
      route: '/ru',
      browser: null,
      count: 1,
    }),
  ]);
});

test('ошибок нет — отправки нет', async ({page}) => {
  const sent = await captureReports(page);
  // Без ожидания гидрации кейс зелёный и на пустой странице: слушателя
  // скрытия ещё нет, отправлять некому.
  await page.goto('/ru');
  await expect(cookieNotice(page)).toBeVisible();
  await hideTab(page);
  await page.waitForTimeout(300);
  expect(sent).toEqual([]);
});
