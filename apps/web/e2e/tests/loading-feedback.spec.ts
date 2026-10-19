import {test, expect, type Page} from '@playwright/test';
import {COLD_COMPILE, hydrateViaCookieNotice} from '../fixtures/white';

test.use({video: 'off', trace: 'off'});
test.setTimeout(60_000);

const LINE = '[data-page-loading][data-state="loading"]';
const OWNER = {id: 'loading-owner', role: 'admin', name: 'Владелец', email: 'owner@example.test'};
const PRODUCT = {id: 'loading-product', title: 'Контрольный товар', price: 1200, category: null,
  stockQuantity: 1, isTest: false, active: true, collectionName: null, images: []};

function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => {release = resolve;});
  return {promise, release};
}

async function mockApi(page: Page) {
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({status: 200, json: OWNER});
    if (url.pathname === '/api/admin/dashboard') return route.fulfill({json: {
      totalProducts: 1, totalCollections: 1, lowStockCount: 0, outOfStockCount: 0, totalAlerts: 0,
      totalUsers: 1, totalOrders: 0, totalRevenue: 0, newUsers7d: 0, newOrders7d: 0, revenue7d: 0,
      totalBotVisits: 0, botVisits7d: 0, uniqueBotUsers7d: 0,
    }});
    return route.fulfill({status: 200, json: []});
  });
  await page.addInitScript(() => localStorage.setItem('reinasleo_token', 'fixture-owner-token'));
  await page.context().addCookies([{name: 'rl_session', value: 'fixture-owner-session', domain: new URL(process.env.E2E_BASE_URL || 'http://localhost:3000').hostname, path: '/'}]);
}

async function open(page: Page, path: string) {
  await page.goto(path, {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  await expect(page.locator('.wv-root, [data-admin-shell]').first()).toBeVisible();
  await hydrateViaCookieNotice(page);
}

async function lineStyle(page: Page) {
  return page.locator(`${LINE} .page-loading__line`).evaluate(el => {
    const style = getComputedStyle(el);
    const parent = el.parentElement!;
    const rect = parent.getBoundingClientRect();
    return {height: rect.height, top: rect.top, position: getComputedStyle(parent).position,
      color: style.backgroundColor, shadow: style.boxShadow, animation: style.animationName,
      progress: new DOMMatrix(style.transform).a};
  });
}

async function holdRsc(page: Page, path: string) {
  const pending = gate();
  const requested = gate();
  await page.route(url => url.pathname === path && url.searchParams.has('_rsc'), async route => {
    requested.release();
    await pending.promise;
    await route.continue();
  });
  return {pending, requested};
}

test('client navigation stays active after URL commit until admin data is rendered', async ({page}, info) => {
  await mockApi(page);
  await open(page, '/ru/account');
  await expect(page.locator('a[href="/ru/admin"]')).toBeVisible();
  const data = gate();
  const requested = gate();
  await page.route('**/api/admin/products', async route => {
    requested.release(); await data.promise; await route.fulfill({json: [PRODUCT]});
  });
  // Use the actual account link, then the real sidebar link, preserving the provider.
  await page.locator('a[href="/ru/admin"]').click();
  await page.locator('a[href="/ru/admin/products"]').first().click();
  await requested.promise;
  await expect(page).toHaveURL(/\/ru\/admin\/products$/);
  await expect(page.locator('[data-page-skeleton="admin-table"]')).toBeVisible();
  await expect(page.locator(LINE)).toBeVisible();
  expect(await lineStyle(page)).toMatchObject({height: 2, top: 0, position: 'fixed', color: 'rgb(0, 0, 0)', shadow: 'none'});
  expect((await lineStyle(page)).progress).toBeLessThan(1);
  await expect.poll(async () => (await lineStyle(page)).progress).toBeGreaterThan(0.35);
  await page.screenshot({path: info.outputPath('admin-products-pending.png')});
  await page.evaluate(() => {
    const frames: number[] = [];
    Object.assign(window, {loadingProgressFrames: frames});
    const sample = () => {
      const line = document.querySelector('.page-loading__line');
      if (!line) return;
      frames.push(new DOMMatrix(getComputedStyle(line).transform).a);
      requestAnimationFrame(sample);
    };
    sample();
  });
  data.release();
  await expect(page.getByText(PRODUCT.title)).toBeVisible();
  await expect(page.locator('[data-page-skeleton="admin-table"]')).toHaveCount(0);
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
  const progress = await page.evaluate(() => (window as unknown as {loadingProgressFrames: number[]}).loadingProgressFrames);
  expect(progress.length).toBeGreaterThan(1);
  for (let i = 1; i < progress.length; i++) expect(progress[i], 'completion cannot jump backwards').toBeGreaterThanOrEqual(progress[i - 1]! - 0.01);
});

test('auth keeps account skeleton and line until authentication settles on mobile', async ({page}, info) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({colorScheme: 'dark'});
  await mockApi(page);
  const auth = gate();
  await page.route('**/api/auth/me', async route => {await auth.promise; await route.fulfill({json: OWNER});});
  await page.goto('/ru/account', {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  await expect(page.locator('[data-page-skeleton="account"]')).toBeVisible();
  await expect(page.locator(LINE)).toBeVisible();
  expect(await lineStyle(page)).toMatchObject({height: 2, color: 'rgb(0, 0, 0)'});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: info.outputPath('account-mobile-pending.png')});
  auth.release();
  await expect(page.locator('[data-page-skeleton="account"]')).toHaveCount(0);
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
  await expect(page.locator('a[href="/ru/admin"]')).toBeVisible();
});

test('dark admin has white static reduced-motion line and completes on failed data', async ({page}, info) => {
  await page.emulateMedia({colorScheme: 'dark', reducedMotion: 'reduce'});
  await mockApi(page);
  const data = gate();
  await page.route('**/api/admin/products', async route => {await data.promise; await route.fulfill({status: 500, json: {}});});
  await page.goto('/ru/admin/products', {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  await expect(page.locator('[data-page-skeleton="admin-table"]')).toBeVisible();
  await expect(page.locator(LINE)).toBeVisible();
  expect(await lineStyle(page)).toMatchObject({height: 2, top: 0, color: 'rgb(255, 255, 255)', animation: 'none', progress: 0.35});
  await page.screenshot({path: info.outputPath('admin-dark-pending.png')});
  data.release();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
});

test('query-only navigation waits for new server response, then local filters and browser back settle', async ({page}) => {
  await mockApi(page);
  await open(page, '/ru/shop');
  await expect(page.locator('#wv-main select')).toBeVisible();
  const pending = gate();
  const requested = gate();
  await page.route(url => url.pathname === '/ru/shop' && url.searchParams.get('cat') === 'dresses' && url.searchParams.has('_rsc'), async route => {
    requested.release(); await pending.promise; await route.continue();
  });
  await page.locator('footer a[href="/ru/shop?cat=dresses"]').click();
  await requested.promise;
  await expect(page.locator(LINE)).toBeVisible();
  pending.release();
  await expect(page).toHaveURL(/cat=dresses/);
  await expect(page.locator('#wv-main button[aria-pressed="true"]')).toContainText('Платья');
  await expect(page.getByText('Ничего не подошло по выбранным фильтрам.')).toBeVisible();
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
  await page.locator('#wv-main select').selectOption('asc');
  await expect(page).toHaveURL(/sort=asc/);
  await expect(page.locator('#wv-main select')).toHaveValue('asc');
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/ru\/shop$/);
  await expect(page.locator('#wv-main button[aria-pressed="true"]')).toContainText('Все');
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
});

test('late response from an abandoned navigation cannot complete the newer navigation', async ({page}) => {
  await mockApi(page);
  await open(page, '/ru/shop');
  const first = await holdRsc(page, '/ru/delivery');
  const last = await holdRsc(page, '/ru/faq');
  await page.locator('footer a[href="/ru/delivery"]').click();
  await first.requested.promise;
  await expect(page.locator(LINE)).toBeVisible();
  await page.locator('footer a[href="/ru/faq"]').click();
  await last.requested.promise;
  const oldResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/ru/delivery');
  first.pending.release();
  await oldResponse;
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator(LINE)).toBeVisible();
  expect((await lineStyle(page)).progress).toBeLessThan(1);
  last.pending.release();
  await expect(page).toHaveURL(/\/ru\/faq$/);
  await expect(page.locator('#wv-main h1')).toBeVisible();
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
});

test('local filters update the visible result and never leave progress behind', async ({page}) => {
  await mockApi(page);
  await open(page, '/ru/shop');
  await page.locator('#wv-main button').filter({hasText: /^Верхняя одежда$/}).click();
  await expect(page.locator('#wv-main button[aria-pressed="true"]')).toContainText('Верхняя одежда');
  await expect(page).toHaveURL(/cat=outerwear/);
  await expect(page.locator('#wv-main a[href*="/product/"]').first()).toBeVisible();
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
  await page.locator('#wv-main select').selectOption('asc');
  await expect(page.locator('#wv-main select')).toHaveValue('asc');
  await expect(page).toHaveURL(/sort=asc/);
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
});

test('same-URL refresh finishes only after its server response is committed', async ({page}) => {
  await mockApi(page);
  await open(page, '/ru?edit=1');
  const panel = page.getByRole('complementary', {name: 'Редактор сайта'});
  await panel.getByRole('button', {name: 'Герой', exact: true}).click();
  await panel.getByRole('textbox', {name: 'Заголовок · ru', exact: true}).fill('Проверка сохранения');
  const refresh = await holdRsc(page, '/ru');
  const save = page.waitForRequest(request => request.method() === 'PUT' && request.url().includes('/api/admin/storefront/sections/'));
  await panel.getByRole('button', {name: 'Сохранить в черновик', exact: true}).click();
  expect((await save).postDataJSON()).toEqual({headlineRu: 'Проверка сохранения'});
  await refresh.requested.promise;
  await expect(page.locator(LINE)).toBeVisible();
  const response = page.waitForResponse(result => new URL(result.url()).pathname === '/ru' && result.url().includes('_rsc='));
  refresh.pending.release();
  await response;
  await expect(panel.getByText('Нет несохранённых изменений', {exact: true})).toBeVisible();
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
});
