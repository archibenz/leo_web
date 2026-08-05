import {test, expect} from '@playwright/test';
import {WHITE_PRODUCTS} from '../../app/[locale]/products';
import {whiteItemNoun} from '../../app/[locale]/wv-i18n';
import {messages} from '../fixtures/messages';
import {acknowledgeCookies, instantScrollTo, openWhite, readBag} from '../fixtures/white';

// The buying walk as it exists after the White migration: shop grid → PDP → bag.
// A garment lives at /ru/product/<slug> and the bag lives at
// /ru/bag — the spec this replaces asserted /product/<id> and /cart, neither of
// which is a route. Nothing here reaches the Spring API: the catalogue is static
// (app/[locale]/products.ts), the bag is localStorage (hooks/useWhiteBag.ts) and
// the storefront chrome mounts no auth provider, so the walk is green with :8080
// down.
//
// Elements are located structurally (ids, roles, hrefs). The three CTA labels
// are the one place copy decides an assertion, so they come from messages/ru.json
// and follow the owner's edits instead of pinning them.

const pdp = messages('pdp');
const SIZE = 'M'; // any member of WHITE_SIZES

// The reveal needs the inline CTA out of the observer's root (rootMargin
// -48px at the bottom) while the page-end sentinel stays out of view, or
// `nearEnd` suppresses the bar again.
const REVEAL_MARGIN = 80;
const END_MARGIN = 120;

test.beforeEach(async ({page}) => {
  await acknowledgeCookies(page);
});

test.describe('shop → product → bag', () => {
  test('a card opens its product, a size unlocks the CTA, and the bag keeps the line', async ({page}) => {
    await openWhite(page, '/ru/shop');

    const cards = page.locator('#wv-main a[href*="/product/"]');
    await expect(cards.first()).toBeVisible();

    // Follow whatever the grid actually shows instead of assuming a key: the
    // card's own href names the product the PDP will render.
    const href = (await cards.first().getAttribute('href')) ?? '';
    const key = Number(new URL(href, 'http://localhost').searchParams.get('p'));
    const product = WHITE_PRODUCTS.find((p) => p.key === key);
    if (!product) throw new Error(`the first shop card links to ?p=${key}, which products.ts does not define`);
    // Quick Add is off in the shop grid, so the PDP opens on the primary colourway.
    const colour = product.colors[0]!;

    const bagLink = page.locator('header a[href="/ru/bag"]');
    await expect(bagLink).toHaveAccessibleName(new RegExp(`0\\s+${whiteItemNoun(0, 'ru')}$`));

    await cards.first().click();
    await page.waitForURL(new RegExp(`/ru/product\\?p=${key}$`));
    await expect(page.getByRole('heading', {level: 1})).toHaveText(product.ru);

    // The inline CTA. Its sticky twin for narrow screens renders as a sibling
    // after </main>, which is what makes this locator unambiguous.
    const addToBag = page.locator('#wv-main button.wv-btn');
    await expect(addToBag).toHaveCount(1);
    await expect(addToBag).toBeDisabled();
    await expect(addToBag).toHaveText(pdp('selectSize'));

    const size = page.locator('#wv-pdp-size').getByRole('button', {name: SIZE, exact: true});
    await expect(size).toHaveCount(1);
    // The PDP is server-rendered, so the chips answer to the mouse before React
    // has hydrated and an early click is swallowed. Retry the click itself —
    // retrying only the assertion would wait out the timeout on a dead press.
    await expect(async () => {
      await size.click();
      await expect(size).toHaveAttribute('aria-pressed', 'true', {timeout: 1_000});
    }).toPass({timeout: 15_000});

    await expect(addToBag).toBeEnabled();
    await expect(addToBag).toHaveText(pdp('addToBag'));

    // The confirmation label lives for 1600ms (WhitePdpShowcase). Arm an
    // rAF-polled watcher before the click; a 100ms assertion poll can step over
    // the whole window on a loaded machine.
    const confirmed = page.waitForFunction(
      (label) => document.querySelector('#wv-main button.wv-btn')?.textContent?.trim() === label,
      pdp('added'),
      {polling: 'raf', timeout: 5_000},
    );
    await addToBag.click();
    await confirmed;

    await expect
      .poll(() => readBag(page), {message: 'wv-bag should hold one line for the chosen size'})
      .toEqual([
        expect.objectContaining({
          id: `${product.key}-${SIZE}-${colour.en}`,
          key: product.key,
          en: product.en,
          ru: product.ru,
          size: SIZE,
          colorEn: colour.en,
          colorRu: colour.ru,
          // The bag is charged the effective price the PDP shows.
          price: product.sale ?? product.price,
          qty: 1,
        }),
      ]);

    // The header glyph draws the count, and the link's accessible name spells it.
    await expect(bagLink).toHaveText('1');
    await expect(bagLink).toHaveAccessibleName(new RegExp(`1\\s+${whiteItemNoun(1, 'ru')}$`));

    // Reaching the CTA scrolled the page, which retracts the sticky header.
    await instantScrollTo(page, 0);
    await bagLink.click();
    await page.waitForURL(/\/ru\/bag$/);

    // Until the store hydrates the bag renders its empty state, so this count is
    // what proves the line survived the navigation.
    const lines = page.locator('#wv-main ul > li');
    await expect(lines).toHaveCount(1);
    const line = lines.first();
    await expect(line.getByText(product.ru, {exact: true})).toBeVisible();
    await expect(line.getByText(SIZE, {exact: true})).toBeVisible();
    await expect(line.getByText(colour.ru, {exact: true})).toBeVisible();
    await expect(line.locator('[aria-live="polite"]')).toHaveText('1');
    await expect(line.locator(`a[href="/ru/product/${product.slug}"]`)).toHaveCount(1);
  });

  test('the sticky CTA on a phone sends a sizeless tap to the sizes instead of adding a line', async ({page}) => {
    const product = WHITE_PRODUCTS[0]!;

    await page.setViewportSize({width: 390, height: 844});
    await openWhite(page, `/ru/product/${product.slug}`);

    const inlineAdd = page.locator('#wv-main button.wv-btn');
    const stickyAdd = page.locator('#wv-main ~ div button.wv-btn');
    await expect(inlineAdd).toHaveCount(1);
    await expect(stickyAdd).toHaveCount(1);

    // A phone stacks the gallery above the info column, so the inline CTA opens
    // below the fold and the bar is already up.
    await expect(stickyAdd).toBeInViewport();
    await expect(stickyAdd).toHaveText(pdp('selectSize'));

    // Centred, not scrollIntoViewIfNeeded: the observer carries a -48px bottom
    // margin, so an element parked on the viewport edge still reads as gone and
    // the minimal scroll could land it there.
    await inlineAdd.evaluate((el) => el.scrollIntoView({block: 'center', behavior: 'instant'}));
    await expect(stickyAdd).not.toBeInViewport();

    const geometry = await inlineAdd.evaluate((el) => ({
      ctaBottom: el.getBoundingClientRect().bottom + window.scrollY,
      scrollable: document.documentElement.scrollHeight - window.innerHeight,
    }));
    const target = geometry.ctaBottom + REVEAL_MARGIN;
    test.skip(
      target > geometry.scrollable - END_MARGIN,
      'this PDP is too short to scroll its inline CTA away without reaching the page end',
    );
    await instantScrollTo(page, target);
    await expect(stickyAdd).toBeInViewport();

    // The sizes are above the CTA, so they are off the top here — which makes
    // the scroll below proof that the handler ran, not an accident of layout.
    const sizes = page.locator('#wv-pdp-size');
    await expect(sizes).not.toBeInViewport();

    await stickyAdd.click();
    await expect(sizes).toBeInViewport();
    await expect(page.locator('#wv-pdp-size [aria-pressed="true"]')).toHaveCount(0);
    expect(await readBag(page)).toEqual([]);
    await expect(page.locator('header a[href="/ru/bag"]')).toHaveAccessibleName(
      new RegExp(`0\\s+${whiteItemNoun(0, 'ru')}$`),
    );
  });
});
