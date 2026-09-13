import {test, expect, type Page} from '@playwright/test';
import {STOREFRONT_DRAFT_FIXTURE} from '../../lib/catalogue/fixture';
import {skipUnlessFixtureCatalogue} from '../fixtures/catalogue';
import {openSettledForOwner, openWhite} from '../fixtures/white';

// Бегущая строка на главной (storefront_sections, layout='ticker') — тот же
// приём редактора, что герой и тизер сетов (07-storefront-editor.spec.ts):
// сравниваются опубликованное и черновик из фикстуры, а не два реальных API-
// ответа. У STOREFRONT_FIXTURE (опубликованное, lib/catalogue/fixture.ts)
// items пуст нарочно — это ожидаемое состояние сайта сразу после выкатки V33,
// а не недосмотр спеки; заполненная версия лежит в STOREFRONT_DRAFT_FIXTURE,
// которую отдаёт предпросмотр владельца.

const TOKEN = 'fixture-editor-token';
const TICKER = STOREFRONT_DRAFT_FIXTURE.sections.find((s) => s.layout === 'ticker')!;
const FIRST_LINE = TICKER.items![0]!.ru;
const TICKER_REGION_NAME = 'Новости и объявления'; // messages/ru.json: white.ticker.regionLabel

// Тот же приём, что asOwner в 07-storefront-editor.spec.ts: роль подменяется
// маршрутом, не настоящим логином. Живой API этой спеке не нужен — предпросмотр
// в режиме CATALOGUE_SOURCE=fixture отдаёт STOREFRONT_DRAFT_FIXTURE без сети
// (см. lib/catalogue/fetch.ts), поэтому здесь нет ветки E2E_API_PROXY.
async function asOwner(page: Page): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.context().addCookies([{name: 'rl_session', value: TOKEN, domain: 'localhost', path: '/'}]);
  await page.addInitScript((token) => window.localStorage.setItem('reinasleo_token', token), TOKEN);
}

test.beforeEach(async ({request}) => {
  await skipUnlessFixtureCatalogue(request);
});

test('без строк полосы на главной нет вовсе', async ({page}) => {
  await openWhite(page, '/ru');

  await expect(page.getByRole('region', {name: TICKER_REGION_NAME})).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(FIRST_LINE);
});

test('с черновиком строк полоса видна и несёт текст строки', async ({page}) => {
  await asOwner(page);
  await openSettledForOwner(page, '/ru?edit=1');

  const ticker = page.getByRole('region', {name: TICKER_REGION_NAME});
  await expect(ticker).toBeVisible();
  await expect(ticker).toContainText(FIRST_LINE);
});

test('в режиме правки по полосе открывается панель со списком строк', async ({page}) => {
  await asOwner(page);
  await openSettledForOwner(page, '/ru?edit=1');

  await page.getByRole('button', {name: 'Бегущая строка'}).click();
  const panel = page.getByRole('complementary', {name: 'Правка витрины'});
  await expect(panel).toBeVisible();

  // Панель — TickerForm, не SectionForm: список строк с полем на первую из них,
  // а не заголовок/эйбров героя.
  await expect(panel.getByRole('textbox', {name: 'Текст (ru) · строка 1', exact: true})).toHaveValue(FIRST_LINE);
  await expect(panel.getByRole('textbox', {name: 'Заголовок · ru', exact: true})).toHaveCount(0);
});
