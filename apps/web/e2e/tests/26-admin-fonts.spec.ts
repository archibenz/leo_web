import {test, expect, type Page} from '@playwright/test';
import {gotoRealPage} from '../fixtures/white';

// Админка — целиком на Jost (владелец 28.09: «шрифты поменяй»). Засечки
// Cormorant стояли в заголовках экранов, марке «REINASLEO» и крупных цифрах
// карточек. Правило в globals.css (html:has([data-admin-shell]) body)
// переназначает --font-display и --font-accent только при метке админки.
//
// Витрина White и так на Jost (.wv-root .font-display), поэтому «не задело ли
// витрину» по шрифту заголовка не видно — проверяется сама переменная: на
// витрине --font-display по-прежнему указывает на Cormorant.

const family = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily);
const bodyVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.body).getPropertyValue(n), name);

async function openAdminDashboard(page: Page, dailyViews: number[] = []): Promise<void> {
  await page.setViewportSize({width: 1440, height: 900});
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
  const dashboard = {
    totalProducts: 4, totalCollections: 2, lowStockCount: 0, outOfStockCount: 0, totalAlerts: 0,
    totalUsers: 1240, totalOrders: 0, totalRevenue: 0, newUsers7d: 36, newOrders7d: 0, revenue7d: 0,
    totalBotVisits: 0, botVisits7d: 0, uniqueBotUsers7d: 0,
  };
  await page.route('**/api/admin/**', (route) => {
    const url = route.request().url();
    const daily = dailyViews.map((v, i) => ({
      date: `2026-09-${String(10 + i).padStart(2, '0')}`, pageViews: v, sessions: 1, productViews: 1,
      marketplaceClicks: 0, addToCart: 0, addToFavourite: 0, signups: 0,
      byDevice: {desktop: v}, byLocale: {ru: v}, byMarketplace: {},
    }));
    const body = url.includes('/api/admin/dashboard') ? JSON.stringify(dashboard)
      : url.includes('/stats/site-daily') ? JSON.stringify(daily) : '[]';
    return route.fulfill({status: 200, contentType: 'application/json', body});
  });
  await page.goto('/ru/admin');
  await expect(page.locator('main h1:visible')).toBeVisible();
}

test('в админке заголовок и цифры — Jost, цифры моноширинные, марка — картинкой', async ({page}) => {
  await openAdminDashboard(page);

  expect(await family(page, 'main h1:visible')).toMatch(/^['"]?Jost/);
  const figure = page.locator('main p.font-display:visible', {hasText: '1240'});
  await expect(figure).toBeVisible();
  expect(await figure.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^['"]?Jost/);
  expect(await figure.evaluate((el) => getComputedStyle(el).fontVariantNumeric)).toBe('tabular-nums');
  expect(await bodyVar(page, '--font-accent')).toMatch(/Jost/);

  // Марка — рисунок витрины, а не слово шрифтом: текста «REINASLEO» в панели нет.
  await expect(page.getByRole('img', {name: 'REINASLEO'}).first()).toBeVisible();
  await expect(page.locator('[data-sidebar]').getByText('REINASLEO', {exact: true})).toHaveCount(0);
});

test('витрину правило админки не задевает: её --font-display прежний, заголовок на Jost', async ({page}) => {
  await gotoRealPage(page, '/ru/shop');
  expect(await bodyVar(page, '--font-display')).toMatch(/Cormorant/);
  expect(await family(page, 'h1')).toMatch(/^['"]?Jost/);
});

// Ось графика посещений: ширина была 28 px на любые числа, и «240» резалась
// слева на первой цифре (28.09). Подпись целиком внутри графика — и на
// трёхзначных, и на пятизначных значениях.
for (const [label, views] of [['трёхзначные', [120, 180, 240]], ['пятизначные', [9000, 15000, 24000]]] as const) {
  test(`подписи оси графика не обрезаны (${label})`, async ({page}) => {
    await openAdminDashboard(page, [...views]);
    const chart = page.locator('main .recharts-wrapper:visible').first();
    await expect(chart.locator('.recharts-yAxis .recharts-cartesian-axis-tick-value').first()).toBeVisible();
    const clipped = await chart.evaluate((wrapper) => {
      const left = wrapper.getBoundingClientRect().left;
      return [...wrapper.querySelectorAll('.recharts-yAxis .recharts-cartesian-axis-tick-value')]
        .map((t) => ({text: t.textContent, over: left - t.getBoundingClientRect().left}))
        .filter((t) => t.over > 0.5);
    });
    expect(clipped).toEqual([]);
  });
}
