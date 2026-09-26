import {test, expect, type Page} from '@playwright/test';

// Админка только для ПК (владелец 26.09, общее с дашбордом аналитики:
// lib/nav/desktop-only.json). Уже 1024 px — заглушка «Панель работает на
// компьютере» с выходами на сайт и в бота; от 1024 — панель. Переключает
// один CSS (lg:), поэтому граница проверяется по обе стороны: 1023 и 1024.
// Витрину для покупателей это не касается никак.

async function asOwner(page: Page): Promise<void> {
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
  await page.route('**/api/admin/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: route.request().url().includes('/api/admin/dashboard') ? JSON.stringify(dashboard) : '[]',
    }),
  );
}

const STUB_TITLE = 'Панель работает на компьютере';
const sidebar = (page: Page) => page.locator('[data-admin-shell] [data-sidebar="sidebar"]').first();

for (const width of [390, 1023]) {
  test(`${width}px: вместо панели — заглушка с выходами на сайт и в бота`, async ({page}) => {
    await page.setViewportSize({width, height: 844});
    await asOwner(page);
    await page.goto('/ru/admin');

    await expect(page.getByRole('heading', {level: 1, name: STUB_TITLE})).toBeVisible();
    await expect(page.getByRole('link', {name: 'На сайт'})).toHaveAttribute('href', '/ru');
    const bot = page.getByRole('link', {name: 'Открыть бота'});
    await expect(bot).toHaveAttribute('href', 'https://t.me/leo_analytics_bot');
    await expect(bot).toHaveAttribute('target', '_blank');
    // Панель не видна и не перехватывает нажатия.
    await expect(sidebar(page)).toBeHidden();
    await expect(page.getByRole('button', {name: 'Мой аккаунт'})).toBeHidden();

    // Кнопки — под палец: не ниже 44 px.
    for (const name of ['На сайт', 'Открыть бота']) {
      const box = await page.getByRole('link', {name}).boundingBox();
      expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(44);
    }
  });
}

for (const width of [1024, 1280]) {
  test(`${width}px: панель, заглушки нет`, async ({page}) => {
    await page.setViewportSize({width, height: 900});
    await asOwner(page);
    await page.goto('/ru/admin');

    await expect(page.getByRole('button', {name: 'Мой аккаунт'})).toBeVisible();
    await expect(page.getByRole('heading', {level: 1, name: STUB_TITLE})).toBeHidden();
  });
}

test('витрина на телефоне заглушки не показывает', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/ru');
  await expect(page.locator('.wv-root').first()).toBeAttached();
  await expect(page.getByText(STUB_TITLE)).toHaveCount(0);
});
