import {test, expect, type Page} from '@playwright/test';

// Вычистка 26.09: сдвиги раскладки (CLS), найденные проходом по витрине и
// админке, и плашка cookie поверх низа страницы. Каждая проверка — на то,
// что было сломано: подвал прыгал из-под заглушки стриминга, форма входа
// рисовалась из пустоты, карточка посещений толкала дашборд.

const CLS_LIMIT = 0.05; // «хорошо» у Google — до 0,1; держим с запасом

async function watchLayoutShift(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as {__cls: number}).__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as Array<PerformanceEntry & {value: number; hadRecentInput: boolean}>) {
        if (!e.hadRecentInput) (window as unknown as {__cls: number}).__cls += e.value;
      }
    }).observe({type: 'layout-shift', buffered: true});
  });
}

const cls = (page: Page) => page.evaluate(() => (window as unknown as {__cls: number}).__cls);

for (const [path, width] of [['/ru/account', 390], ['/ru/bag', 1440], ['/ru/info', 390]] as const) {
  test(`${path} @${width}: подвал и форма не прыгают (CLS < ${CLS_LIMIT})`, async ({page}) => {
    await page.setViewportSize({width, height: width < 800 ? 844 : 900});
    await watchLayoutShift(page);
    await page.goto(path, {waitUntil: 'networkidle'});
    await expect(page.locator('footer')).toBeVisible();
    await page.waitForTimeout(800);
    expect(await cls(page)).toBeLessThan(CLS_LIMIT);
  });
}

test('дашборд админки не прыгает, когда карточка посещений догружается', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await watchLayoutShift(page);
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
  const dashboard = {
    totalProducts: 4, totalCollections: 2, lowStockCount: 0, outOfStockCount: 0, totalAlerts: 0,
    totalUsers: 3, totalOrders: 0, totalRevenue: 0, newUsers7d: 0, newOrders7d: 0, revenue7d: 0,
    totalBotVisits: 0, botVisits7d: 0, uniqueBotUsers7d: 0,
  };
  const day = (date: string, pageViews: number) => ({
    date, pageViews, sessions: 1, productViews: 1, marketplaceClicks: 0, addToCart: 0, addToFavourite: 0, signups: 0,
    byDevice: {desktop: pageViews}, byLocale: {ru: pageViews}, byMarketplace: {},
  });
  await page.route('**/api/admin/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/stats/site-daily')) {
      // Карточка посещений грузится отдельно и позже дашборда — ровно так,
      // как на проде; без задержки гонки нет и проверять нечего.
      await new Promise((r) => setTimeout(r, 600));
      return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify([day('2026-09-24', 5), day('2026-09-25', 7)])});
    }
    const body = url.includes('/api/admin/dashboard') ? JSON.stringify(dashboard)
      : url.includes('/stats/site-paths') ? JSON.stringify([{path: '/ru', views: 12}]) : '[]';
    return route.fulfill({status: 200, contentType: 'application/json', body});
  });

  await page.goto('/ru/admin');
  await expect(page.getByText('Просмотры страниц', {exact: false}).first()).toBeVisible();
  await expect(page.locator('section', {hasText: 'Популярные страницы'}).last()).toContainText('/ru');
  await page.waitForTimeout(500);
  expect(await cls(page)).toBeLessThan(CLS_LIMIT);
});

test('на телефоне плашка cookie не закрывает низ страницы', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/ru/info', {waitUntil: 'networkidle'});
  const notice = page.getByRole('region', {name: /cookie/i});
  await expect(notice).toBeVisible();

  await page.evaluate(() => window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'instant'}));
  // Последняя видимая строка подвала — реквизиты ИП.
  const last = page.locator('footer').getByText(/ИНН/);
  await expect(last).toBeVisible();
  const box = await last.boundingBox();
  const noticeBox = await notice.boundingBox();
  expect(box!.y + box!.height, 'реквизиты в самом низу подвала — над плашкой').toBeLessThanOrEqual(noticeBox!.y);
});
