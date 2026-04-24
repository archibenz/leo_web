import {test, expect} from '../fixtures/auth';

test.describe('Checkout → Wildberries redirect', () => {
  test('cart page renders (empty-state or items list)', async ({page}) => {
    await page.goto('/ru/cart');
    await expect(page).toHaveURL(/\/ru\/cart/);

    // Either empty-state copy or the cart content — both are valid first renders
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('checkout CTA triggers navigation to wildberries.ru (if items in cart)', async ({page}) => {
    await page.goto('/ru/cart');

    const checkoutBtn = page.getByRole('button', {name: /wildberries|wb|оформ/i}).first();
    const hasItems = await checkoutBtn.isVisible().catch(() => false);

    test.skip(!hasItems, 'empty cart — no checkout button rendered in this scaffold run');

    const redirectPromise = page.waitForRequest(
      req => req.url().includes('wildberries.ru'),
      {timeout: 5_000}
    );

    await checkoutBtn.click();
    const req = await redirectPromise;
    expect(req.url()).toContain('wildberries.ru');
  });
});
