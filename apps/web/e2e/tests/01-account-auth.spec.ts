import type {Locator, Page} from '@playwright/test';
import {test, expect, uniqueEmail} from '../fixtures/auth';
import {copy, messages} from '../fixtures/messages';
import {COLD_COMPILE} from '../fixtures/white';

// Replaces the spec that drove /ru/auth/register — a route that has not existed
// since the White migration; that URL renders the White 404 now, which the last
// test here pins down.
//
// Registration is no longer a page. It is the second tab of /[locale]/account,
// next to sign in, with Telegram offered underneath. This spec covers what a
// guest reaches without a backend: the surface renders, the fields it exposes,
// and the checks the browser runs BEFORE any request goes out. A completed
// sign-up needs /api/auth/send-code + /api/auth/register and is covered with
// mocks in app/[locale]/account/WhiteAccountShowcase.test.tsx.

const t = messages('account');

const ACCOUNT = '/ru/account';

// Aborting every /api/* call proves the signed-out page never needs the Spring
// API rather than assuming it, and makes the run identical whether or not a
// backend happens to be up behind E2E_BASE_URL. The returned array is what the
// assertions read.
async function blockApi(page: Page): Promise<string[]> {
  const calls: string[] = [];
  await page.route('**/api/**', (route) => {
    calls.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    return route.abort();
  });
  return calls;
}

// Registered after blockApi, so it wins — Playwright matches the most recently
// added route first. The reply is produced in the browser; nothing is sent.
async function stubSendCode(page: Page): Promise<void> {
  await page.route('**/api/auth/send-code', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({message: 'sent'})}),
  );
}

// Every locator is scoped to the returned main landmark. The footer's newsletter
// field carries an sr-only label that matches loosely on /email/i, so scoping is
// what keeps the exact-string field locators honest.
async function openAccount(page: Page, path: string = ACCOUNT): Promise<Locator> {
  await page.goto(path, {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  const main = page.getByRole('main');
  // The auth surface is client-gated on useWhiteAuth: SSR emits the eyebrow and
  // nothing else, and the tablist appears only once the hook has resolved "no
  // token" (hooks/useWhiteAuth.ts — no token, no fetch, just a broadcast).
  // Waiting for the tabs means hydration and that decision are both done, so the
  // toHaveCount(0) and apiCalls checks below read a settled page instead of
  // passing against one that has not rendered.
  await expect(main.getByRole('tab')).toHaveCount(2);
  return main;
}

// Errors and the code notice share one live-region pattern, so match on the
// message: that asserts the wording and that it is announced, in one locator.
const announced = (main: Locator, message: string) =>
  main.locator('p[aria-live="polite"]').filter({hasText: message});

async function openCodeStep(main: Locator, email: string): Promise<void> {
  await main.getByRole('tab', {name: t('signUp'), exact: true}).click();
  await main.getByLabel(t('email'), {exact: true}).fill(email);
  await main.getByRole('button', {name: t('sendCode'), exact: true}).click();
  await expect(main.getByLabel(t('code'), {exact: true})).toBeVisible();
}

test.describe('account is the auth surface', () => {
  test('a guest gets both tabs, and gets them with the API down', async ({page}) => {
    const apiCalls = await blockApi(page);
    const main = await openAccount(page);

    // title and eyebrow are the same word in the catalogue, so the heading is
    // addressed by role — getByText(title) resolves to both.
    await expect(main.getByRole('heading', {level: 1, name: t('title'), exact: true})).toBeVisible();
    await expect(main.getByText(t('intro'), {exact: true})).toBeVisible();

    const tabs = main.getByRole('tab');
    await expect(tabs.nth(0)).toHaveAccessibleName(t('signIn'));
    await expect(tabs.nth(1)).toHaveAccessibleName(t('signUp'));
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'false');

    expect(apiCalls, 'a signed-out account page must not call the API').toEqual([]);
  });

  test('an anonymous visit to a protected route lands here', async ({page}) => {
    // middleware.ts sends /admin without an rl_session cookie to the account
    // page — this is the sign-in destination, so the surface has to be up.
    const apiCalls = await blockApi(page);
    const main = await openAccount(page, '/ru/admin');

    await expect(page).toHaveURL(/\/ru\/account\/?$/);
    await expect(main.getByRole('tab', {name: t('signIn'), exact: true})).toBeVisible();
    expect(apiCalls).toEqual([]);
  });
});

test.describe('sign in tab', () => {
  test('exposes the credential fields a password manager expects', async ({page}) => {
    await blockApi(page);
    const main = await openAccount(page);

    const email = main.getByLabel(t('email'), {exact: true});
    await expect(email).toHaveAttribute('type', 'email');
    await expect(email).toHaveAttribute('autocomplete', 'email');
    await expect(email).toHaveJSProperty('required', true);

    const password = main.getByLabel(t('password'), {exact: true});
    await expect(password).toHaveAttribute('type', 'password');
    // current-password, not new-password: this tab is the returning visit.
    await expect(password).toHaveAttribute('autocomplete', 'current-password');
    await expect(password).toHaveJSProperty('required', true);

    await expect(main.locator('form button[type="submit"]')).toHaveAccessibleName(t('signInCta'));

    // Sign-up-only fields stay on the other tab.
    await expect(main.getByLabel(t('code'), {exact: true})).toHaveCount(0);
    await expect(main.getByLabel(t('firstName'), {exact: true})).toHaveCount(0);
    await expect(main.getByRole('checkbox')).toHaveCount(0);
  });

  test('a malformed address is rejected in the browser, before any request', async ({page}) => {
    const apiCalls = await blockApi(page);
    const main = await openAccount(page);

    const email = main.getByLabel(t('email'), {exact: true});
    await email.fill('not-an-email');
    await main.getByLabel(t('password'), {exact: true}).fill('Passw0rd123');
    await main.locator('form button[type="submit"]').click();

    // type="email" + required is the whole client-side check here; the page
    // never runs lib/validation.ts. Constraint validation blocks submit, so
    // submitSignIn — and /api/auth/login with it — never runs.
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
    expect(apiCalls).toEqual([]);
    // No server error is claimed either: the live region stays empty.
    await expect(main.locator('p[aria-live="polite"]')).toHaveText('');

    await email.fill(uniqueEmail());
    expect(await email.evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(true);
  });
});

test.describe('sign up tab', () => {
  test('gates the account fields behind the emailed code', async ({page}) => {
    const apiCalls = await blockApi(page);
    const main = await openAccount(page);

    const signUpTab = main.getByRole('tab', {name: t('signUp'), exact: true});
    await signUpTab.click();
    await expect(signUpTab).toHaveAttribute('aria-selected', 'true');

    const email = main.getByLabel(t('email'), {exact: true});
    await expect(email).toHaveAttribute('autocomplete', 'email');

    // The code request is gated on a non-empty address only — the button is
    // type="button", so it never goes through the form's constraint validation.
    const sendCode = main.getByRole('button', {name: t('sendCode'), exact: true});
    await expect(sendCode).toBeDisabled();
    await email.fill(uniqueEmail());
    await expect(sendCode).toBeEnabled();

    // Nothing else is asked for until a code is out.
    for (const label of [t('code'), t('firstName'), t('password')]) {
      await expect(main.getByLabel(label, {exact: true})).toHaveCount(0);
    }
    await expect(main.getByRole('checkbox')).toHaveCount(0);
    expect(apiCalls).toEqual([]);
  });

  test('the code step asks for exactly what registration needs', async ({page}) => {
    const apiCalls = await blockApi(page);
    await stubSendCode(page);
    const main = await openAccount(page);

    await openCodeStep(main, uniqueEmail());
    await expect(announced(main, t('codeSent'))).toBeVisible();
    await expect(main.getByRole('button', {name: t('sendCode'), exact: true})).toHaveCount(0);

    const code = main.getByLabel(t('code'), {exact: true});
    await expect(code).toHaveAttribute('inputmode', 'numeric');
    await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(code).toHaveJSProperty('required', true);

    const firstName = main.getByLabel(t('firstName'), {exact: true});
    await expect(firstName).toHaveAttribute('autocomplete', 'given-name');
    await expect(firstName).toHaveJSProperty('required', true);

    const password = main.getByLabel(t('password'), {exact: true});
    await expect(password).toHaveAttribute('type', 'password');
    await expect(password).toHaveAttribute('autocomplete', 'new-password');
    await expect(password).toHaveJSProperty('required', true);

    // 152-ФЗ ст.9 wants a recorded consent action, and the documents it refers
    // to have to be reachable from the form. These are the form's only links.
    // Asserted as a set: which one is named first is copy, not behaviour.
    const consent = main.getByRole('checkbox');
    await expect(consent).toHaveJSProperty('required', true);
    await expect(consent).not.toBeChecked();
    const documents = main.locator('form a');
    await expect(documents).toHaveCount(2);
    const hrefs = await documents.evaluateAll((links) => links.map((a) => a.getAttribute('href')));
    expect(hrefs.slice().sort()).toEqual(['/ru/offer', '/ru/privacy']);

    await expect(main.locator('form button[type="submit"]')).toHaveAccessibleName(t('signUpCta'));
    // The stub answered inside the browser, so nothing escaped to a backend.
    expect(apiCalls).toEqual([]);
  });

  test('the name and password rules run before the register call goes out', async ({page}) => {
    const apiCalls = await blockApi(page);
    await stubSendCode(page);
    const main = await openAccount(page);

    await openCodeStep(main, uniqueEmail());
    await main.getByLabel(t('code'), {exact: true}).fill('123456');
    await main.getByLabel(t('firstName'), {exact: true}).fill('A');
    await main.getByLabel(t('password'), {exact: true}).fill('Passw0rd123');
    await main.getByRole('checkbox').check();

    // Name bounds (2-40) and WHITE_PASSWORD_RE are checked in submitSignUp
    // before whiteRegister runs, so a bad value costs no request.
    const submit = main.locator('form button[type="submit"]');
    await submit.click();
    await expect(announced(main, t('errName'))).toBeVisible();
    expect(apiCalls).toEqual([]);

    await main.getByLabel(t('firstName'), {exact: true}).fill('Анна');
    await main.getByLabel(t('password'), {exact: true}).fill('short');
    await submit.click();
    await expect(announced(main, t('errPassword'))).toBeVisible();
    expect(apiCalls).toEqual([]);

    // Switching tabs clears the message, so a stale error can never read as a
    // fresh one on the form the visitor moved to.
    await main.getByRole('tab', {name: t('signIn'), exact: true}).click();
    await expect(announced(main, t('errPassword'))).toHaveCount(0);
  });

  test('an unreachable API fails the code request loudly instead of hanging', async ({page}) => {
    const apiCalls = await blockApi(page);
    const main = await openAccount(page);

    await main.getByRole('tab', {name: t('signUp'), exact: true}).click();
    await main.getByLabel(t('email'), {exact: true}).fill(uniqueEmail());
    const sendCode = main.getByRole('button', {name: t('sendCode'), exact: true});
    await sendCode.click();

    // The one test that lets a request out (into the abort above). This is the
    // honest picture of the page with :8080 down: an error and a live button,
    // not a permanent busy state, and no half-opened code step.
    await expect(announced(main, t('errCode'))).toBeVisible();
    await expect(sendCode).toBeEnabled();
    await expect(main.getByLabel(t('code'), {exact: true})).toHaveCount(0);
    expect(apiCalls).toEqual(['POST /api/auth/send-code']);
  });
});

test.describe('telegram alternative', () => {
  test('is offered next to the forms', async ({page}) => {
    await blockApi(page);
    const main = await openAccount(page);

    const telegram = main.getByRole('button', {name: t('tgSignIn'), exact: true});
    await expect(telegram).toBeVisible();
    await expect(telegram).toBeEnabled();
    // It sits directly under the sign-up form: as a submit it would hijack it.
    await expect(telegram).toHaveAttribute('type', 'button');
    // Deliberately not clicked: it POSTs /api/auth/telegram/init, opens a t.me
    // deep link and then polls /api/auth/telegram/poll for a JWT the bot mints.
    // Without the API it can only reach tgError, so the flow itself belongs in
    // a backend-backed suite (unit coverage: WhiteTelegramLogin.test.tsx).
  });
});

test.describe('the route this spec replaced', () => {
  test('/auth/register is gone, and offers no form', async ({page}) => {
    await blockApi(page);
    await page.goto('/ru/auth/register', {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});

    // Gated on the 404's own heading, not on the main landmark: this URL still
    // matches the gradient chrome (layout.tsx keys it off /auth/), so it renders
    // layout.tsx's <main id="main-content"> around WhiteNotFoundShowcase's
    // <main id="wv-main"> and getByRole('main') is ambiguous here.
    await expect(
      page.getByRole('heading', {level: 1, name: copy('notFound', 'title'), exact: true}),
    ).toBeVisible();
    // The status code is not asserted: dev serves the 404 body with a 200.
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.getByRole('tab')).toHaveCount(0);
  });
});
