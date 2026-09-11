import {test, expect} from '../fixtures/auth';
import {messages} from '../fixtures/messages';
import {COLD_COMPILE} from '../fixtures/white';

const t = messages('account');

// The address here used to be /ru/auth/login, which has never existed on the
// White storefront: app/[locale]/auth holds tg/ and nothing else. The sign-in
// form is the first tab of /[locale]/account, and middleware.ts sends an
// anonymous /admin to exactly that page (middleware.ts:193-197) — so the
// account page is the site's own answer to "where does an admin log in".
// Against the old URL this spec died on the navigation, before it could say
// anything at all about the admin.
const ACCOUNT = '/ru/account';

test.describe('Admin login', () => {
  test('admin can log in and reach dashboard', async ({page, adminCreds}) => {
    test.skip(
      !adminCreds,
      'set E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD in .env.local to run this test'
    );

    await page.goto(ACCOUNT, {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
    // The auth surface is client-gated on useWhiteAuth: both tabs present means
    // hydration is done and the hook has settled on "signed out".
    const main = page.getByRole('main');
    await expect(main.getByRole('tab')).toHaveCount(2);

    await main.getByLabel(t('email'), {exact: true}).fill(adminCreds!.email);
    await main.getByLabel(t('password'), {exact: true}).fill(adminCreds!.password);
    await main.getByRole('button', {name: t('signInCta'), exact: true}).click();

    // Signing in does not navigate — the page swaps the form for the greeting
    // in place. The session, not a URL, is what says the login went through.
    await expect(main.getByRole('button', {name: t('signOut'), exact: true})).toBeVisible({
      timeout: 15_000,
    });

    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
    await expect(page).toHaveURL(/\/ru\/admin/);

    // Dashboard should show a known h2 from AdminDashboardPage
    await expect(page.getByText(/бизнес-метрики/i)).toBeVisible({timeout: 8_000});
  });
});
