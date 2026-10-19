import {createServer, request as proxyRequest, type Server, type ServerResponse} from 'node:http';
import {test, expect, type Page, type Route} from '@playwright/test';
import {COLD_COMPILE, acknowledgeCookies} from '../fixtures/white';

const ACCOUNT = '/ru/account';
const TOKEN = 'reinasleo_token';
const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Новая сессия', email: 'new-session@example.test', role: 'customer',
};

async function fixture(page: Page) {
  await acknowledgeCookies(page);
  await page.route('**/api/**', route => route.fulfill({status: 200, json: []}));
  await page.route('**/account/analytics-access', route => route.fulfill({status: 403, body: ''}));
  await page.route('**/metrika/**', route => route.abort());
  await page.route('**/api/auth/me/telegram-link/status', route => route.fulfill({
    json: {schema_version: 1, site_user_id: USER.id, linked: false, verified: false, verified_until: null},
  }));
}

async function freezeAfterHydration(page: Page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now()) + 100);
}

async function openAccount(page: Page) {
  await page.goto(ACCOUNT, {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  return page.getByRole('main');
}

async function nextPaint(page: Page) {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function currentGate(page: Page, routes: Route[]): Promise<Route> {
  await nextPaint(page);
  await expect.poll(() => routes.length).toBeGreaterThan(0);
  const route = routes[routes.length - 1];
  expect(route.request().failure()).toBeNull();
  return route;
}

test.beforeEach(async ({page}) => fixture(page));

test('real Next permission route forwards only the Site cookie and preserves gate statuses', {tag: '@server-only'}, async ({request, baseURL}) => {
  const app = new URL(baseURL ?? 'http://localhost:3000');
  if (app.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(app.hostname)) {
    throw new Error('The permission-route fixture requires a local HTTP app');
  }
  let status = 204;
  const calls: Array<{path: string | undefined; cookie: string | undefined; authorization: string | undefined}> = [];
  const server = createServer((incoming, response) => {
    calls.push({path: incoming.url, cookie: incoming.headers.cookie, authorization: incoming.headers.authorization});
    response.writeHead(status);
    response.end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(8081, '127.0.0.1', resolve);
  });
  try {
    for (const locale of ['ru', 'en']) {
      for (const upstreamStatus of [204, 403, 503]) {
        status = upstreamStatus;
        const reply = await request.get(new URL(`/${locale}/account/analytics-access`, app).href, {
          headers: {Cookie: 'rl_session=synthetic-site-proof; analytics_session=synthetic-other-account', Authorization: 'Bearer synthetic-unrelated'},
        });
        expect(reply.status()).toBe(upstreamStatus);
        expect(reply.headers()['cache-control']).toContain('no-store');
        expect(await reply.body()).toHaveLength(0);
      }
    }
    const noSiteCookie = await request.get(new URL('/ru/account/analytics-access', app).href, {
      headers: {Cookie: 'analytics_session=synthetic-other-account', Authorization: 'Bearer synthetic-unrelated'},
    });
    expect(noSiteCookie.status()).toBe(401);
    const neighbor = await request.get(new URL('/ru/account/not-a-real-route', app).href);
    expect(neighbor.status()).toBe(404);
    expect(calls).toEqual(Array.from({length: 6}, () => ({
      path: '/api/v1/auth/web-gate', cookie: 'rl_session=synthetic-site-proof', authorization: undefined,
    })));
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('a pending cookie session leaves a visible account heading and status', async ({page}, info) => {
  let request: Route | undefined;
  await page.route('**/api/auth/me', route => { request = route; });
  const main = await openAccount(page);
  await expect.poll(() => !!request).toBe(true);
  await expect(main.getByRole('heading', {name: 'Аккаунт', exact: true})).toBeVisible();
  await expect(main.getByRole('status')).toHaveText('Проверяем вход в аккаунт…');
  await expect(main.getByRole('tab')).toHaveCount(0);
  await page.screenshot({path: info.outputPath('session-pending.png'), fullPage: true});
  await request!.fulfill({status: 401, json: {message: 'Unauthenticated'}});
  await expect(main.getByRole('tab', {name: 'Вход', exact: true})).toBeVisible();
});

test.describe('account analytics access', () => {
  test('an allowed customer sees Analytics without receiving site administrator controls', async ({page}, info) => {
    await page.route('**/api/auth/me', route => route.fulfill({json: USER}));
    let gate: Route | undefined;
    await page.route('**/account/analytics-access', route => {gate = route;});
    const main = await openAccount(page);
    await expect(main.getByRole('heading', {name: 'Здравствуйте, Новая сессия', exact: true})).toBeVisible();
    await expect.poll(() => !!gate).toBe(true);
    await expect(main.getByRole('link', {name: 'Аналитика', exact: true})).toHaveCount(0);
    await gate!.fulfill({status: 204, body: ''});
    const link = main.getByRole('link', {name: 'Аналитика', exact: true});
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/analytics');
    await expect(main.getByRole('link', {name: 'Админ-панель', exact: true})).toHaveCount(0);
    await expect(main.getByRole('switch')).toHaveCount(0);
    await page.screenshot({path: info.outputPath('allowed-customer-analytics.png'), fullPage: true});
  });

  test('a site administrator denied by Analytics keeps site tools but gets no Analytics link', async ({page}) => {
    await page.route('**/api/auth/me', route => route.fulfill({json: {...USER, role: 'admin'}}));
    const gates: Route[] = [];
    await page.route('**/account/analytics-access', route => {gates.push(route);});
    const main = await openAccount(page);
    await expect(main.getByRole('heading', {name: 'Здравствуйте, Новая сессия', exact: true})).toBeVisible();
    const gate = await currentGate(page, gates);
    const response = page.waitForResponse(reply => reply.request() === gate.request());
    await gate.fulfill({status: 403, body: ''});
    await response;
    await nextPaint(page);
    await expect(main.getByRole('link', {name: 'Админ-панель', exact: true})).toBeVisible();
    await expect(main.getByRole('link', {name: 'Аналитика', exact: true})).toHaveCount(0);
  });

  test('an unavailable permission service offers retry without granting optimistic access', async ({page}) => {
    await page.route('**/api/auth/me', route => route.fulfill({json: USER}));
    const gates: Route[] = [];
    await page.route('**/account/analytics-access', route => {gates.push(route);});
    const main = await openAccount(page);
    await expect(main.getByRole('heading', {name: 'Здравствуйте, Новая сессия', exact: true})).toBeVisible();
    await (await currentGate(page, gates)).fulfill({status: 503, body: ''});
    const retry = main.getByRole('button', {name: 'Проверить доступ снова', exact: true});
    await expect(retry).toBeVisible();
    await expect(main.getByRole('link', {name: 'Аналитика', exact: true})).toHaveCount(0);
    const previousRequests = gates.length;
    await retry.click();
    await expect.poll(() => gates.length).toBeGreaterThan(previousRequests);
    await expect(main.getByRole('link', {name: 'Аналитика', exact: true})).toHaveCount(0);
    await (await currentGate(page, gates)).fulfill({status: 204, body: ''});
    await expect(main.getByRole('link', {name: 'Аналитика', exact: true})).toBeVisible();
  });

  test('switching account cancels the old permission check and cannot inherit its access', async ({page}) => {
    let meChecks = 0;
    const changedUser = {...USER, id: '00000000-0000-4000-8000-000000000002', name: 'Другой пользователь'};
    await page.route('**/api/auth/me', route => route.fulfill({json: ++meChecks === 1 ? USER : changedUser}));
    const gates: Route[] = [];
    await page.route('**/account/analytics-access', route => {gates.push(route);});
    const main = await openAccount(page);
    await expect(main.getByRole('heading', {name: 'Здравствуйте, Новая сессия', exact: true})).toBeVisible();
    const oldGate = await currentGate(page, gates);
    const previousRequests = gates.length;
    const oldRequestCancelled = page.waitForEvent('requestfailed', request => request === oldGate.request());
    await page.evaluate(key => {
      localStorage.setItem(key, 'different-session-token');
      window.dispatchEvent(new StorageEvent('storage', {key, newValue: 'different-session-token', storageArea: localStorage}));
    }, TOKEN);
    await oldRequestCancelled;
    await expect(main.getByRole('heading', {name: 'Здравствуйте, Другой пользователь', exact: true})).toBeVisible();
    await expect.poll(() => gates.length).toBeGreaterThan(previousRequests);
    const newGate = await currentGate(page, gates);
    const response = page.waitForResponse(reply => reply.request() === newGate.request());
    await newGate.fulfill({status: 403, body: ''});
    await response;
    await oldGate.fulfill({status: 204, body: ''});
    await nextPaint(page);
    await expect(main.getByRole('link', {name: 'Аналитика', exact: true})).toHaveCount(0);
  });

  test('fresh Telegram confirmation rechecks the Site session and waits for Analytics permission', async ({page}) => {
    await page.clock.install();
    await page.addInitScript(() => {window.open = () => null;});
    let meChecks = 0;
    let verified = false;
    await page.route('**/api/auth/me', route => {meChecks++; return route.fulfill({json: USER});});
    await page.route('**/api/auth/me/telegram-link/status', route => route.fulfill({json: {
      schema_version: 1, site_user_id: USER.id, linked: verified, verified,
      verified_until: verified ? new Date(Date.now() + 60 * 86_400_000).toISOString() : null,
    }}));
    await page.route('**/api/auth/me/telegram-link/challenge', route => route.fulfill({json: {
      challenge_token: 'x'.repeat(43), deep_link: `https://t.me/reinasleo_bot?start=link_${'x'.repeat(43)}`,
      expires_at: new Date(Date.now() + 300_000).toISOString(),
    }}));
    const gates: Route[] = [];
    await page.route('**/account/analytics-access', route => {
      gates.push(route);
      if (!verified) return route.fulfill({status: 403, body: ''});
    });
    const main = await openAccount(page);
    await expect.poll(() => gates.length).toBeGreaterThan(0);
    const telegram = main.getByRole('region', {name: 'Telegram', exact: true});
    await telegram.getByRole('button', {name: 'Подключить Telegram', exact: true}).click();
    await expect(telegram.getByRole('link', {name: 'Открыть Telegram', exact: true})).toBeVisible();
    const previousRequests = gates.length;
    verified = true;
    await page.clock.fastForward(3_100);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => meChecks).toBe(2);
    await expect.poll(() => gates.length).toBeGreaterThan(previousRequests);
    await expect(main.getByRole('heading', {name: 'Здравствуйте, Новая сессия', exact: true})).toBeVisible();
    await expect(main.getByRole('link', {name: 'Аналитика', exact: true})).toHaveCount(0);
    await (await currentGate(page, gates)).fulfill({status: 204, body: ''});
    await expect(main.getByRole('link', {name: 'Аналитика', exact: true})).toBeVisible();
    expect(meChecks).toBe(2);
  });
});

test('a timed-out cookie probe preserves a legacy credential and offers a working manual retry', async ({page}, info) => {
  await page.clock.install();
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [TOKEN, 'preserved-legacy-token']);
  const requests: Route[] = [];
  await page.route('**/api/auth/me', route => { requests.push(route); });
  const main = await openAccount(page);
  await expect.poll(() => requests.length).toBe(1);
  await expect(main.getByRole('status')).toBeVisible();
  await freezeAfterHydration(page);

  await page.clock.runFor(15_001);
  await expect(main.getByRole('alert')).toHaveText('Не удалось проверить сессию. Попробуйте ещё раз.');
  await expect(main.getByRole('button', {name: 'Проверить сессию снова', exact: true})).toBeEnabled();
  await expect(main.getByRole('tab')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), TOKEN)).toBe('preserved-legacy-token');
  expect(requests).toHaveLength(1);
  expect(requests[0].request().headers().authorization).toBeUndefined();
  await page.screenshot({path: info.outputPath('session-timeout-recovery.png'), fullPage: true});

  await main.getByRole('button', {name: 'Проверить сессию снова', exact: true}).click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].request().headers().authorization).toBeUndefined();
  await requests[1].fulfill({json: USER});
  await expect(main.getByRole('heading', {name: 'Здравствуйте, Новая сессия', exact: true})).toBeVisible();
  await expect(main.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), TOKEN)).toBeNull();
});

test('a completed old cookie request cannot replace the newer session', async ({page}) => {
  const requests: Route[] = [];
  await page.route('**/api/auth/me', route => { requests.push(route); });
  const main = await openAccount(page);
  await expect.poll(() => requests.length).toBe(1);
  await page.evaluate(key => {
    localStorage.setItem(key, 'new-session-token');
    window.dispatchEvent(new StorageEvent('storage', {key, newValue: 'new-session-token', storageArea: localStorage}));
  }, TOKEN);
  await expect.poll(() => requests.length).toBe(2);
  await requests[1].fulfill({json: USER});
  await expect(main.getByRole('heading', {name: 'Здравствуйте, Новая сессия', exact: true})).toBeVisible();
  const oldResponse = page.waitForResponse(response => response.request() === requests[0].request());
  await requests[0].fulfill({json: {...USER, id: '00000000-0000-4000-8000-000000000002', name: 'Старая сессия'}});
  await (await oldResponse).finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(main.getByRole('heading', {name: 'Здравствуйте, Новая сессия', exact: true})).toBeVisible();
  await expect(main.getByText('Старая сессия', {exact: true})).toHaveCount(0);
});

test.describe('session response body deadline', () => {
  let server: Server;
  let streamUrl: string;
  const responses = new Set<ServerResponse>();

  test.beforeAll(async ({baseURL}) => {
    const app = new URL(baseURL ?? 'http://localhost:3000');
    if (app.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(app.hostname)) {
      throw new Error('The streaming session fixture requires a local HTTP app');
    }
    server = createServer((request, response) => {
      // Preserve same-origin fetch and the real CSP in WebKit as well as Chromium.
      if (request.url?.split('?')[0] !== '/api/auth/me') {
        const target = new URL(request.url ?? '/', app);
        if (target.origin !== app.origin) {response.writeHead(400); response.end(); return;}
        const upstream = proxyRequest(target, {
          method: request.method, headers: {...request.headers, host: app.host},
        }, incoming => {
          response.writeHead(incoming.statusCode ?? 502, incoming.headers);
          incoming.pipe(response);
        });
        upstream.on('error', () => {response.writeHead(502); response.end();});
        request.pipe(upstream);
        return;
      }
      responses.add(response);
      response.on('close', () => responses.delete(response));
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.flushHeaders();
      response.write('{"id":');
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing local streaming fixture');
    streamUrl = `http://127.0.0.1:${address.port}`;
  });

  test.afterAll(async () => {
    for (const response of responses) response.destroy();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  test('headers without a complete JSON body still reach visible recovery', async ({page}) => {
    await page.clock.install();
    await page.route('**/api/auth/me', route => route.continue());
    const responseReady = page.waitForResponse(response => response.url().endsWith('/api/auth/me') && response.status() === 200);
    await page.goto(`${streamUrl}${ACCOUNT}`, {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
    const main = page.getByRole('main');
    await responseReady;
    await expect(main.getByRole('status')).toHaveText('Проверяем вход в аккаунт…');
    await freezeAfterHydration(page);
    await page.clock.runFor(15_001);
    await expect(main.getByRole('alert')).toHaveText('Не удалось проверить сессию. Попробуйте ещё раз.');
    await expect(main.getByRole('button', {name: 'Проверить сессию снова', exact: true})).toBeEnabled();
    await expect(main.getByRole('tab')).toHaveCount(0);
  });
});
