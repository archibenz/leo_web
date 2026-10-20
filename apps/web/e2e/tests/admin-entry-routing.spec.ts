import {test, expect} from '@playwright/test';

const headers = {Cookie: 'rl_session=e2e-admin-entry'};

test('legacy admin roots redirect to Analytics while management pages stay in the Site app', async ({request}) => {
  for (const path of ['/ru/admin', '/en/admin', '/ru/admin?next=https://example.invalid']) {
    const response = await request.get(path, {maxRedirects: 0, headers});
    expect(response.status(), path).toBe(307);
    expect(new URL(response.headers().location, response.url()).href, path).toBe(new URL('/analytics', response.url()).href);
  }
  for (const path of ['/ru/admin/products', '/ru/admin/inventory', '/en/admin/homepage']) {
    const response = await request.get(path, {maxRedirects: 0, headers});
    expect(response.status(), path).toBe(200);
    expect(response.headers().location, path).toBeUndefined();
  }
});

test('anonymous nested Site admin requests still go through the account gate', async ({request}) => {
  const response = await request.get('/ru/admin/products', {maxRedirects: 0});
  expect(response.status()).toBe(307);
  const target = new URL(response.headers().location, response.url());
  expect(target.pathname).toBe('/ru/account');
  expect(target.searchParams.get('next')).toBe('/ru/admin/products');
});

test('browser follows the old entry to the new application without loading legacy statistics', async ({page}) => {
  await page.context().addCookies([{name: 'rl_session', value: 'e2e-admin-entry', domain: new URL(test.info().project.use.baseURL!).hostname, path: '/'}]);
  const stats: string[] = [];
  page.on('request', request => {
    if (/\/api\/admin\/(dashboard|stats\/)/.test(request.url())) stats.push(request.url());
  });
  // Analytics is a separate application; verify the real document handoff.
  const destination = page.waitForRequest(request =>
    request.isNavigationRequest() && new URL(request.url()).pathname === '/analytics');
  await page.goto('/ru/admin');
  expect((await destination).resourceType()).toBe('document');
  expect(stats).toEqual([]);
});
