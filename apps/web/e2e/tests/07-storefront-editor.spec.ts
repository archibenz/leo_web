import {test, expect, request, type APIRequestContext, type Page} from '@playwright/test';

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

const DRAFT_PATH = {section: 'sections', model: 'models', set: 'sets'} as const;

function adminApi(): Promise<APIRequestContext> {
  return request.newContext({baseURL: API, extraHTTPHeaders: {Authorization: `Bearer ${TOKEN}`}});
}

async function dropAllDrafts(api: APIRequestContext): Promise<void> {
  const drafts = await (await api.get('/api/admin/storefront/drafts')).json();
  for (const row of drafts as {kind: keyof typeof DRAFT_PATH; id: string}[]) {
    await api.delete(`/api/admin/storefront/${DRAFT_PATH[row.kind]}/${row.id}/draft`);
  }
}

async function heroId(api: APIRequestContext): Promise<string> {
  const preview = await (await api.get('/api/admin/storefront/preview')).json();
  return String(preview.sections.find((s: {layout: string}) => s.layout === 'hero').id);
}

// Против фикстуры черновик уже лежит в STOREFRONT_DRAFT_FIXTURE. Против живого
// API его надо завести самим — иначе спека проверяла бы «черновик виден» на
// витрине, где черновика нет, и зелёное ничего не значило бы.
test.beforeEach(async () => {
  if (!API) return;
  const api = await adminApi();
  await dropAllDrafts(api);
  await api.put(`/api/admin/storefront/sections/${await heroId(api)}`, {data: {headlineRu: 'Черновик\nзаголовка'}});
  await api.dispose();
});

test.afterEach(async () => {
  if (!API) return;
  const api = await adminApi();
  await dropAllDrafts(api);
  await api.dispose();
});

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

// Правка, которая доезжает до покупателя. Требует живого API: она меняет базу.
// Шаг 6 плана просил именно это — vitest с замоканным apiFetch доказывает, что
// редактор шлёт правильный запрос, но не то, что после публикации изменился
// публичный ответ.
test.describe('правка доезжает до витрины', () => {
  test.skip(!API, 'нужен живой API (E2E_API_PROXY): правка и публикация меняют базу');

  test('правка → черновик → предпросмотр → публикация → покупатель', async ({page, browser}) => {
    const api = await adminApi();
    await dropAllDrafts(api); // чтобы в списке публикации была ровно одна строка

    await asOwner(page);
    await page.goto('/ru?edit=1');
    await page.getByRole('button', {name: 'Герой'}).click();
    const panel = page.getByRole('complementary', {name: 'Правка витрины'});
    const headline = panel.getByRole('textbox', {name: 'Заголовок · ru', exact: true});

    const published = await headline.inputValue();
    const edited = `Правка e2e ${Date.now()}`;
    try {
      await headline.fill(edited);
      await panel.getByRole('button', {name: /Сохранить в черновик/i}).click();

      // 1. Предпросмотр владельца показывает правку.
      // Через перезагрузку, а не через router.refresh: перерисовка на месте
      // работает (её держит юнит-тест «refresh после сохранения»), но в
      // dev-режиме сервер собирает страницу заново и время этого непредсказуемо
      // — сторож на таком ожидании врал бы через раз. Проверяем то, что
      // действительно важно: что правка ЛЕЖИТ НА СЕРВЕРЕ и предпросмотр её отдаёт.
      await page.reload();
      await expect(page.locator('h1')).toContainText(edited, {timeout: 20_000});

      // 2. Покупатель — нет. Своя сессия, без cookie владельца.
      const guest = await browser.newContext();
      const guestPage = await guest.newPage();
      await guestPage.goto('/ru');
      await expect(guestPage.locator('body')).not.toContainText(edited);

      // 3. Публикация. Панель после перезагрузки закрыта — открываем заново.
      await page.getByRole('button', {name: 'Герой'}).click();
      await expect(panel.getByText('headlineRu')).toBeVisible();
      await panel.getByRole('button', {name: 'Опубликовать'}).click();
      await expect(panel.getByText(/Неопубликованных правок нет/)).toBeVisible({timeout: 25_000});

      // 4. Теперь это видит и покупатель.
      await guestPage.reload();
      await expect(guestPage.locator('h1')).toContainText(edited, {timeout: 25_000});
      await guest.close();
    } finally {
      // Возвращаем витрину в исходное состояние тем же путём, которым правили.
      const hero = await heroId(api);
      await api.put(`/api/admin/storefront/sections/${hero}`, {data: {headlineRu: published}});
      await api.post(`/api/admin/storefront/sections/${hero}/publish`);
      await api.dispose();
    }
  });

});
