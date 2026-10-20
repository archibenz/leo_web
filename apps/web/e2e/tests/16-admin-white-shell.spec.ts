import {test, expect, type Page} from '@playwright/test';

async function openProducts(page: Page) {
  await page.setViewportSize({width: 1440, height: 900});
  await page.route('**/api/auth/me', route => route.fulfill({json: {id: 'owner', role: 'admin'}}));
  await page.route('**/api/admin/**', route => route.fulfill({json: []}));
  await page.addInitScript(() => localStorage.setItem('reinasleo_token', 'owner-token'));
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
  await page.goto('/ru/admin/products', {waitUntil: 'domcontentloaded'});
  await expect(page.getByRole('heading', {level: 1, name: 'Товары'})).toBeVisible();
}

test('на десктопе разделы сайта остаются в постоянной колонке', async ({page}) => {
  await openProducts(page);
  await expect(page.locator('a[href="/ru/admin/products"]')).toBeVisible();
  await expect(page.locator('a[href="/ru/admin/inventory"]')).toBeVisible();
  await expect(page.getByRole('link', {name: 'Свод', exact: true})).toHaveAttribute('href', '/analytics');
  await expect(page.getByRole('link', {name: 'Админка сайта', exact: true})).toHaveCount(0);
});

test('оболочка управления сайтом не использует золото прежней градиентной темы', async ({page}) => {
  await openProducts(page);
  const paintedGold = await page.evaluate(() => Array.from(document.querySelectorAll('body *')).some(element => {
    const style = getComputedStyle(element);
    return [style.color, style.backgroundColor, style.borderColor].includes('rgb(212, 165, 116)');
  }));
  expect(paintedGold).toBe(false);
});

test('раздел управления сайтом остаётся на белой подложке', async ({page}) => {
  await openProducts(page);
  const background = await page.getByRole('heading', {level: 1, name: 'Товары'}).evaluate(element => {
    let node: Element | null = element;
    while (node) {
      const color = getComputedStyle(node).backgroundColor;
      if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
      node = node.parentElement;
    }
    return null;
  });
  expect(background).toBe('rgb(255, 255, 255)');
});
