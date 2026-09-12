import {test, expect, request, type APIRequestContext, type Page} from '@playwright/test';
import {copy} from '../fixtures/messages';

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
const EDIT_LABEL = copy('editModeSwitch', 'label');

// Живой путь удаляет черновики и правит витрину — гонять его можно только по
// сговору с самой базой (assertTestDatabase ниже) и только последовательно:
// параллельные воркеры делят один и тот же черновик hero-секции между собой,
// и afterEach одного теста сносил бы черновик, на который ещё смотрит другой.
// Это касается ВСЕХ трёх describe-блоков файла разом, а не только последнего:
// общий beforeEach/afterEach заводит и убирает этот черновик для каждого
// теста файла, как только задан E2E_API_PROXY.
if (API) {
  test.describe.configure({mode: 'serial'});
}

// ---------------------------------------------------------------- сторож живого API
//
// Три независимых слоя, по убыванию значимости. Ни один не заменяет другой.

// Слой 1 (главный, структурный). База обязана НАЗВАТЬ СЕБЯ тестовой сама —
// строкой, которую эта спека физически не может завести.
//
// storefront_sections.status допускает 'draft' — по V31 это «новый блок, не
// правка». StorefrontAdminService ни разу не зовёт setStatus(...): PUT/publish/
// discard трогают только JSONB-колонку draft, а создать НОВУЮ секцию через API
// вообще нельзя — такой ручки нет. Значит status='draft' у конкретного slug —
// факт, который эта спека (и вообще API) не умеет производить, только читать.
// Есть он — база тестовая. Нет — падаем с инструкцией, а не гадаем и не skip'аем:
// тихий skip на живом пути так же опасен, как и удаление начужую.
//
// layout вынужденно 'sets-teaser' (CHECK-констрейнт V29 разрешает только
// 'hero'/'sets-teaser'), sort_order — заведомо больше настоящего: страница
// берёт секцию по layout через `.find()` (см. app/[locale]/page.tsx), первое
// совпадение побеждает, и настоящая секция обязана оказаться первой.
const CANARY_SLUG = 'e2e-canary';

async function assertTestDatabase(api: APIRequestContext): Promise<void> {
  const preview = await (await api.get('/api/admin/storefront/preview')).json();
  const sections = preview.sections as {slug: string; status: string}[];
  const canary = sections.find((s) => s.slug === CANARY_SLUG);
  if (canary?.status === 'draft') return;

  throw new Error(
    `Живой прогон (E2E_API_PROXY=${API}) против базы, которая не назвала себя тестовой: ` +
      `в /api/admin/storefront/preview нет секции slug="${CANARY_SLUG}" со status='draft'. ` +
      'Эта метка не создаётся кодом — заведите её один раз в дев-базе (НЕ в проде) и повторите прогон:\n' +
      `  INSERT INTO storefront_sections (slug, layout, status, name_ru, name_en, sort_order)\n` +
      `  VALUES ('${CANARY_SLUG}', 'sets-teaser', 'draft', 'E2E CANARY', 'E2E CANARY', 999);`,
  );
}

// Слой 2. Независим от слоя 1: даже с канарейкой на месте спека убирает
// только то, что завела сама. Чужой черновик, найденный до старта, — повод
// упасть с объяснением, а не подчистить его как «мусор».
async function assertNoForeignDrafts(api: APIRequestContext): Promise<void> {
  const drafts = (await (await api.get('/api/admin/storefront/drafts')).json()) as
    {kind: string; key: string}[];
  if (drafts.length === 0) return;
  throw new Error(
    'На базе уже есть чужие черновики — эта спека не подчищает чужое, а падает: ' +
      drafts.map((d) => `${d.kind}:${d.key}`).join(', '),
  );
}

// Слой 3 (дешёвый, ВСПОМОГАТЕЛЬНЫЙ). НЕ главная защита: "localhost" может
// обмануть — например, ssh-туннель слушает на 127.0.0.1, а ведёт на прод.
// Отсекает опечатки и явно чужие адреса бесплатно, до единого сетевого
// запроса. Настоящая защита — assertTestDatabase выше, которая спрашивает
// саму базу, а не адрес.
function assertLoopbackHost(rawUrl: string): void {
  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname;
  } catch {
    throw new Error(`E2E_API_PROXY="${rawUrl}" — не похоже на URL. Ожидается http://localhost:<порт>.`);
  }
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    throw new Error(
      `E2E_API_PROXY указывает на "${hostname}", а не на localhost/127.0.0.1 (адрес: ${rawUrl}). ` +
        'Живой прогон удаляет черновики и правит витрину — гонять его можно только против локального API.',
    );
  }
}

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

function adminApi(): Promise<APIRequestContext> {
  return request.newContext({baseURL: API, extraHTTPHeaders: {Authorization: `Bearer ${TOKEN}`}});
}

async function heroId(api: APIRequestContext): Promise<string> {
  const preview = await (await api.get('/api/admin/storefront/preview')).json();
  return String(preview.sections.find((s: {layout: string}) => s.layout === 'hero').id);
}

// Черновик, который заводит и за которым убирает эта спека — и только он.
let ourDraftSectionId: string | null = null;

// Против фикстуры черновик уже лежит в STOREFRONT_DRAFT_FIXTURE. Против живого
// API его надо завести самим — иначе спека проверяла бы «черновик виден» на
// витрине, где черновика нет, и зелёное ничего не значило бы.
test.beforeEach(async () => {
  if (!API) return;
  assertLoopbackHost(API);
  const api = await adminApi();
  await assertTestDatabase(api);
  await assertNoForeignDrafts(api);
  const hero = await heroId(api);
  await api.put(`/api/admin/storefront/sections/${hero}`, {data: {headlineRu: 'Черновик\nзаголовка'}});
  ourDraftSectionId = hero;
  await api.dispose();
});

test.afterEach(async () => {
  if (!API || !ourDraftSectionId) return;
  const api = await adminApi();
  // discard — идемпотентен: если тест сам опубликовал и очистил черновик
  // (см. "правка доезжает до витрины"), второй discard просто вернёт
  // опубликованное состояние без ошибки.
  await api.delete(`/api/admin/storefront/sections/${ourDraftSectionId}/draft`);
  ourDraftSectionId = null;
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

  // Вход больше не в шапке (см. e2e/tests/12-edit-switch.spec.ts — шапка
  // одинакова у всех) — владелец включает режим выключателем в аккаунте,
  // кука едет с ним на следующую страницу.
  test('владелец включает режим в аккаунте и видит черновик на витрине', async ({page}) => {
    await asOwner(page);
    await page.goto('/ru/account');

    const toggle = page.getByRole('switch', {name: EDIT_LABEL});
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');

    await page.goto('/ru');

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
    const hero = await heroId(api);

    // Общий beforeEach уже завёл на этой секции свой черновик ('Черновик\nзаголовка') —
    // он нужен ДРУГИМ тестам файла (проверить, что владелец его видит), а этому мешает:
    // панель редактора показывает черновик поверх опубликованного, и не сбрось его здесь,
    // `headline.inputValue()` прочитал бы ЧЕРНОВИК как «опубликованное», а `finally` ниже
    // навсегда переносил бы этот черновик в колонки вместо настоящего исходного текста —
    // витрина осталась бы с заголовком «Черновик заголовка» уже для настоящих покупателей.
    await api.delete(`/api/admin/storefront/sections/${hero}/draft`);

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
      await api.put(`/api/admin/storefront/sections/${hero}`, {data: {headlineRu: published}});
      await api.post(`/api/admin/storefront/sections/${hero}/publish`);
      await api.dispose();
    }
  });

});
