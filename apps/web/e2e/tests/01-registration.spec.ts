import {test, expect, uniqueEmail} from '../fixtures/auth';

test.describe('Registration flow', () => {
  test('user can reach register page and fills email field', async ({page}) => {
    await page.goto('/ru/auth/register');
    await expect(page).toHaveURL(/\/ru\/auth\/register/);

    const emailInput = page.getByLabel(/e-?mail|почт/i).first();
    await emailInput.waitFor({state: 'visible'});
    await emailInput.fill(uniqueEmail());

    // Smoke: page rendered form with email input. Full verification-code
    // round-trip requires backend + Resend mock; out of scope for scaffold.
    await expect(emailInput).toHaveValue(/@example\.test$/);
  });
});
