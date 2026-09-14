import {test, expect, type Page} from '@playwright/test';
import {acknowledgeCookies, openSettledForOwner, instantScrollTo} from '../fixtures/white';

// task-route-groups-brief.md — оболочки витрины и админки разведены по
// группам маршрутов (app/[locale]/(shop)/layout.tsx,
// app/[locale]/(admin)/layout.tsx). Раньше их выбирал общий
// app/[locale]/layout.tsx по заголовку x-pathname, и App Router не
// перерендеривал его при клиентском переходе внутри [locale] — ветка,
// выбранная на первой загрузке, держалась всю сессию. «Назад на сайт» из
// админки оставляло витрину на тёмном фоне градиентной темы.
//
// Проверка «адрес ведёт куда надо» тут ничего не доказывает — адрес и
// раньше был верным (это уже проверяет 12-edit-switch.spec.ts), ломался
// фон. Поэтому обе проверки ниже — про клиентский переход конкретно (клик
// по ссылке, не page.goto) и про то, что реально нарисовано на экране.
//
// Пиксель, а не только getComputedStyle: 16-admin-white-shell.spec.ts
// («дашборд стоит на белой подложке») читает background-color ближайшего
// непрозрачного предка и проходит, даже когда экран серый — потому что
// поверх содержимого рисуются фиксированные body::before (зерно,
// mix-blend-mode: multiply) и body::after (виньетка), которых
// getComputedStyle(el) не видит вообще: это отдельные слои, а не свойство
// элемента. Здесь — два независимых доказательства: (1) у обоих
// псевдоэлементов content: none, то есть слоёв нет структурно, и (2)
// реальный пиксель со снятого скриншота, раскодированного через canvas —
// то же самое, что видит глаз, а не то, что думает getComputedStyle.

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

async function asOwner(page: Page): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
  // rl_session — то же самое право, тот же приём, что в
  // 16-admin-white-shell.spec.ts и 12-edit-switch.spec.ts: middleware.ts
  // держит edge-guard на /admin/* и без куки редиректит на /account ещё на
  // сервере, до React.
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
}

async function mockDashboardApi(page: Page): Promise<void> {
  await page.route('**/api/admin/dashboard', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(ZERO_DASHBOARD)}));
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
}

// Снимает реальный скриншот и читает пиксель через canvas — в обход
// getComputedStyle, который не видит слоёв, нарисованных поверх (см. шапку
// файла).
async function readPixel(page: Page, x: number, y: number): Promise<string> {
  const buf = await page.screenshot();
  const b64 = buf.toString('base64');
  return page.evaluate(
    async ({b64, x, y}) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(x, y, 1, 1).data;
      return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
    },
    {b64, x, y},
  );
}

async function bodyOverlayContent(page: Page): Promise<{before: string; after: string}> {
  return page.evaluate(() => ({
    before: getComputedStyle(document.body, '::before').content,
    after: getComputedStyle(document.body, '::after').content,
  }));
}

test.describe('оболочки по группам маршрутов — переход не красит фон в тёмный (task-route-groups-brief.md)', () => {
  test('возврат из админки клиентским переходом: витрина белая, а не серая под накладками', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await acknowledgeCookies(page);
    await asOwner(page);
    await mockDashboardApi(page);

    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});
    await expect(page.getByRole('heading', {level: 1, name: 'Дашборд'})).toBeVisible();

    // Клиентский переход — предмет проверки, не page.goto. Локатор
    // осознанно ограничен #admin-nav: «Вернуться на сайт» существует в
    // AdminLayout.tsx двумя копиями (мобильная шапка + десктопный
    // сайдбар), у обеих одно и то же имя роли, и на 1440px десктопная
    // всегда видна через lg:block (AdminLayout.tsx это явно
    // комментирует) — без scope getByRole увидит оба совпадения и
    // Playwright откажется кликать по неоднозначности.
    await page.locator('#admin-nav').getByRole('link', {name: 'Вернуться на сайт'}).click();
    await page.waitForSelector('.wv-root');

    await expect(page.locator('.wv-root')).toHaveCount(1);

    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bodyBg).toBe('rgb(255, 255, 255)');

    // Структурное доказательство, что слоёв нет вообще (не просто «выключены
    // под .wv-root»): у обоих псевдоэлементов content: none.
    const {before, after} = await bodyOverlayContent(page);
    expect(before).toBe('none');
    expect(after).toBe('none');

    // И сам пиксель — наблюдаемое следствие, не расчёт. Точка ниже героя,
    // внутри пустой части товарной сетки (grid-контейнер без собственного
    // фона — background: transparent), значит цвет там — то, что реально
    // нарисовано ПОД ней: тело документа или его псевдоэлементы. Центр
    // первого экрана для этой проверки не годится — там фотография, а не
    // сплошной цвет, сравнивать её с конкретным rgb() бессмысленно.
    await instantScrollTo(page, 900);
    const pixel = await readPixel(page, 1200, 200);
    expect(pixel).toBe('rgb(255, 255, 255)');
  });

  test('симметричный переход: с витрины в админку ссылкой — шапки и подвала витрины на экране нет', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await asOwner(page);
    await mockDashboardApi(page);

    // /ru/account — единственное место в оболочке витрины, откуда владелец
    // вообще может дотянуться до /admin ссылкой (AdminPanelLink.tsx, рядом
    // с выключателем режима правки); ни в WhiteHeaderActions, ни в
    // WhiteFooter такой ссылки нет. openSettledForOwner ждёт ответ
    // /api/auth/me и снимает баннер cookie — без этого isAdmin
    // (useEditorSession) ещё не решён асинхронным эффектом, и ссылки в DOM
    // физически нет (см. комментарий openSettledForOwner в fixtures/white.ts).
    await openSettledForOwner(page, '/ru/account');
    await expect(page.locator('.wv-root')).toHaveCount(1);

    // Честно про механизм: AdminPanelLink.tsx рендерит обычный <a>, не
    // next/link — проверено маркером на window, переживающим только SPA-
    // переход: клик сюда всегда даёт полную перезагрузку документа. Полная
    // перезагрузка не может воспроизвести дефект из task-route-groups-
    // brief.md (общий layout, не размонтированный при клиентском переходе)
    // — она всегда рендерит с нуля правильную ветку, потому и не годится
    // как единственное доказательство «симметричного случая» из брифа.
    // Мутационный прогон это подтвердил: под возвращённым дефектом этот
    // кейс остаётся зелёным, а первый (клиентский «Назад на сайт») —
    // краснеет. Проверка всё равно осмысленна сама по себе (структура
    // страницы админки не должна тащить шапку/подвал витрины ни при каком
    // способе перехода), просто не она несёт мутационное доказательство —
    // это первый тест. Заменить <a> на <Link>, чтобы и этот переход стал
    // клиентским, — решение за пределами этой задачи (task-route-groups-
    // brief.md про AdminPanelLink.tsx не говорит), см. отчёт.
    await page.locator('a[href="/ru/admin"]').click();
    await page.waitForURL(/\/ru\/admin$/);
    await expect(page.getByRole('heading', {level: 1, name: 'Дашборд'})).toBeVisible();

    await expect(page.locator('.wv-root')).toHaveCount(0);
    await expect(page.locator('header')).toHaveCount(0);
    await expect(page.locator('footer')).toHaveCount(0);
    await expect(page.locator('.gradient-chrome')).toHaveCount(1);
  });
});
