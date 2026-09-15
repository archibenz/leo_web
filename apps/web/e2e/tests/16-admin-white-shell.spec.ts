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
}

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
test.describe('админка — мобильная навигация сворачивается (task-admin-white-brief.md, п.1)', () => {
  const ТУМБЛЕР = 'Свернуть навигацию';

  test('390px: заголовок дашборда виден без прокрутки, панель свёрнута и разворачивается по нажатию', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await asOwner(page);
    await mockDashboardApi(page);
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    const heading = page.getByRole('heading', {level: 1, name: 'Дашборд'});
    await expect(heading).toBeVisible();
    const box = await heading.boundingBox();
    expect(box?.y ?? Infinity, 'заголовок дашборда должен попадать в первый экран 390×844').toBeLessThan(844);

    // Панель свёрнута — пункт «Товары» на экране не найти.
    await expect(page.getByRole('link', {name: 'Товары', exact: true})).toHaveCount(0);

    await page.getByRole('button', {name: ТУМБЛЕР, exact: true}).click();
    await expect(page.getByRole('link', {name: 'Товары', exact: true})).toBeVisible();

    // И убирается обратно: панель выдвижная, закрывается Esc.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('link', {name: 'Товары', exact: true})).toBeHidden();
  });

  test('зоны нажатия в оболочке — не меньше 44px, и это про ВСЕ её кнопки', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await asOwner(page);
    await mockDashboardApi(page);
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    // Ждём ПОСЛЕДСТВИЯ, а не времени: оболочка админки монтируется на клиенте
    // после того, как AuthProvider сходит за ролью, и обход по <header> до
    // этого момента находит пустоту. Первая же попытка так и сделала — и
    // сообщила «шапки нет вовсе» вместо тихого зелёного: ради этого в обходе
    // и стоит отдельная ветка на отсутствие шапки.
    await expect(page.getByRole('button', {name: ТУМБЛЕР, exact: true})).toBeVisible();

    // Сначала шапка: тумблер и всё, что рядом с ним. Проверка по всем видимым
    // кнопкам, а не по одной названной — кнопка в 32 px приехала сюда именно
    // потому, что её никто не называл поимённо.
    const мелкие = await page.evaluate(() => {
      const header = document.querySelector('header');
      if (!header) return ['шапки нет вовсе'];
      return Array.from(header.querySelectorAll('button, a[href]')).flatMap((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return [];
        if (r.height >= 44) return [];
        const имя = (el.getAttribute('aria-label') || (el as HTMLElement).innerText || '').trim().slice(0, 40);
        return [`${имя || el.tagName.toLowerCase()} — ${Math.round(r.height)}px`];
      });
    });
    expect(мелкие, 'владелец правит с телефона: промах по кнопке он читает как «не работает»').toEqual([]);

    // Потом сама навигация.
    await page.getByRole('button', {name: ТУМБЛЕР, exact: true}).click();
    const productsLink = page.getByRole('link', {name: 'Товары', exact: true});
    await expect(productsLink).toBeVisible();
    const linkBox = await productsLink.boundingBox();
    expect(linkBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test('навигация по разделу действительно переходит — клик по "Товары" меняет адрес', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await asOwner(page);
    await mockDashboardApi(page);
    await page.route('**/api/admin/products', (route) =>
      route.fulfill({status: 200, contentType: 'application/json', body: '[]'}));
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    await page.getByRole('button', {name: ТУМБЛЕР, exact: true}).click();
    await page.getByRole('link', {name: 'Товары', exact: true}).click();
    await expect(page).toHaveURL(/\/ru\/admin\/products/);
  });

  test('на десктопе список разделов открыт постоянной колонкой', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await asOwner(page);
    await mockDashboardApi(page);
    await page.goto('/ru/admin', {waitUntil: 'domcontentloaded'});

    // Пункт навигации виден сразу, без клика. Утверждения «тумблера нет» тут
    // больше нет: в нынешней оболочке он остаётся и на десктопе — сворачивает
    // колонку до значков. Это её устройство, а не недосмотр.
    await expect(page.getByRole('link', {name: 'Товары', exact: true})).toBeVisible();
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
