import {test, expect, type Page} from '@playwright/test';
import {openSettledForOwner} from '../fixtures/white';

// Панель медиа человеческой: кадры вместо адресов, загрузка пачкой, порядок,
// явная обложка, пара «телефон / десктоп» у блока. См.
// .superpowers/sdd/stage2/task-admin-media-brief.md.
//
// CATALOGUE_SOURCE=fixture поднимает страницу вообще без API — а галерея
// варианта живёт СВОЕЙ ручкой (`/api/admin/storefront/models/:id`), которой
// в этом режиме неоткуда взяться. Подделываем её тем же приёмом, каким
// 07/12 подделывают `/api/auth/me`: page.route, а не запуск бэкенда. Пара
// «телефон/десктоп» у блока — наоборот, читает секцию Герой прямо из
// STOREFRONT_DRAFT_FIXTURE безо всякой подмены, тем же путём, которым уже
// год ходят 07 и 12.
//
// Кадры варианта, которые видит тест, — настоящие файлы из public/images:
// приёмка требует не просто верный src в DOM, а картинку, которая правда
// загрузилась (toHaveJSProperty('complete', true)) — иначе «кадр вместо
// адреса» можно подделать одним неверным атрибутом.
//
// Живой круг «сохранил → опубликовал → сервер отдал то же самое» здесь не
// проверяется: он требует канареечной записи в тестовой базе (см. канарейку
// в 07-storefront-editor.spec.ts) и живого apps/api, которых в этом прогоне
// нет. Достаточная уверенность собирается из трёх мест: vitest
// VariantForm.test.tsx (переоткрытие панели читает то же, что уходило в
// PUT), StorefrontMediaCleanupVariantGalleryTest.java (уборка не путает
// «черновик» с «опубликовано») и PUT-тело ниже, отправленное настоящим
// браузером.

const PDP = '/ru/product/palto-pidzhak-pritalennoe';
const HOME = '/ru';
// bagProduct.id / productColors[0] в WhitePdpShowcase.tsx — модель и цвет,
// которые PDP выбирает ПО УМОЛЧАНИЮ, без клика по свотчу.
const MODEL_ID = '4b63e888-bc6b-5fed-b6a8-23237918c205';
const VARIANT_ID = 'wb-795522033';
const VARIANT_COVER = '/images/white/products/p-795522033-grey-Q.jpg';
const VARIANT_GALLERY = [
  '/images/white/products/p-795522033-grey-b-Q.jpg',
  '/images/white/products/p-795522033-grey-d-T.jpg',
] as const;

async function asOwner(page: Page): Promise<void> {
  // /api/auth/** лимитирован на IP, а спеки идут параллельно — тот же приём
  // подмены роли, что в 07-storefront-editor.spec.ts и 12-edit-switch.spec.ts.
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
  // rl_session — то, что даёт ПРАВО (lib/catalogue/viewer.ts); значение не
  // проверяется в фикстурном режиме, важен сам факт куки.
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
}

/** Подмена ЕДИНСТВЕННОЙ ручки, которой не хватает в фикстурном режиме. */
async function mockVariantModel(page: Page): Promise<{puts: Array<{body: unknown}>}> {
  const state = {
    variants: {
      [VARIANT_ID]: {price: 23000, salePrice: null, stockQuantity: 5, image: VARIANT_COVER, gallery: [...VARIANT_GALLERY]},
    },
  };
  const puts: Array<{body: unknown}> = [];
  await page.route(`**/api/admin/storefront/models/${MODEL_ID}`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(state)});
  });
  await page.route(`**/api/admin/storefront/products/${VARIANT_ID}`, (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    puts.push({body});
    Object.assign(state.variants[VARIANT_ID], body);
    return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(state)});
  });
  return {puts};
}

async function openVariantPanel(page: Page) {
  await page.getByRole('button', {name: /^Цвет ·/}).click();
  const panel = page.getByRole('complementary', {name: 'Правка витрины'});
  await expect(panel).toBeVisible();
  return panel;
}

test.describe('панель медиа — галерея варианта', () => {
  test('кадры вместо адресов: обложка и галерея видны картинками, а не строками путей', async ({page}) => {
    await asOwner(page);
    await mockVariantModel(page);
    await openSettledForOwner(page, `${PDP}?edit=1`);

    const panel = await openVariantPanel(page);

    const cover = panel.getByRole('img', {name: 'Кадр 1'});
    await expect(cover).toHaveAttribute('src', VARIANT_COVER);
    await expect(cover).toHaveJSProperty('complete', true); // не просто верный src — реально загрузившийся кадр
    await expect(panel.getByText('Обложка')).toBeVisible();
    await expect(panel.getByRole('img')).toHaveCount(3); // обложка + 2 кадра галереи, ни одного адреса текстом
  });

  test('обложка выбирается явно и переживает перестановку — PUT уходит с правильным телом', async ({page}) => {
    await asOwner(page);
    const {puts} = await mockVariantModel(page);
    await openSettledForOwner(page, `${PDP}?edit=1`);
    const panel = await openVariantPanel(page);

    // Кадр 3 (не первый) становится обложкой — «первый = обложка» тут не должно уже ничего значить.
    await panel.getByRole('button', {name: /Сделать обложкой.*кадр 3/}).click();
    // Кадр 1 (бывший главный снимок, теперь рядовой) уходит вниз.
    await panel.getByRole('button', {name: /^Вниз.*кадр 1/}).click();
    await panel.getByRole('button', {name: /Сохранить в черновик/i}).click();

    await expect.poll(() => puts.length).toBe(1);
    expect(puts[0]!.body).toEqual({
      image: VARIANT_GALLERY[1],
      gallery: [VARIANT_GALLERY[0], VARIANT_COVER],
    });
  });

  test('загрузка нескольких файлов разом — у каждого своя миниатюра', async ({page}) => {
    await asOwner(page);
    await mockVariantModel(page);
    let n = 0;
    await page.route('**/api/admin/upload', (route) => {
      n += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({url: `/images/white/products/p-795522033-grey-b-Q.jpg?u=${n}`}),
      });
    });
    await openSettledForOwner(page, `${PDP}?edit=1`);
    const panel = await openVariantPanel(page);

    await panel.getByLabel(/Добавить кадры/i).setInputFiles([
      {name: 'a.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('a')},
      {name: 'b.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('b')},
    ]);

    // 3 исходных + 2 новых — оба долетели, ни один не потерялся под другим.
    await expect(panel.getByRole('img')).toHaveCount(5, {timeout: 10_000});
  });

  test('перестановка, обложка и удаление — зоны нажатия от 44px на телефоне', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await asOwner(page);
    await mockVariantModel(page);
    await openSettledForOwner(page, `${PDP}?edit=1`);
    const panel = await openVariantPanel(page);

    for (const name of [/Сделать обложкой.*кадр 2/, /^Вверх.*кадр 2/, /^Вниз.*кадр 2/, /Убрать.*кадр 2/]) {
      const box = await panel.getByRole('button', {name}).boundingBox();
      expect(box?.height, `кнопка ${name}`).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('панель медиа — пара телефон/десктоп у блока', () => {
  test('ролик и кадр показывают ОБЕ версии рядом, картинками, подписанными «Телефон»/«Десктоп»', async ({page}) => {
    await asOwner(page);
    await openSettledForOwner(page, `${HOME}?edit=1`);

    await page.getByRole('button', {name: 'Герой'}).click();
    const panel = page.getByRole('complementary', {name: 'Правка витрины'});
    await expect(panel).toBeVisible();

    const phonePoster = panel.getByRole('img', {name: 'Телефон'});
    await expect(phonePoster).toHaveAttribute('src', '/images/white/hero-mark2.jpg');
    await expect(phonePoster).toHaveJSProperty('complete', true);
    await expect(panel.getByRole('img', {name: 'Десктоп'})).toHaveAttribute('src', '/images/white/hero-desktop.jpg');

    // Видео нет ARIA-роли "img" — миниатюра узнаётся по обёртке (title = адрес,
    // «мелко под кадром», см. MediaThumb в EditorFields.tsx).
    await expect(panel.locator('[title="/videos/white/hero-mark2.mp4"]')).toBeVisible();
    await expect(panel.locator('[title="/videos/white/hero-desktop.mp4"]')).toBeVisible();

    // Это ещё и самая тесная раскладка: MediaPairField кладёт «Телефон» и
    // «Десктоп» РЯДОМ (sm:grid-cols-2) на 360px панели — вдвое уже, чем один
    // MediaField. Длинный путь там уже один раз утащил кнопки за пределы
    // видимости (см. правку GalleryField/MediaField на truncate) — здесь
    // проверяем именно эту, самую узкую раскладку, а не только телефонную.
    await expect(panel.getByRole('button', {name: 'Заменить'}).first()).toBeVisible();
  });

  test('«Заменить» пары — зона нажатия от 44px на телефоне', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await asOwner(page);
    await openSettledForOwner(page, `${HOME}?edit=1`);
    await page.getByRole('button', {name: 'Герой'}).click();
    const panel = page.getByRole('complementary', {name: 'Правка витрины'});

    const replaceButtons = panel.getByRole('button', {name: 'Заменить'});
    const count = await replaceButtons.count();
    expect(count).toBeGreaterThanOrEqual(4); // ролик×2 + кадр×2
    for (let i = 0; i < count; i++) {
      const box = await replaceButtons.nth(i).boundingBox();
      expect(box?.height, `«Заменить» #${i}`).toBeGreaterThanOrEqual(44);
    }
  });
});
