import type {Locator, Page, TestInfo} from '@playwright/test';
import {test, expect, uniqueEmail} from '../fixtures/auth';
import {copy, messages, ru} from '../fixtures/messages';
import {COLD_COMPILE, HYDRATION, openSettledForOwner} from '../fixtures/white';

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

// Cookie auth must first distinguish an anonymous visitor from an unavailable
// session service. Other API requests remain blocked and recorded.
async function blockApi(page: Page): Promise<string[]> {
  const calls: string[] = [];
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({status: 401, json: {message: 'Unauthenticated'}});
    calls.push(`${route.request().method()} ${path}`);
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
  // nothing else, and the tablist appears only after the cookie session probe
  // definitively reports an anonymous visitor.
  // Waiting for the tabs means hydration and that decision are both done, so the
  // toHaveCount(0) and apiCalls checks below read a settled page instead of
  // passing against one that has not rendered.
  // HYDRATION, а не стандартные 5 с: под параллельным прогоном вкладки
  // появляются за 1,9–7,3 с (замер и разбор — в e2e/fixtures/white.ts).
  await expect(main.getByRole('tab')).toHaveCount(2, {timeout: HYDRATION});
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
  test('a confirmed guest gets both tabs without additional API requests', async ({page}) => {
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

    expect(apiCalls, 'a guest must not make API requests beyond the session probe').toEqual([]);
  });

  test('an anonymous visit to a protected route lands here', async ({page}) => {
    // middleware.ts sends /admin without an rl_session cookie to the account
    // page — this is the sign-in destination, so the surface has to be up.
    const apiCalls = await blockApi(page);
    const main = await openAccount(page, '/ru/admin');

    // С 26.09 сторож несёт адрес возврата: после входа — обратно в раздел.
    await expect(page).toHaveURL(/\/ru\/account\/?\?next=%2Fru%2Fadmin$/);
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

const SITE_USER_ID = '932bd35d-c584-4ba2-8845-2dbe6eb48f60';
const LINK_TOKEN = 'a'.repeat(43);
const LINK_URL = `https://t.me/reinasleo_bot?start=link_${LINK_TOKEN}`;
const linkMessages = (ru.white.account as unknown as {telegramLink: Record<string, string>}).telegramLink;
const tl = (key: string) => {
  const value = linkMessages[key];
  if (!value) throw new Error(`Missing white.account.telegramLink.${key}`);
  return value;
};

async function mockTelegramAccount(page: Page, role = 'user', now = new Date()) {
  const state = {
    linked: false,
    verified: false,
    analyticsAllowed: false,
    verifiedUntil: new Date(now.getTime() + 3_600_000).toISOString(),
    siteUserId: SITE_USER_ID,
    challengeStatus: 200,
    statusCalls: 0,
    challengeCalls: 0,
    telegramOpens: 0,
    unexpectedApi: [] as string[],
  };
  await page.clock.install({time: now});
  // Context interception also covers the popup's first request.
  await page.context().route('https://t.me/**', (route) => {
    state.telegramOpens++;
    return route.fulfill({contentType: 'text/html', body: '<title>Synthetic Telegram handoff</title>'});
  });
  await page.context().route('**/api/**', (route) => {
    state.unexpectedApi.push(new URL(route.request().url()).pathname);
    return route.abort();
  });
  await page.route('**/api/auth/me', (route) => route.fulfill({json: {
    id: SITE_USER_ID, email: 'telegram-ui@example.test', name: 'Тест', role,
  }}));
  await page.route('**/account/analytics-access', route => route.fulfill({status: state.analyticsAllowed ? 204 : 403, body: ''}));
  await page.route('**/api/auth/me/telegram-link/status', (route) => {
    state.statusCalls++;
    return route.fulfill({json: {
      schema_version: 1,
      site_user_id: state.siteUserId,
      linked: state.linked,
      verified: state.verified,
      verified_until: state.verified ? state.verifiedUntil : null,
    }});
  });
  await page.route('**/api/auth/me/telegram-link/challenge', (route) => {
    state.challengeCalls++;
    expect(route.request().method()).toBe('POST');
    return route.fulfill({status: state.challengeStatus, json: state.challengeStatus === 200 ? {
      challenge_token: LINK_TOKEN, deep_link: LINK_URL,
      expires_at: new Date(Date.now() + 240_000).toISOString(),
    } : {message: 'Telegram account already linked'}});
  });
  return state;
}

async function openTelegramAccount(page: Page) {
  await openSettledForOwner(page, ACCOUNT);
  await expect(page.getByRole('heading', {level: 1, name: `${t('hello')} Тест`})).toBeVisible({timeout: HYDRATION});
  return page.getByRole('region', {name: tl('title'), exact: true});
}

async function captureTelegram(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({path, fullPage: true});
  await testInfo.attach(name, {path, contentType: 'image/png'});
}

test.describe('signed-in Telegram connection', () => {
  for (const elapsedDays of [0, 60]) {
    test(`a fresh site session reuses a ninety-day Telegram proof on day ${elapsedDays}`, async ({page}, testInfo) => {
      const day = 86_400_000;
      const confirmedAt = Date.parse('2026-10-13T10:00:00Z');
      const state = await mockTelegramAccount(page, 'admin', new Date(confirmedAt + elapsedDays * day));
      state.linked = true;
      state.verified = true;
      state.analyticsAllowed = true;
      state.verifiedUntil = new Date(confirmedAt + 90 * day).toISOString();

      const card = await openTelegramAccount(page);
      await expect(card).toHaveAttribute('data-state', 'verified');
      await page.clock.fastForward(30_000);
      await expect(card).toHaveAttribute('data-state', 'verified');
      await expect(card.getByRole('status')).toHaveText(tl('verified'));
      await expect(card.getByRole('button')).toHaveCount(0);
      await expect(card.getByRole('link', {name: tl('openTelegram')})).toHaveCount(0);
      await expect(page.getByRole('link', {name: copy('editModeSwitch', 'analyticsLink'), exact: true}))
        .toHaveAttribute('href', '/analytics');
      expect(state.statusCalls).toBeGreaterThanOrEqual(1);
      expect(state.challengeCalls).toBe(0);
      expect(state.telegramOpens).toBe(0);
      expect(state.unexpectedApi).toEqual([]);
      await captureTelegram(page, testInfo, `admin-existing-proof-day-${elapsedDays}`);
    });
  }

  test('one click opens Telegram and returning confirms the same member account automatically', async ({page}, testInfo) => {
    const state = await mockTelegramAccount(page);
    const card = await openTelegramAccount(page);
    await expect(card).toHaveAttribute('data-state', 'idle');
    await expect(page.getByRole('link', {name: copy('editModeSwitch', 'adminLink'), exact: true})).toHaveCount(0);
    await expect(page.getByRole('link', {name: copy('editModeSwitch', 'analyticsLink'), exact: true})).toHaveCount(0);

    const popupPromise = page.waitForEvent('popup');
    await card.getByRole('button', {name: tl('connect'), exact: true}).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(LINK_URL);
    expect(await popup.evaluate(() => window.opener === null)).toBe(true);
    await expect(card.getByRole('status')).toHaveText(tl('pending'));
    await expect(card.getByRole('button')).toHaveCount(0);
    expect(state.challengeCalls).toBe(1);
    await captureTelegram(page, testInfo, 'member-pending-desktop');

    state.linked = true;
    state.verified = true;
    await page.clock.fastForward(3100);
    await popup.close();
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(card).toHaveAttribute('data-state', 'verified');
    await expect(card.getByRole('status')).toHaveText(tl('verified'));
    await expect(card.getByRole('link', {name: tl('openTelegram')})).toHaveCount(0);
    expect(state.statusCalls).toBeGreaterThanOrEqual(2);
    expect(state.telegramOpens).toBe(1);
    expect(state.unexpectedApi).toEqual([]);
    await captureTelegram(page, testInfo, 'member-connected-desktop');
  });

  test('a blocked popup retains a safe manual handoff and polling verifies an admin', async ({page}, testInfo) => {
    const state = await mockTelegramAccount(page, 'admin');
    state.linked = true;
    await page.addInitScript(() => {window.open = () => null;});
    const card = await openTelegramAccount(page);
    await expect(card).toHaveAttribute('data-state', 'refresh');
    await card.getByRole('button', {name: tl('refreshAction'), exact: true}).click();
    const fallback = card.getByRole('link', {name: tl('openTelegram'), exact: true});
    await expect(fallback).toHaveAttribute('href', LINK_URL);
    await expect(fallback).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(fallback).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(state.telegramOpens).toBe(0);
    const popupPromise = page.waitForEvent('popup');
    await fallback.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(LINK_URL);
    await popup.close();
    await page.bringToFront();
    state.verified = true;
    await page.clock.fastForward(15_100);
    await expect(card).toHaveAttribute('data-state', 'verified');
    await expect(card.getByRole('status')).toHaveText(tl('verified'));
    expect(state.challengeCalls).toBe(1);
    expect(state.telegramOpens).toBe(1);
    expect(state.unexpectedApi).toEqual([]);
    await captureTelegram(page, testInfo, 'admin-verified-desktop');
  });

  test('a conflicting Telegram account stays unlinked and offers a fresh retry', async ({page}, testInfo) => {
    const state = await mockTelegramAccount(page);
    state.challengeStatus = 409;
    const card = await openTelegramAccount(page);
    await expect(card).toHaveAttribute('data-state', 'idle');
    await card.getByRole('button', {name: tl('connect'), exact: true}).click();
    await expect(card).toHaveAttribute('data-state', 'conflict');
    await expect(card.getByRole('status')).toHaveText(tl('conflict'));
    await expect(card.getByRole('link')).toHaveCount(0);
    expect(state.telegramOpens).toBe(0);
    await captureTelegram(page, testInfo, 'member-conflict-desktop');

    state.challengeStatus = 200;
    await card.getByRole('button', {name: tl('retry'), exact: true}).click();
    await expect(card).toHaveAttribute('data-state', 'pending');
    expect(state.challengeCalls).toBe(2);
    expect(state.linked).toBe(false);
    expect(state.unexpectedApi).toEqual([]);
  });

  test('confirmation for a different account never displays connected', async ({page}) => {
    const state = await mockTelegramAccount(page);
    state.siteUserId = 'bc12baf7-dfd0-473d-bf2e-f14a9a754bad';
    state.linked = true;
    const card = await openTelegramAccount(page);
    await expect(card).toHaveAttribute('data-state', 'unavailable');
    await expect(card.getByRole('status')).toHaveText(tl('unavailable'));
    await expect(card.getByRole('button', {name: tl('retry'), exact: true})).toBeVisible();
    expect(state.challengeCalls).toBe(0);
  });

  test('owner actions and connection remain keyboard-accessible without motion on mobile', async ({page}, testInfo) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.emulateMedia({reducedMotion: 'reduce'});
    const state = await mockTelegramAccount(page, 'admin');
    state.analyticsAllowed = true;
    const card = await openTelegramAccount(page);
    await expect(card).toHaveAttribute('data-state', 'idle');
    const admin = page.getByRole('link', {name: copy('editModeSwitch', 'adminLink'), exact: true});
    const analytics = page.getByRole('link', {name: copy('editModeSwitch', 'analyticsLink'), exact: true});
    const connect = card.getByRole('button', {name: tl('connect'), exact: true});
    await expect(admin).toHaveAttribute('href', '/ru/admin');
    await expect(analytics).toHaveAttribute('href', '/analytics');
    for (const action of [admin, analytics, connect]) {
      await expect(action).toBeVisible();
      const box = await action.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    const actionStyles = async () => connect.evaluate((element) => {
      const style = getComputedStyle(element);
      return {color: style.color, backgroundColor: style.backgroundColor, opacity: style.opacity,
        outlineColor: style.outlineColor, outlineStyle: style.outlineStyle,
        disabled: (element as HTMLButtonElement).disabled};
    });
    const settleAction = () => expect.poll(() => connect.evaluate((element) =>
      element.getAnimations().every((animation) => animation.playState !== 'running'),
    )).toBe(true);
    await page.mouse.move(0, 0);
    await settleAction();
    const defaultStyles = await actionStyles();
    await admin.focus();
    await page.keyboard.press('Tab');
    await expect(analytics).toBeFocused();
    expect(await analytics.evaluate((element) => element.matches(':focus-visible'))).toBe(true);
    await page.keyboard.press('Tab');
    await expect(connect).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await card.getByRole('status').evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
    await expect(analytics.locator('svg')).toHaveCount(0);
    expect(await analytics.evaluate((element) => getComputedStyle(element, '::before').transitionDuration)).toBe('0s');
    expect(await analytics.evaluate((element) => getComputedStyle(element).transform)).toBe('none');
    await settleAction();
    await testInfo.attach('enabled-action-styles', {
      body: JSON.stringify({default: defaultStyles, focused: await actionStyles()}, null, 2),
      contentType: 'application/json',
    });
    await captureTelegram(page, testInfo, 'admin-mobile-reduced-motion');
  });
});

test.describe('the decorative panel', () => {
  test('rides the wide screen and leaves the phone alone', async ({page}) => {
    await blockApi(page);
    await openAccount(page);

    // Owner's call: the floating lines are a wide-screen thing. Asserted here
    // rather than in the unit test because the breakpoint is CSS, and jsdom
    // applies none — there the panel is only checked for being unreachable.
    const decor = page.locator('[data-wv-decor]');
    await expect(decor).toHaveCount(1);
    await expect(decor).toBeVisible();

    await page.setViewportSize({width: 390, height: 844});
    await expect(decor).toBeHidden();
    // Nothing of it is left behind either: no animated path is rendered on a
    // narrow screen, so the phone paints no decoration at all.
    await expect(page.locator('.wv-path:visible')).toHaveCount(0);
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
