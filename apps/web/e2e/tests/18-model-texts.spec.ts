import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';
import {STOREFRONT_FIXTURE} from '../../lib/catalogue/fixture';
import {acknowledgeCookies, openWhite} from '../fixtures/white';
import {skipUnlessFixtureCatalogue} from '../fixtures/catalogue';

// Тексты модели (название, короткое описание, история, состав, уход) правятся
// на странице товара — там же, где покупатель их читает, так же, как цена
// правится у цены (WhitePdpShowcase.tsx). Путь записи (PUT .../models/{id})
// уже доказан бэкенд-тестами (StorefrontAdminControllerTest) и фронтовым
// VariantForm — эта спека проверяет СЛЕДСТВИЕ на самой странице: уходящий
// запрос, состояние свёрнутого раздела, размер зоны нажатия. Не намерение —
// не "кнопка есть", а "запрос с этим телом действительно уходит".

const PRODUCT = STOREFRONT_FIXTURE.products[0]!; // 'palto-pidzhak-pritalennoe' — тот же canary, что у 02/03-спек
const MODEL_URL = `**/api/admin/storefront/models/${PRODUCT.id}`;
const TOKEN = 'fixture-model-texts-token';

const MODEL_RESPONSE = {
  nameRu: PRODUCT.ru,
  nameEn: PRODUCT.en,
  descRu: PRODUCT.descRu,
  descEn: PRODUCT.descEn,
  storyRu: PRODUCT.storyRu ?? null,
  storyEn: PRODUCT.storyEn ?? null,
  compositionRu: PRODUCT.compositionRu,
  compositionEn: PRODUCT.compositionEn,
  careRu: PRODUCT.careRu,
  careEn: PRODUCT.careEn,
};

async function asOwner(page: Page): Promise<void> {
  // /api/auth/** лимитирован 10 запросами в минуту на IP — подменяем на
  // всякий случай, тем же приёмом, что 07-storefront-editor.spec.ts и
  // 12-edit-switch.spec.ts. Сама страница товара сегодня эту ручку не зовёт
  // (EditModeSwitch переехал в /account — см. 12-edit-switch.spec.ts), но
  // дешёвая подстраховка от будущего дрейфа лучше зависимости от этого факта.
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.context().addCookies([{name: 'rl_session', value: TOKEN, domain: 'localhost', path: '/'}]);
  await page.addInitScript((token) => window.localStorage.setItem('reinasleo_token', token), TOKEN);
}

// GET отдаёт карточку — панель её показывает; PUT просто отвечает успехом,
// тело реального запроса читает сам тест (page.waitForRequest), не этот мок.
async function mockModelRoutes(page: Page): Promise<void> {
  await page.route(MODEL_URL, (route) => {
    const method = route.request().method();
    if (method !== 'GET' && method !== 'PUT') return route.fallback();
    return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(MODEL_RESPONSE)});
  });
}

async function openModelTextsPanel(page: Page) {
  await acknowledgeCookies(page);
  await asOwner(page);
  await mockModelRoutes(page);
  await openWhite(page, `/ru/product/${PRODUCT.slug}?edit=1`);

  await page.getByRole('button', {name: 'Название', exact: true}).click();
  const panel = page.getByRole('complementary', {name: 'Правка витрины'});
  // Карточка реально прочиталась (панель не застряла на «читаю карточку…») —
  // без этого следующий шаг просто не нашёл бы поле и упал бы менее внятно.
  await expect(panel.getByRole('textbox', {name: 'Название · ru', exact: true})).toHaveValue(PRODUCT.ru);
  return panel;
}

test.beforeEach(async ({request}) => {
  await skipUnlessFixtureCatalogue(request);
});

test.describe('тексты модели правятся на странице товара', () => {
  test('владелец меняет название и сохраняет — уходит PUT с непустым nameRu', async ({page}) => {
    const panel = await openModelTextsPanel(page);
    const nameField = panel.getByRole('textbox', {name: 'Название · ru', exact: true});
    const NEW_NAME = `Пальто новое ${Date.now()}`;

    await nameField.fill(NEW_NAME);

    const [putRequest] = await Promise.all([
      page.waitForRequest((req) => req.url().includes(`/api/admin/storefront/models/${PRODUCT.id}`) && req.method() === 'PUT'),
      panel.getByRole('button', {name: /Сохранить в черновик/i}).click(),
    ]);

    const body = putRequest.postDataJSON() as Record<string, unknown>;
    // Минимальный патч — то тронутое поле, и ровно оно: пустой патч
    // (мутация из brief'а) не прошёл бы ни одну из проверок ниже.
    expect(Object.keys(body)).toEqual(['nameRu']);
    expect(typeof body.nameRu).toBe('string');
    expect((body.nameRu as string).trim().length).toBeGreaterThan(0);
    expect(body.nameRu).toBe(NEW_NAME);
  });

  test('английский раздел свёрнут по умолчанию и раскрывается по клику', async ({page}) => {
    const panel = await openModelTextsPanel(page);
    const toggle = panel.getByRole('button', {name: /Английские тексты/i});

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // getByRole по умолчанию не видит то, что скрыто нативным hidden —
    // тот же приём, что у гида по размерам на этой же странице.
    await expect(panel.getByRole('textbox', {name: 'Название · en', exact: true})).toHaveCount(0);

    await toggle.click();

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(panel.getByRole('textbox', {name: 'Название · en', exact: true})).toBeVisible();
    await expect(panel.getByRole('textbox', {name: 'Название · en', exact: true})).toHaveValue(PRODUCT.en);
  });

  test('зона нажатия переключателя английского раздела — не меньше 44px', async ({page}) => {
    const panel = await openModelTextsPanel(page);
    const toggle = panel.getByRole('button', {name: /Английские тексты/i});

    const box = await toggle.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
