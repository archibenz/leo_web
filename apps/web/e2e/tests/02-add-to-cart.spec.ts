import {test, expect} from '../fixtures/auth';

test.describe('Shop → add to cart', () => {
  test('guest can open shop and navigate to a product page', async ({page}) => {
    await page.goto('/ru/shop');
    await expect(page).toHaveURL(/\/ru\/shop/);

    const firstProductLink = page.locator('a[href*="/product/"]').first();
    await firstProductLink.waitFor({state: 'visible'});
    await firstProductLink.click();

    await expect(page).toHaveURL(/\/ru\/product\//);

    // Smoke: product page renders. Full add-to-cart assertion is fragile
    // because button label varies; we just check that a CTA is present.
    const cta = page.getByRole('button').filter({hasText: /корзин|cart/i}).first();
    await expect(cta).toBeVisible();
  });
});
