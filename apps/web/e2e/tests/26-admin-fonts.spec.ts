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

async function openAdminProducts(page: Page): Promise<void> {
  await page.setViewportSize({width: 1440, height: 900});
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
  const product = {id: 'font-product', title: 'Контрольный товар', price: 1240, category: null,
    stockQuantity: 1, isTest: false, active: true, collectionName: null, images: []};
  await page.route('**/api/admin/**', route => route.fulfill({
    json: new URL(route.request().url()).pathname === '/api/admin/products' ? [product] : [],
  }));
  await page.goto('/ru/admin/products');
  await expect(page.locator('main h1:visible')).toBeVisible();
}

test('в админке заголовок и цифры — Jost, цифры моноширинные, марка — картинкой', async ({page}) => {
  await openAdminProducts(page);

  expect(await family(page, 'main h1:visible')).toMatch(/^['"]?Jost/);
  const figure = page.locator('td.tabular-nums:visible').filter({hasText: /1\s?240/}).first();
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
