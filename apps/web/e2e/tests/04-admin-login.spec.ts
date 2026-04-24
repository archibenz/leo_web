import {test, expect} from '../fixtures/auth';

test.describe('Admin login', () => {
  test('admin can log in and reach dashboard', async ({page, adminCreds}) => {
    test.skip(
      !adminCreds,
      'set E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in .env.local to run this test'
    );

    await page.goto('/ru/auth/login');
    await page.getByLabel(/e-?mail|почт/i).first().fill(adminCreds!.email);
    await page.getByLabel(/пароль|password/i).first().fill(adminCreds!.password);
    await page.getByRole('button', {name: /войти|sign in|log ?in/i}).first().click();

    await page.waitForURL(url => !url.pathname.endsWith('/auth/login'), {
      timeout: 10_000,
    });

    await page.goto('/ru/admin');
    await expect(page).toHaveURL(/\/ru\/admin/);

    // Dashboard should show a known h2 from AdminDashboardPage
    await expect(page.getByText(/бизнес-метрики/i)).toBeVisible({timeout: 8_000});
  });
});
