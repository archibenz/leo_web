import {test, expect, type Page} from '@playwright/test';

// Режим правки на живых страницах витрины.
//
// Спека идёт двумя дорогами, и это не удобство:
//   • без E2E_EDITOR_TOKEN — против фикстуры (CATALOGUE_SOURCE=fixture, как
//     остальные спеки): проверяется вход, видимость и панель;
//   • с E2E_EDITOR_TOKEN — против живого API: браузерные запросы к /api/**
//     заворачиваются на бэкенд (локально nginx'а нет, и Next их не проксирует).
//
// Черновик в фикстуре отличается от опубликованного словом «Черновик» —
// на одинаковых данных проверка «без флага черновика нет» ничего не доказывала бы.

const TOKEN = process.env.E2E_EDITOR_TOKEN ?? 'fixture-editor-token';
const API = process.env.E2E_API_PROXY;
const DRAFT_MARK = /Черновик/;

async function asOwner(page: Page): Promise<void> {
  // Роль подменяется ВСЕГДА, в том числе против живого API, и это не лень:
  // /api/auth/** лимитирован десятью запросами в минуту на IP, а спеки идут
  // параллельно с одного адреса. Настоящий ответ здесь превращал бы спеку в
  // лотерею с лимитером — а проверяем мы не роль, а вход в режим и панель.
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  if (API) {
    // Локально nginx'а нет, и Next не проксирует /api — заворачиваем сами.
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({url: `${API}${url.pathname}${url.search}`});
      await route.fulfill({response});
    });
  }
  await page.context().addCookies([{name: 'rl_session', value: TOKEN, domain: 'localhost', path: '/'}]);
  await page.addInitScript((token) => window.localStorage.setItem('reinasleo_token', token), TOKEN);
}

test.describe('вход в режим правки', () => {
  test('покупателю не достаётся ни кнопки, ни черновика', async ({page}) => {
    await page.goto('/ru');

    await expect(page.getByRole('link', {name: 'Править'})).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(DRAFT_MARK);
  });

  test('прямая ссылка ?edit=1 постороннему черновика не отдаёт', async ({page}) => {
    // Проверяется не спрятанная кнопка, а данные: чужой запрос не должен нести
    // ни одного чернового значения.
    await page.goto('/ru?edit=1');

    await expect(page.locator('body')).not.toContainText(DRAFT_MARK);
    await expect(page.getByText('Режим правки')).toHaveCount(0);
  });

  test('владелец входит в режим из шапки и видит черновик', async ({page}) => {
    await asOwner(page);
    await page.goto('/ru');

    const toggle = page.getByRole('link', {name: 'Править'});
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page).toHaveURL(/\?edit=1/);
    await expect(page.getByText('Режим правки')).toBeVisible();
    await expect(page.locator('h1')).toContainText(DRAFT_MARK);
  });
});

test.describe('правка на месте', () => {
  test('панель открывается сбоку, а не поверх страницы', async ({page}) => {
    await asOwner(page);
    await page.goto('/ru?edit=1');

    await page.getByRole('button', {name: 'Герой'}).click();
    const panel = page.getByRole('complementary', {name: 'Правка витрины'});
    await expect(panel).toBeVisible();

    // Не модалка: страница под панелью видна и остаётся кликабельной — у
    // владельца телефон, и закрытый экран означал бы правку вслепую.
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[role="dialog"]')).toHaveCount(0);
    await expect(panel.getByRole('textbox', {name: 'Заголовок · ru', exact: true})).toBeVisible();
  });

  test('выход из режима возвращает опубликованную страницу', async ({page}) => {
    await asOwner(page);
    await page.goto('/ru?edit=1');
    await expect(page.locator('h1')).toContainText(DRAFT_MARK);

    await page.getByRole('link', {name: 'Закончить правку'}).first().click();

    await expect(page).not.toHaveURL(/edit=1/);
    await expect(page.locator('body')).not.toContainText(DRAFT_MARK);
  });
});
