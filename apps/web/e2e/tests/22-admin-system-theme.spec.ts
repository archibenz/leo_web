import {test, expect, type Page} from '@playwright/test';

// Админка по системной теме устройства (владелец 25.09: «да по системе»).
// Тёмная — только админка: витрина читает те же --sh-*, и на тёмном
// устройстве обязана остаться белой. Механизм — globals.css,
// html:has([data-admin-shell]) внутри @media (prefers-color-scheme: dark).
//
// Бэкенда в прогоне нет — ручки админки подделаны тем же приёмом, что в
// 16-admin-white-shell.spec.ts.

const DARK_BG = 'rgb(18, 18, 18)'; // 0 0% 7%
const DARK_POPOVER = 'rgb(26, 26, 26)'; // 0 0% 10%
const DARK_BORDER = 'rgb(51, 51, 51)'; // 0 0% 20%
const WHITE = 'rgb(255, 255, 255)';

async function asOwner(page: Page): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
  // Дашборду нужны настоящие поля: на пустом `{}` страница падает, Next
  // рисует глобальный экран ошибки — белый в любой теме, — и тест зеленел бы
  // на чужом экране. Поэтому числа как в 16-admin-white-shell.spec.ts, а
  // ниже отдельно проверяется, что на экране именно админка.
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

async function openAdmin(page: Page): Promise<void> {
  await asOwner(page);
  await page.goto('/ru/admin');
  // Оболочка админки с меткой темы, а не экран ошибки или входа.
  await expect(page.locator('[data-admin-shell] [data-slot="sidebar-inner"], [data-admin-shell] [data-sidebar]').first())
    .toBeAttached();
  await expect(page.getByRole('button', {name: 'Мой аккаунт'})).toBeVisible();
}

async function background(page: Page, selector: string): Promise<string> {
  return page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
}

test.describe('тёмная системная тема', () => {
  test.use({colorScheme: 'dark'});

  test('админка тёмная целиком, и всплывающее меню тоже', async ({page}) => {
    await openAdmin(page);

    expect(await background(page, 'body')).toBe(DARK_BG);
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');

    // Рамка без явного цвета (шапка панели дашборда — `border-b`) — токен
    // рамки, а не gray-200 из preflight, который на тёмном горит белым.
    await expect(page.locator('section > header').first()).toHaveCSS('border-bottom-color', DARK_BORDER);

    // Меню аккаунта — портал Radix, он рисуется в body мимо обёртки админки.
    // Если бы переменные висели на обёртке, а не на <html>, меню осталось бы белым.
    await page.getByRole('button', {name: 'Мой аккаунт'}).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveCSS('background-color', DARK_POPOVER);
  });

  test('витрина остаётся белой', async ({page}) => {
    await page.goto('/ru');
    // Именно витрина (её корень .wv-root), а не экран ошибки — он тоже белый.
    await expect(page.locator('.wv-root').first()).toBeAttached();
    await expect(page.locator('[data-admin-shell]')).toHaveCount(0);

    expect(await background(page, 'body')).toBe(WHITE);
    await expect(page.locator('html')).not.toHaveCSS('color-scheme', 'dark');
  });
});

test.describe('светлая системная тема', () => {
  test.use({colorScheme: 'light'});

  test('админка белая, как была', async ({page}) => {
    await openAdmin(page);

    expect(await background(page, 'body')).toBe(WHITE);
  });
});
