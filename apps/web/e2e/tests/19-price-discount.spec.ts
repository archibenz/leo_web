import {test, expect, type Page} from '@playwright/test';
import {openSettledForOwner} from '../fixtures/white';

// Скидка процентом вместо суммы (этап 3а, task-price-ui-brief.md). Этап 2 уже
// отучил витрину читать products.sale_price — действующая цена считается из
// price_source/discount_pct на сервере (VariantPriceCalculator). Останься в
// редакторе старое поле «Цена со скидкой, ₽», владелец правил бы скидку там,
// где привык, PUT проходил бы, а витрина не менялась — lw-fbpw, повторённый
// на странице, которую он сам назвал приоритетом.
//
// Первый тест ниже — приёмка из брифа буквально: PUT уходит с discountPct, и
// В ТЕЛЕ НЕТ salePrice. Второе условие проверяется так же строго, как первое
// (toEqual на весь объект, не toMatchObject/toContainProperty) — именно
// поэтому мутация «верни отправку salePrice вместо discountPct» обязана
// покрасить РОВНО этот тест: toEqual перестанет совпадать, как только
// в теле снова появится лишний ключ или пропадёт discountPct.
//
// Панель варианта открывается тем же путём, что в 15-admin-media.spec.ts
// (кнопка «Цвет · …»), и подмена сети — тем же приёмом: канареечный товар,
// который совпадает и в фикстуре, и в боевом каталоге, поэтому
// skipUnlessFixtureCatalogue здесь не нужен (см. комментарий в 15).

const PDP = '/ru/product/palto-pidzhak-pritalennoe';
// bagProduct.id / productColors[0] в WhitePdpShowcase.tsx — модель и цвет,
// которые PDP выбирает ПО УМОЛЧАНИЮ, без клика по свотчу (тот же канареечный
// товар, что в 02/03/15/18-спеках).
const MODEL_ID = '4b63e888-bc6b-5fed-b6a8-23237918c205';
const VARIANT_ID = 'wb-795522033';
const VARIANT_COVER = '/images/white/products/p-795522033-grey-Q.jpg';

async function asOwner(page: Page): Promise<void> {
  // /api/auth/** лимитирован на IP, а спеки идут параллельно — тот же приём
  // подмены роли, что в 07/12/15-спеках.
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'owner-token'));
  await page.context().addCookies([{name: 'rl_session', value: 'owner-session', domain: 'localhost', path: '/'}]);
}

type VariantMock = {
  priceSource: 'manual' | 'ozon';
  discountPct: number;
  sourceMissing: boolean;
  costUnknown: boolean;
  thresholdApplied: boolean;
  manualPriceInactive: boolean;
};

const DEFAULT_VARIANT: VariantMock = {
  priceSource: 'manual',
  discountPct: 0,
  sourceMissing: false,
  costUnknown: false,
  thresholdApplied: false,
  manualPriceInactive: false,
};

/** Подмена ЕДИНСТВЕННОЙ ручки, которой не хватает в фикстурном режиме — приём из 15-admin-media.spec.ts. */
async function mockVariantModel(page: Page, overrides: Partial<VariantMock> = {}): Promise<{puts: Array<{body: unknown}>}> {
  const state = {
    variants: {
      [VARIANT_ID]: {
        price: 23000,
        image: VARIANT_COVER,
        gallery: [] as string[],
        stockQuantity: 5,
        ...DEFAULT_VARIANT,
        ...overrides,
      },
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

test.describe('скидка процентом на странице товара', () => {
  test('владелец ставит скидку и сохраняет — уходит PUT с discountPct, salePrice в теле нет', async ({page}) => {
    await asOwner(page);
    const {puts} = await mockVariantModel(page, {discountPct: 5});
    await openSettledForOwner(page, `${PDP}?edit=1`);
    const panel = await openVariantPanel(page);

    const percent = panel.getByRole('textbox', {name: 'Скидка, %', exact: true});
    await percent.fill('20');
    await panel.getByRole('button', {name: /Сохранить в черновик/i}).click();

    await expect.poll(() => puts.length).toBe(1);
    // toEqual на весь объект — не toMatchObject: тело обязано быть РОВНО
    // {discountPct: 20}, ни salePrice, ни price рядом не должно оказаться.
    expect(puts[0]!.body).toEqual({discountPct: 20});
  });

  test('переключатель источника — «своя цена»/«цена с Ozon», wildberries среди опций нет', async ({page}) => {
    await asOwner(page);
    await mockVariantModel(page);
    await openSettledForOwner(page, `${PDP}?edit=1`);
    const panel = await openVariantPanel(page);

    const select = panel.getByRole('combobox', {name: 'Источник цены', exact: true});
    const values = await select.locator('option').evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    expect(values).toEqual(['manual', 'ozon']);
  });

  test('источник не получен — своя подпись, отличная от порога по себестоимости', async ({page}) => {
    await asOwner(page);
    await mockVariantModel(page, {sourceMissing: true});
    await openSettledForOwner(page, `${PDP}?edit=1`);
    const panel = await openVariantPanel(page);

    await expect(panel.getByText('Цена с Ozon ещё не приходила — показана своя')).toBeVisible();
    await expect(panel.getByText('Скидка уменьшена: ниже себестоимости продавать нельзя')).toHaveCount(0);
  });

  test('«ручная цена не действует» — поле цены недоступно для правки', async ({page}) => {
    await asOwner(page);
    await mockVariantModel(page, {priceSource: 'ozon', manualPriceInactive: true});
    await openSettledForOwner(page, `${PDP}?edit=1`);
    const panel = await openVariantPanel(page);

    await expect(panel.getByRole('spinbutton', {name: 'Цена, ₽', exact: true})).toBeDisabled();
  });

  test('зона нажатия источника цены и скидки — не меньше 44px, кегль не мельче 13', async ({page}) => {
    await asOwner(page);
    await mockVariantModel(page);
    await openSettledForOwner(page, `${PDP}?edit=1`);
    const panel = await openVariantPanel(page);

    const select = panel.getByRole('combobox', {name: 'Источник цены', exact: true});
    const percent = panel.getByRole('textbox', {name: 'Скидка, %', exact: true});

    for (const [name, locator] of [
      ['Источник цены', select],
      ['Скидка, %', percent],
    ] as const) {
      const box = await locator.boundingBox();
      expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(44);
      const fontSize = await locator.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect(fontSize, name).toBeGreaterThanOrEqual(13);
    }
  });
});
