import {test, expect} from '@playwright/test';
import {openWhite, hydrateViaCookieNotice} from '../fixtures/white';

test.beforeEach(async ({page}) => {
  await page.route('**/api/auth/me', route => route.fulfill({status: 401, json: {}}));
});

test('desktop catalogue search is visible before any interaction and shows focus', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await openWhite(page, '/ru/shop');
  const search = page.locator('#wv-shop-search');
  await expect(search).toBeVisible();
  await expect(page.locator('.wv-shop-search > div')).toHaveCSS('opacity', '1');
  await search.focus();
  await expect(search).toBeFocused();
  await expect(search).toHaveCSS('border-bottom-color', 'rgb(28, 23, 20)');
  const sort = page.getByRole('combobox', {name: 'Сортировка'});
  await sort.focus();
  await expect(sort).toHaveCSS('border-bottom-color', 'rgb(28, 23, 20)');
});

test('mobile search opens with focus, closes without a delayed focus jump, and survives desktop resize', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openWhite(page, '/ru/shop');
  await hydrateViaCookieNotice(page);
  const search = page.locator('#wv-shop-search');
  const toggle = page.locator('button[aria-controls="wv-shop-search-region"]');
  await expect(search).toBeHidden();
  await toggle.focus();
  await page.keyboard.press('Tab');
  await expect(search).not.toBeFocused();
  await toggle.click();
  await expect(search).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill('платье');
  await toggle.click();
  await expect(search).toBeHidden();
  await expect(search).toHaveValue('');
  await expect(toggle).toBeFocused();
  // A closed mobile state must not hide the desktop search when rotating/resizing.
  await page.setViewportSize({width: 1024, height: 900});
  await expect(search).toBeVisible();
  await expect(page.locator('.wv-shop-search > div')).toHaveCSS('opacity', '1');
});

test('account tabs offer a single tab stop and Arrow/Home/End navigation', async ({page}) => {
  await openWhite(page, '/en/account');
  const signIn = page.getByRole('tab', {name: 'Sign in', exact: true});
  const signUp = page.getByRole('tab', {name: 'Sign up', exact: true});
  await signIn.focus();
  await page.keyboard.press('ArrowRight');
  await expect(signUp).toBeFocused();
  await expect(page.getByRole('tabpanel', {name: 'Sign up', exact: true})).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email', {exact: true})).toBeFocused();
  await signUp.focus();
  await page.keyboard.press('Home');
  await expect(signIn).toBeFocused();
  await page.keyboard.press('End');
  await expect(signUp).toBeFocused();
});
