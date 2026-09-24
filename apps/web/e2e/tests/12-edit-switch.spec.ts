import {test, expect} from '@playwright/test';
import type {Page, BrowserContext} from '@playwright/test';
import {copy} from '../fixtures/messages';
import {openWhite, acknowledgeCookies, hydrateViaCookieNotice, openSettledForOwner} from '../fixtures/white';

// Вход в режим правки переехал из шапки в аккаунт/админку: «ПРАВИТЬ» не
// существует в шапке ни в каком виде, и шапка обязана выглядеть ОДИНАКОВО
// для покупателя и для владельца с выключенным режимом.
//
// Два кейса ниже проверяют РАЗНЫЕ области, а не разными словами одно и то
// же: кейс «шапка» смотрит только внутрь <header> (состав и фон), кейс
// «страница» — только внутрь #wv-page (WhiteChrome.tsx), то есть везде,
// КРОМЕ шапки и подвала. Если бы оба читали весь документ, одна и та же
// мутация красила бы оба — и один из двух ничего не доказывал бы, будучи
// лишним. Так мутация «вернуть кнопку в шапку» красит ровно кейс про шапку.

const HOME = '/ru';
const ACCOUNT = '/ru/account';
const EDIT_LABEL = copy('editModeSwitch', 'label');
const ADMIN_LINK_LABEL = copy('editModeSwitch', 'adminLink');
const DRAFT_BAR = 'Режим правки · страница показывает черновик';

async function mockOwnerRole(page: Page) {
  // /api/auth/** лимитирован 10 запросами в минуту на IP, а спеки идут
  // параллельно с одного адреса — тот же приём, что в
  // 07-storefront-editor.spec.ts. Проверяем не роль, а поведение куки и шапки.
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
}

// rl_session — то, что даёт ПРАВО (см. lib/catalogue/viewer.ts). Против
// CATALOGUE_SOURCE=fixture бэкенд не поднят: getStorefrontPreview в
// фикстурном режиме всегда отдаёт черновик, так что для доказательства входа
// в режим достаточно, чтобы сервер увидел саму куку — её значение он не
// проверяет, это дело живого API.
async function grantSession(context: BrowserContext) {
  await context.addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
}

async function asOwner(page: Page) {
  await mockOwnerRole(page);
  await grantSession(page.context());
}

async function open(page: Page, path: string) {
  await acknowledgeCookies(page);
  await openWhite(page, path);
}

// isAdmin (useEditorSession) решается АСИНХРОННО — эффектом, который для
// владельца бьёт в /api/auth/me. До того, как эффект отработал, компонент,
// завязанный на isAdmin (EditModeSwitch), физически не мог ни появиться, ни
// остаться. toHaveCount(0) сразу после навигации — ловушка: count() честно
// возвращает 0 и тогда, когда элемента правда нет, и тогда, когда он просто
// ещё не успел появиться, — а «ещё не успел» это состояние КАЖДОЙ страницы в
// первые миллисекунды после domcontentloaded. На практике так и оказалось:
// временная мутация «вставить <EditModeSwitch /> в шапку» оставляла кейс
// шапки зелёным, хотя выключатель там был, — проверка просто заканчивалась
// раньше, чем эффект успевал сработать.
//
// Ждём не сеть напрямую (у гостя её и не будет: без токена useEditorSession
// вообще не ходит в API — см. useEditorSession.ts), а то, что этот КЛАСС
// эффектов точно отработал. WhiteCookieNotice — тот же характер, рисуется
// только маунт-эффектом (см. hydrateViaCookieNotice в fixtures/white.ts), и
// её появление — уже доказанный в этом кодбейзе способ дождаться, что первый
// круг клиентских эффектов прошёл. Кук заранее не подтверждаем — иначе
// баннер, на который мы опираемся, просто не появится.
async function openSettled(page: Page, path: string): Promise<void> {
  await openWhite(page, path);
  await hydrateViaCookieNotice(page);
}

// openSettledForOwner (тот же приём + точный сетевой признак /api/auth/me
// для владельца) — в fixtures/white.ts: понадобился трём спекам сразу
// (ticker-usability, admin-media и этому), дублировать не стал.

// Отпечаток шапки: видимый текст (без пробельного мусора) плюс фон — тот же
// приём сравнения backgroundColor, что и в 11-tg-landing.spec.ts, усиленный
// textContent, чтобы ловить любую лишнюю кнопку, а не только именно эту.
async function headerFingerprint(page: Page) {
  const header = page.locator('header').first();
  await expect(header).toBeVisible();
  return header.evaluate((el) => ({
    text: el.textContent?.replace(/\s+/g, ' ').trim(),
    background: getComputedStyle(el).backgroundColor,
  }));
}

async function assertHeaderHasNoEditEntry(page: Page) {
  const header = page.locator('header').first();
  await expect(header.getByRole('switch')).toHaveCount(0);
  await expect(header.getByRole('link', {name: /Прав/})).toHaveCount(0);
  await expect(header.locator('[aria-pressed]')).toHaveCount(0);
}

// Поверхность правки: полоса режима, рамки правимых блоков (EditableBlock.tsx
// рисует их пунктиром — см. style="border: 1px dashed ...") и само слово
// «черновик» (STOREFRONT_DRAFT_FIXTURE прячет его в hero). Область — #wv-page,
// то есть заведомо не шапка и не подвал.
async function assertNoEditSurface(page: Page) {
  const content = page.locator('#wv-page');
  await expect(content.getByText(DRAFT_BAR)).toHaveCount(0);
  await expect(content.getByText(/черновик/i)).toHaveCount(0);
  await expect(content.locator('[style*="dashed"]')).toHaveCount(0);
}

for (const viewport of [
  {width: 390, height: 844},
  {width: 1440, height: 900},
] as const) {
  test(`шапка не содержит входа в режим правки — ни у гостя, ни у владельца (${viewport.width}px)`, async ({page, browser}) => {
    await page.setViewportSize(viewport);
    await openSettled(page, HOME);
    await assertHeaderHasNoEditEntry(page);
    const guestFingerprint = await headerFingerprint(page);

    const ownerContext = await browser.newContext({viewport});
    const ownerPage = await ownerContext.newPage();
    await asOwner(ownerPage);
    await openSettledForOwner(ownerPage, HOME);
    await assertHeaderHasNoEditEntry(ownerPage);
    const ownerFingerprint = await headerFingerprint(ownerPage);

    expect(ownerFingerprint).toEqual(guestFingerprint);
    await ownerContext.close();
  });
}

test('страница вне режима совпадает с покупательской: без полосы, без рамок, без слова «черновик»', async ({page, browser}) => {
  await open(page, HOME);
  await assertNoEditSurface(page);

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await asOwner(ownerPage);
  await open(ownerPage, HOME);
  await assertNoEditSurface(ownerPage);
  await ownerContext.close();
});

test('включил выключатель в аккаунте → перешёл на главную → режим пережил переход', async ({page}) => {
  await asOwner(page);
  await open(page, ACCOUNT);

  // #wv-page, не вся вкладка: этот кейс — про куку с аккаунта, не про шапку,
  // и ему нельзя ломаться, если в шапке однажды появится свой switch (как в
  // мутации координатора) — тогда getByRole('switch') без области честно
  // упал бы в строгом режиме Playwright на двух совпадениях сразу.
  const toggle = page.locator('#wv-page').getByRole('switch', {name: EDIT_LABEL});
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');

  const cookiesOn = await page.context().cookies();
  expect(cookiesOn.find((c) => c.name === 'rl_edit')?.value).toBe('1');

  await open(page, HOME);
  await expect(page.getByText(DRAFT_BAR)).toBeVisible();
  await expect(page.locator('#wv-page').getByText(/черновик/i).first()).toBeVisible();
});

// Владелец не нашёл вход в саму админку: ссылки на /admin не было нигде на
// витрине, попасть можно было только вписав адрес руками (isAdmin у него уже
// работал — тем же днём он включал этот самый выключатель). Отсутствие у
// покупателя проверяется как отсутствие в разметке (toHaveCount(0)), а не
// видимостью — иначе стиль display:none прошёл бы тест, ничего не починив.
test('владелец видит ссылку на /admin рядом с выключателем — у покупателя её нет в разметке вовсе', async ({page, browser}) => {
  await open(page, ACCOUNT);
  await expect(page.locator('#wv-page').getByRole('link', {name: ADMIN_LINK_LABEL})).toHaveCount(0);

  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await asOwner(ownerPage);
  await openSettledForOwner(ownerPage, ACCOUNT);

  // #wv-page — тот же приём area-scoping, что и у соседних кейсов файла.
  const adminLink = ownerPage.locator('#wv-page').getByRole('link', {name: ADMIN_LINK_LABEL});
  await expect(adminLink).toBeVisible();
  await expect(adminLink).toHaveAttribute('href', '/ru/admin');
  await ownerContext.close();
});

test('«Закончить правку» снимает куку — следующая страница уже обычная', async ({page}) => {
  await asOwner(page);
  await open(page, ACCOUNT);
  // #wv-page — см. комментарий у предыдущего теста.
  await page.locator('#wv-page').getByRole('switch', {name: EDIT_LABEL}).click();

  await open(page, HOME);
  await expect(page.getByText(DRAFT_BAR)).toBeVisible(); // подтверждаем, что было включено — иначе клик ниже ничего не доказывает

  await page.getByRole('link', {name: 'Закончить правку'}).click();

  const cookiesAfter = await page.context().cookies();
  expect(cookiesAfter.find((c) => c.name === 'rl_edit')).toBeUndefined();

  await open(page, HOME);
  await assertNoEditSurface(page);
});

// Кейс безопасности этапа: кука — это «хочу видеть черновик», не «мне
// можно». rl_session здесь НЕ выдан — сервер про право ничего не знает и не
// должен даже спрашивать ручку предпросмотра (lib/catalogue/viewer.ts).
test('кука есть, прав нет — витрина публичная, черновика не видно', async ({page}) => {
  await mockOwnerRole(page);
  await page.context().addCookies([{name: 'rl_edit', value: '1', domain: 'localhost', path: '/'}]);

  await open(page, HOME);

  await assertNoEditSurface(page);
});

// Тот же случай, что выше, но с другой стороны: сервер тоже обязан не
// молчать. Раньше баннер «Сервер не признал сессию» видел только вход через
// ?edit=1 (EditorNotice читал wantsEdit из URL-параметра). После переезда
// входа в аккаунт это стал бы САМЫЙ ЧАСТЫЙ путь получить тишину — владелец
// щёлкает выключатель, сессия протухла, сервер честно отдаёт публичную
// страницу и ничего не объясняет; он решит, что сломан выключатель, а не
// сессия. Раз кука тоже намерение (см. lib/catalogue/viewer.ts), баннер
// обязан её видеть — через wantsEdit, который сервер уже посчитал и передал
// вниз (EditorProvider → EditorNotice), а не через document.cookie в браузере.
test('кука стоит, сервер сессию не признал — баннер честности виден, а не тишина', async ({page}) => {
  await mockOwnerRole(page);
  await page.context().addCookies([{name: 'rl_edit', value: '1', domain: 'localhost', path: '/'}]);

  await open(page, HOME);

  // #wv-page, не весь документ: Next добавляет свой собственный
  // role="alert" (__next-route-announcer__) вне этой границы — тот же приём
  // area-scoping, что и в assertNoEditSurface выше.
  await expect(page.locator('#wv-page').getByRole('alert')).toContainText('Сервер не признал сессию');
});


// ПРАВКА — ТОЛЬКО НА КОМПЬЮТЕРЕ (решение владельца 24.09). Проверка по ширине
// через matchMedia (components/editor/useIsDesktop.ts), и здесь она идёт в
// настоящем браузере: юнит-тесты гоняют подделку matchMedia, и зелёные они
// были бы и при подделке, которая врёт так же, как код.
const READONLY_BAR = 'Черновик · править можно с компьютера';

test.describe('правка только на компьютере', () => {
  test('390 px: в аккаунте выключателя нет, ссылка на админку есть', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await asOwner(page);
    await page.context().addCookies([{name: 'rl_edit', value: '1', domain: 'localhost', path: '/'}]);
    await openSettledForOwner(page, ACCOUNT);

    // Ссылка появляется только после того, как роль проверена, — значит,
    // эффекты отработали, и отсутствие выключателя рядом уже не «не успел».
    await expect(page.locator('#wv-page').getByRole('link', {name: ADMIN_LINK_LABEL})).toBeVisible();
    await expect(page.locator('#wv-page').getByRole('switch')).toHaveCount(0);
  });

  test('390 px, кука стоит, сервер отдал черновик — полоса «черновик», инструментов нет', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await asOwner(page);
    await page.context().addCookies([{name: 'rl_edit', value: '1', domain: 'localhost', path: '/'}]);
    await open(page, HOME);

    await expect(page.getByText(READONLY_BAR)).toBeVisible();
    await expect(page.getByText(DRAFT_BAR)).toHaveCount(0);
    await expect(page.getByText(/Режим правки/)).toHaveCount(0);
    await expect(page.locator('#wv-page [data-editable]')).toHaveCount(0);
    await expect(page.locator('#wv-page [style*="dashed"]')).toHaveCount(0);
  });

  test('390 px: «Закончить правку» снимает куку и на телефоне', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await asOwner(page);
    await page.context().addCookies([{name: 'rl_edit', value: '1', domain: 'localhost', path: '/'}]);
    await open(page, HOME);
    await expect(page.getByText(READONLY_BAR)).toBeVisible();

    await page.getByRole('link', {name: 'Закончить правку'}).click();

    await expect.poll(async () => (await page.context().cookies()).find((c) => c.name === 'rl_edit')).toBeUndefined();
  });

  test('1280 px, та же кука — всё как было: полоса режима и рамки правки', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await asOwner(page);
    await page.context().addCookies([{name: 'rl_edit', value: '1', domain: 'localhost', path: '/'}]);
    await open(page, HOME);

    await expect(page.getByText(/Режим правки · /)).toBeVisible();
    await expect(page.locator('#wv-page [data-editable]').first()).toBeVisible();
    await expect(page.getByText(READONLY_BAR)).toHaveCount(0);
  });

  test('окно сузили с 1280 до 390 px — правка выключилась без перезагрузки', async ({page}) => {
    await page.setViewportSize({width: 1280, height: 800});
    await asOwner(page);
    await page.context().addCookies([{name: 'rl_edit', value: '1', domain: 'localhost', path: '/'}]);
    await open(page, HOME);
    await expect(page.locator('#wv-page [data-editable]').first()).toBeVisible();

    await page.setViewportSize({width: 390, height: 844});

    await expect(page.locator('#wv-page [data-editable]')).toHaveCount(0);
    await expect(page.getByText(READONLY_BAR)).toBeVisible();
  });
});
