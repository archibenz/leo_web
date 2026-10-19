import {test, expect, type Page} from '@playwright/test';
import {STOREFRONT_DRAFT_FIXTURE} from '../../lib/catalogue/fixture';
import {COLD_COMPILE, hydrateViaCookieNotice} from '../fixtures/white';

test.use({video: 'off', trace: 'off'});
test.setTimeout(45_000);
const TITLE = 'Редактор сайта';
const OWNER_ID = '4d34e614-8053-41b0-b460-0cfb2263a413';
const HERO = STOREFRONT_DRAFT_FIXTURE.sections.find(section => section.layout === 'hero')!;

async function owner(page: Page) {
  const writes: {method: string; path: string; body: unknown}[] = [];
  let drafts: {kind: string; id: string; key: string; fields: string[]}[] = [];
  await page.route('**/account/analytics-access', route => route.fulfill({status: 204, body: ''}));
  await page.route('**/api/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') writes.push({method: request.method(), path, body: request.postData() ? request.postDataJSON() : null});
    if (path === '/api/auth/me') return route.fulfill({json: {id: OWNER_ID, role: 'admin', name: 'Александр', email: 'owner@example.test'}});
    if (path === '/api/auth/me/telegram-link/status') return route.fulfill({json: {schema_version: 1, site_user_id: OWNER_ID, linked: true, verified: true, verified_until: new Date(Date.now() + 3_600_000).toISOString()}});
    if (path === '/api/admin/storefront/drafts') return route.fulfill({json: drafts});
    if (path === `/api/admin/storefront/sections/${HERO.id}` && request.method() === 'PUT') {
      drafts = [{kind: 'section', id: HERO.id, key: HERO.slug, fields: Object.keys(request.postDataJSON())}];
      return route.fulfill({json: {...HERO, ...request.postDataJSON()}});
    }
    return route.fulfill({json: []});
  });
  await page.addInitScript(() => localStorage.setItem('reinasleo_token', 'fixture-workspace-token'));
  await page.context().addCookies([{name: 'rl_session', value: 'fixture-workspace-session', domain: new URL(process.env.E2E_BASE_URL || 'http://localhost:3000').hostname, path: '/'}]);
  return writes;
}

async function workspace(page: Page) {
  await page.goto('/ru?edit=1', {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  await hydrateViaCookieNotice(page);
  const panel = page.getByRole('complementary', {name: TITLE});
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('button', {name: 'Герой', exact: true})).toBeVisible();
  return panel;
}

test('workspace reserves the right panel and selects exactly one visible region from list or page', async ({page}, info) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await owner(page);
  const panel = await workspace(page);
  const panelBox = (await panel.boundingBox())!;
  expect(panelBox.x + panelBox.width).toBe(1440);
  expect(panelBox.width).toBeGreaterThanOrEqual(340);
  const headerBox = (await page.locator('.wv-root > header').boundingBox())!;
  expect(headerBox.x + headerBox.width).toBeLessThanOrEqual(panelBox.x + 1);
  const hero = page.getByRole('group', {name: 'Герой', exact: true});
  expect((await hero.boundingBox())!.x + (await hero.boundingBox())!.width).toBeLessThanOrEqual(panelBox.x + 1);
  await page.screenshot({path: info.outputPath('workspace-blocks.png')});
  await panel.getByRole('button', {name: 'Герой', exact: true}).click();
  await expect(panel.getByRole('tab', {name: 'Свойства', exact: true})).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-editable][data-selected="true"]')).toHaveCount(1);
  await expect(hero).toHaveAttribute('data-selected', 'true');
  await expect(hero).toBeInViewport();
  await expect(panel.getByRole('textbox', {name: 'Заголовок · ru', exact: true})).toHaveValue(HERO.headlineRu!);
  await expect.poll(async () => Math.round((await panel.boundingBox())!.y)).toBe(0);
  await page.screenshot({path: info.outputPath('workspace-properties.png')});
  const second = page.locator('[data-editable]').filter({hasNot: page.locator('[data-editable]')}).nth(1);
  await second.click();
  await expect(page.locator('[data-editable][data-selected="true"]')).toHaveCount(1);
  await expect(second).toHaveAttribute('data-selected', 'true');
  await panel.getByRole('tab', {name: 'Блоки', exact: true}).click();
  await panel.getByRole('tab', {name: 'Блоки', exact: true}).press('ArrowRight');
  await expect(panel.getByRole('tab', {name: 'Свойства', exact: true})).toBeFocused();
});

test('dirty edits survive rejected selection, tab changes and exit; save sends only edited fields', async ({page}, info) => {
  await page.setViewportSize({width: 1440, height: 1000});
  const writes = await owner(page);
  const panel = await workspace(page);
  await panel.getByRole('button', {name: 'Герой', exact: true}).click();
  const headline = panel.getByRole('textbox', {name: 'Заголовок · ru', exact: true});
  await headline.fill('Новый заголовок');
  await expect(panel.getByText('Есть несохранённые изменения', {exact: true})).toBeVisible();
  await panel.getByRole('tab', {name: 'Блоки', exact: true}).click();
  const other = panel.getByRole('tabpanel').getByRole('button').filter({hasNotText: 'Герой'}).first();
  const rejectedSelection = page.waitForEvent('dialog').then(async dialog => {expect(dialog.message()).toContain('несохранённые'); await dialog.dismiss();});
  await other.click();
  await rejectedSelection;
  await panel.getByRole('tab', {name: 'Свойства', exact: true}).click();
  await expect(headline).toHaveValue('Новый заголовок');
  const rejectedExit = page.waitForEvent('dialog').then(async dialog => {expect(dialog.message()).toContain('несохранённые'); await dialog.dismiss();});
  await panel.getByRole('button', {name: 'Закончить правку', exact: true}).click();
  await rejectedExit;
  await expect(page).toHaveURL(/edit=1/);
  await expect(headline).toHaveValue('Новый заголовок');
  await panel.getByRole('button', {name: 'Сохранить в черновик', exact: true}).click();
  await expect(panel.getByText('Нет несохранённых изменений', {exact: true})).toBeVisible();
  await expect(page.locator('[data-page-loading]')).toHaveCount(0);
  expect(writes.filter(write => write.method === 'PUT')).toEqual([{method: 'PUT', path: `/api/admin/storefront/sections/${HERO.id}`, body: {headlineRu: 'Новый заголовок'}}]);
  await panel.getByRole('tab', {name: 'Изменения', exact: true}).click();
  await expect(panel.getByRole('tabpanel', {name: 'Изменения'}).getByText('Заголовок · ru', {exact: true})).toBeVisible();
  await expect(panel.getByRole('button', {name: 'Опубликовать', exact: true})).toBeEnabled();
  await page.screenshot({path: info.outputPath('workspace-saved-changes.png')});
  await panel.getByRole('button', {name: 'Закончить правку', exact: true}).click();
  await expect(page).not.toHaveURL(/edit=1/);
  await expect(page.locator('[data-editable]')).toHaveCount(0);
  await expect(page.locator('#wv-main h1')).not.toContainText('Черновик');
});

test('account has a compact owner entry and verified Telegram status', async ({page}, info) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await owner(page);
  await page.goto('/ru/account', {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  await hydrateViaCookieNotice(page);
  const tools = page.getByRole('region', {name: 'Управление сайтом'});
  await expect(tools.getByRole('link', {name: /Редактировать сайт/})).toHaveAttribute('href', '/ru?edit=1');
  await expect(tools.getByRole('switch')).toHaveCount(0);
  await expect(tools.getByRole('link', {name: 'Админ-панель', exact: true})).toBeVisible();
  await expect(tools.getByRole('link', {name: 'Аналитика', exact: true})).toHaveCount(0);
  await expect(page.getByRole('link', {name: 'Аналитика', exact: true})).toHaveAttribute('href', '/analytics');
  const telegram = page.locator('.wv-telegram-card[data-state="verified"]');
  await expect(telegram).toBeVisible();
  expect((await telegram.boundingBox())!.height).toBeLessThan(130);
  await tools.scrollIntoViewIfNeeded();
  await page.screenshot({path: info.outputPath('account-owner-compact.png')});
});

test('mobile preview is read-only and has no horizontal overflow', async ({page}, info) => {
  await page.setViewportSize({width: 390, height: 844});
  await owner(page);
  await page.goto('/ru?edit=1', {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
  await hydrateViaCookieNotice(page);
  await expect(page.getByText('Черновик · править можно с компьютера', {exact: true})).toBeVisible();
  await expect(page.getByRole('complementary', {name: TITLE})).toBeHidden();
  await expect(page.locator('[data-editable]')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: info.outputPath('workspace-mobile-readonly.png')});
  await page.getByRole('link', {name: 'Закончить правку', exact: true}).click();
  await expect(page).not.toHaveURL(/edit=1/);
  await expect(page.locator('#wv-main h1')).not.toContainText('Черновик');
});
