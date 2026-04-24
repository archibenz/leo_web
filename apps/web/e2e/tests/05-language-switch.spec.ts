import {test, expect} from '../fixtures/auth';

test.describe('Language switch', () => {
  test('/ru redirects exist and /en renders English content', async ({page}) => {
    await page.goto('/ru');
    await expect(page).toHaveURL(/\/ru/);

    await page.goto('/en');
    await expect(page).toHaveURL(/\/en/);

    // On /en, <html lang> should reflect English
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });

  test('root / redirects to a locale', async ({page}) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/(ru|en)/);
  });
});
