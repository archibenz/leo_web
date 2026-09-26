import {test, expect, type Page} from '@playwright/test';

// Оболочка и дашборд админки в языке витрины — task-admin-white-brief.md.
// Живого apps/api в этом прогоне нет (дев-сервер поднимает только веб), а
// приёмке нужны конкретные цифры (0 заказов, 0 выручки) — мокаем ручки
// админки тем же приёмом, каким 12-edit-switch.spec.ts и
// 15-admin-media.spec.ts подделывают /api/auth/me и storefront-ручки:
// page.route, а не запуск бэкенда.

async function asOwner(page: Page): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
  // rl_session — то, что даёт ПРАВО на /admin: middleware.ts держит edge-guard
  // (ADMIN_PATH + !cookies.has('rl_session') → редирект на /account ДО того,
  // как страница вообще отрендерится), см. middleware.ts:214-222. Без этой
  // куки запрос никогда не доходит до AdminGuard/React — тот же приём, что
  // grantSession() в 12-edit-switch.spec.ts и asOwner() в 15-admin-media.spec.ts.
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
}

const ZERO_DASHBOARD = {
  totalProducts: 4,
  totalCollections: 2,
  lowStockCount: 0,
  outOfStockCount: 0,
  totalAlerts: 0,
  totalUsers: 3,
  totalOrders: 0,
  totalRevenue: 0,
  newUsers7d: 0,
  newOrders7d: 0,
  revenue7d: 0,
  totalBotVisits: 0,
  botVisits7d: 0,
  uniqueBotUsers7d: 0,
};

async function mockDashboardApi(page: Page, overrides: Partial<typeof ZERO_DASHBOARD> = {}): Promise<void> {
  const dashboard = {...ZERO_DASHBOARD, ...overrides};
  await page.route('**/api/admin/dashboard', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(dashboard)}));
  await page.route('**/api/admin/alerts', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: '[]'}));
  await page.route('**/api/admin/orders/recent', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: '[]'}));
  await page.route('**/api/admin/stats/registrations**', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: '[]'}));
  await page.route('**/api/admin/stats/bot-visits**', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: '[]'}));
  await page.route('**/api/admin/stats/top-products**', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: '[]'}));
  // Карточка посещений с данными, а не пустая: иначе проверки палитры и ширины
  // ниже видели бы только строку ошибки и ничего не говорили о самой карточке.
  // Семёрки в числах нет нарочно — соседний кейс ищет «7» точным текстом.
  await page.route('**/api/admin/stats/site-daily**', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(SITE_DAYS)}));
  await page.route('**/api/admin/stats/site-paths**', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(SITE_PATHS)}));
}

const SITE_DAYS = [
  {date: '2026-09-22', pageViews: 12, sessions: 5, productViews: 4, marketplaceClicks: 2, addToCart: 1, addToFavourite: 2, signups: 0,
    byDevice: {phone: 9, desktop: 3}, byLocale: {ru: 12}, byMarketplace: {wildberries: 1, ozon: 1}},
  {date: '2026-09-23', pageViews: 0, sessions: 0, productViews: 0, marketplaceClicks: 0, addToCart: 0, addToFavourite: 0, signups: 0,
    byDevice: {}, byLocale: {}, byMarketplace: {}},
  {date: '2026-09-24', pageViews: 9, sessions: 4, productViews: 2, marketplaceClicks: 1, addToCart: 0, addToFavourite: 1, signups: 0,
    byDevice: {phone: 6, desktop: 3}, byLocale: {ru: 8, en: 1}, byMarketplace: {wildberries: 1}},
];

const SITE_PATHS = [
  {path: '/ru', views: 11},
  {path: '/ru/products/linen-shirt-with-a-rather-long-slug-for-the-phone-screen', views: 5},
];

// ПЕРЕПИСАНО 15.09 ПОД НЫНЕШНЮЮ ОБОЛОЧКУ. Прежние кейсы описывали механику,
// которой больше нет: список разделов «сворачивался» прямо в потоке страницы, и
// тумблером служила единственная на экране кнопка с aria-expanded. Оболочка
// Efferd заменила это выдвижной панелью: раскрывает её CustomSidebarTrigger, у
// которого aria-expanded нет вовсе.
//
// Поэтому `getByRole('button', {expanded: false})` начал ловить ЧУЖУЮ кнопку —
// меню «Мой аккаунт» в шапке, 32 px. Спека краснела верно (32 < 44), но
// говорила не о том элементе, о котором думала. Сузить её мало: узкая спека
// перестала бы замечать ту самую кнопку в 32 px, ради которой краснела.
// Поэтому ниже ДВА разных утверждения: про сам тумблер — точечное, про порог
// 44 px — по ВСЕМ видимым управляющим элементам оболочки, чтобы третья такая
// кнопка не пряталась за узостью проверки.
test.describe('админка — навигация (task-admin-white-brief.md, п.1)', () => {
  // С 26.09 меню общее с аналитикой: «Товары» есть и у WB, и у сайта. Товары
  // сайта — по адресу, иначе строгий режим Playwright не знает, какую взять.
  const SITE_PRODUCTS = 'a[href="/ru/admin/products"]';

  // Три случая про шторку на телефоне (390px) сняты 26.09: админка теперь
  // только для ПК, уже 1024 px вместо неё заглушка — её сторожит
  // 24-admin-desktop-only.spec.ts. Проверять навигацию, которой владелец на
  // телефоне больше не увидит, — значит держать зелёным то, чего нет.

  test('на десктопе список разделов открыт постоянной колонкой', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await asOwner(page);
    await mockDashboardApi(page);
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    // Пункт навигации виден сразу, без клика. Утверждения «тумблера нет» тут
    // больше нет: в нынешней оболочке он остаётся и на десктопе — сворачивает
    // колонку до значков. Это её устройство, а не недосмотр.
    await expect(page.locator(SITE_PRODUCTS)).toBeVisible();
  });
});

test.describe('админка — нули не выглядят поломкой (task-admin-white-brief.md, п.2)', () => {
  test('нули сопровождаются причиной, а не голым «0 ₽»', async ({page}) => {
    await asOwner(page);
    await mockDashboardApi(page);
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    await expect(page.getByText('Заказов пока нет — приём оплаты не включён')).toBeVisible();
    await expect(page.getByText('Выручки пока нет — приём оплаты не включён')).toBeVisible();
    await expect(page.getByText('0 ₽', {exact: true})).toHaveCount(0);
  });

  test('когда цифры есть — показываются цифры, а не причина (ноль и наличие данных различимы)', async ({page}) => {
    await asOwner(page);
    await mockDashboardApi(page, {totalOrders: 7, totalRevenue: 84000});
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    await expect(page.getByText('Заказов пока нет', {exact: false})).toHaveCount(0);
    await expect(page.getByText('Выручки пока нет', {exact: false})).toHaveCount(0);
    await expect(page.getByText('7', {exact: true}).first()).toBeVisible();
  });
});

test.describe('админка — язык витрины, не градиент (task-admin-white-brief.md, приёмка)', () => {
  test('оболочка и дашборд не красят ничего золотым цветом градиентной темы', async ({page}) => {
    await asOwner(page);
    await mockDashboardApi(page);
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});
    await expect(page.getByRole('heading', {level: 1, name: 'Дашборд'})).toBeVisible();

    const GOLD = 'rgb(212, 165, 116)'; // #D4A574 — var(--accent) градиентной темы
    const paintedGold = await page.evaluate((gold) => {
      const all = document.querySelectorAll('body *');
      for (const el of Array.from(all)) {
        const cs = getComputedStyle(el);
        if (cs.color === gold || cs.backgroundColor === gold || cs.borderColor === gold) return true;
      }
      return false;
    }, GOLD);
    expect(paintedGold).toBe(false);
  });

  // Он зашёл с телефона и увидел «тёмный экран с золотыми подписями» — если
  // это исправлено, дашборд обязан стоять на белой, а не тёмной ambient-
  // подложке body (см. комментарии в AdminLayout.tsx/page.tsx про отсутствие
  // фона на <main> и отрицательные отступы дашборда).
  test('дашборд стоит на белой подложке, а не на тёмном фоне градиентной темы', async ({page}) => {
    await asOwner(page);
    await mockDashboardApi(page);
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});
    const heading = page.getByRole('heading', {level: 1, name: 'Дашборд'});
    await expect(heading).toBeVisible();

    const bg = await heading.evaluate((el) => {
      let node: Element | null = el;
      while (node) {
        const color = getComputedStyle(node).backgroundColor;
        if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
        node = node.parentElement;
      }
      return null;
    });
    expect(bg).toBe('rgb(255, 255, 255)');
  });
});

test.describe('админка — карточка посещений сайта', () => {
  // Была 390px; с 26.09 админка только для ПК, и самая узкая её ширина —
  // 1024. Сторож тот же: длинный адрес не уезжает за край карточки.
  test('1024px: итоги видны, длинный адрес страницы не вылезает за карточку', async ({page}) => {
    await page.setViewportSize({width: 1024, height: 768});
    await asOwner(page);
    await mockDashboardApi(page);
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    const card = page.locator('section', {has: page.getByRole('heading', {name: 'Посещения сайта за 30 дней'})});
    // 21 стоит дважды — в ячейке итога и в сумме под графиком; обе верны.
    await expect(card.getByText('21', {exact: true})).toHaveCount(2);
    await expect(card.getByText('только согласившиеся на cookie')).toBeVisible();
    await expect(page.getByText('Посещения не загрузились', {exact: false})).toHaveCount(0);
    const longPath = page.getByText('/ru/products/linen-shirt-with-a-rather-long-slug-for-the-phone-screen');
    await expect(longPath).toBeVisible();

    // Меряется сама строка, а не прокрутка страницы: панель режет лишнее своим
    // overflow-hidden, и страница вбок не поедет никогда — зато хвост адреса
    // вместе с числом просмотров уедет под край карточки. Проверено мутацией:
    // без truncate в ShareList краснеет эта строка, а прокрутка молчит.
    const box = await longPath.boundingBox();
    const cardBox = await card.boundingBox();
    expect((box?.x ?? 0) + (box?.width ?? Infinity), 'адрес страницы должен помещаться в карточку')
      .toBeLessThanOrEqual((cardBox?.x ?? 0) + (cardBox?.width ?? 0));
  });

  test('ручка посещений упала — остальной дашборд на месте', async ({page}) => {
    await asOwner(page);
    await mockDashboardApi(page);
    await page.route('**/api/admin/stats/site-daily**', (route) => route.fulfill({status: 500, body: ''}));
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    await expect(page.getByText('Посещения не загрузились', {exact: false})).toBeVisible();
    await expect(page.getByText('Заказов пока нет — приём оплаты не включён')).toBeVisible();
  });
});
