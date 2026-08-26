import {test, expect, type BrowserContext, type Locator, type Page} from '@playwright/test';
import {WHITE_PRODUCTS, type WhiteProduct} from '../../app/[locale]/products';
import {messages} from '../fixtures/messages';
import {hydrateViaCookieNotice, openWhite, seedBag, type BagLine} from '../fixtures/white';

// REINASLEO has no checkout of its own: the brand sells on Wildberries, the bag
// only holds the pick locally (hooks/useWhiteBag.ts, localStorage) and every
// purchase intent leaves through a per-article WB link. So "checkout" is three
// things — the empty bag a guest starts with, the per-line WB link once
// something is in it, and the PDP buy button. The spec this replaces drove
// /ru/cart, which is not a route; the bag lives at /ru/bag.
//
// Nothing here touches the Spring API (the catalogue is static) and nothing
// off-origin loads: those requests are aborted at the route layer, and the WB
// ones are recorded, so the assertions are on the handoff we made, not on a
// third party being up.

const bag = messages('bag');
const pdp = messages('pdp');

const [product, second] = WHITE_PRODUCTS;

const wbUrl = (p: WhiteProduct) => `https://www.wildberries.ru/catalog/${p.nm}/detail.aspx`;
// The spec only ever drives priced garments — a priceless preorder piece has
// no bag flow to test.
const catalogPrice = (p: WhiteProduct) => p.sale ?? p.price ?? 0;

// The bag prints prices through toLocaleString('ru-RU'), whose thousands
// separator is a non-breaking space — compare on digits only.
const flatten = (s: string) => s.replace(/\s/g, '');
const flatPrice = (n: number) => `${n}₽`;

const main = (page: Page) => page.locator('#wv-main');
// Scoped to <main>: the header, the footer and the PDP's fixed overlays (the
// lightbox and the sticky add-to-bag bar both sit after </main>) are outside it,
// so a stray WB link in the chrome could never pass for the handoff.
const wbLinks = (page: Page) => main(page).locator('a[href*="wildberries.ru"]');

function bagLine(p: WhiteProduct, overrides: Partial<BagLine> = {}): BagLine {
  const colour = p.colors[0]!;
  return {
    key: p.key,
    en: p.en,
    ru: p.ru,
    price: catalogPrice(p),
    size: 'M',
    colorEn: colour.en,
    colorRu: colour.ru,
    qty: 1,
    ...overrides,
  };
}

async function visit(page: Page, path: string) {
  await openWhite(page, path);
  await hydrateViaCookieNotice(page);
}

async function captureHandoffs(context: BrowserContext): Promise<string[]> {
  const seen: string[] = [];
  await context.route(
    (url) => url.hostname.endsWith('wildberries.ru'),
    (route) => {
      seen.push(route.request().url());
      return route.abort();
    },
  );
  return seen;
}

// The flood lasts 380ms (components/WildberriesButton.tsx). Polling for the
// class samples that window and can fall off either end of it; record the
// mutation instead — once the observer is attached the flag cannot be missed,
// and "no flood" becomes a claim about what happened rather than about what
// happened to be on screen when we looked.
const FLOOD_FLAG = '__wbFlooded';

async function watchFlood(buy: Locator) {
  await buy.evaluate((el, flag) => {
    const w = window as unknown as Record<string, boolean>;
    w[flag] = false;
    new MutationObserver(() => {
      if (el.querySelector('.wb-fill-fast')) w[flag] = true;
    }).observe(el, {subtree: true, attributes: true, attributeFilter: ['class']});
  }, FLOOD_FLAG);
}

const flooded = (page: Page) =>
  page.evaluate((flag) => (window as unknown as Record<string, boolean>)[flag] === true, FLOOD_FLAG);

test.describe('checkout hands off to Wildberries', () => {
  test.beforeEach(async ({context, baseURL}) => {
    // Nothing off-origin may load. Under next dev that is already true; under
    // E2E_BASE_URL it would be Metrika (components/Metrika.tsx). The host comes
    // from baseURL, so this holds against a deployment too. Routes match
    // last-registered-first, so the per-test wildberries.ru capture wins.
    const {hostname} = new URL(baseURL ?? 'http://localhost:3000');
    await context.route(
      (url) => url.hostname !== hostname,
      (route) => route.abort(),
    );
  });

  test('a fresh guest gets the empty bag and no handoff', async ({page}) => {
    await visit(page, '/ru/bag');

    await expect(main(page).getByRole('heading', {level: 1})).toHaveText(bag('bagEmpty'));
    // By role and name, not by href alone: an anchor with no text would pass an
    // href-only check, and an emptied copy key is exactly the rot this replaces.
    await expect(main(page).getByRole('link', {name: bag('continueShopping'), exact: true})).toHaveAttribute(
      'href',
      '/ru/shop',
    );
    await expect(main(page).locator('li')).toHaveCount(0);
    await expect(wbLinks(page)).toHaveCount(0);
  });

  test('a line in the bag carries the Wildberries link for that article', async ({page}) => {
    await seedBag(page, [bagLine(product!)]);
    await visit(page, '/ru/bag');

    await expect(main(page).getByRole('heading', {level: 1})).toHaveText(bag('bag'));
    await expect(main(page).locator('li')).toHaveCount(1);
    await expect(main(page).getByText(product!.ru, {exact: true})).toBeVisible();

    const link = wbLinks(page);
    await expect(link).toHaveAttribute('href', wbUrl(product!));
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    await expect(link).toHaveAttribute('rel', /noreferrer/);

    // The premise of the page: the WB link is the only way out. The newsletter
    // form lives in the footer, outside <main>. If a checkout form or submit
    // ever lands here this spec is the wrong shape and wants rewriting, not
    // patching.
    await expect(main(page).locator('form, button[type="submit"]')).toHaveCount(0);
  });

  test('every line points at its own article', async ({page}) => {
    test.skip(!second, 'the catalogue holds a single product');
    await seedBag(page, [bagLine(product!), bagLine(second!)]);
    await visit(page, '/ru/bag');

    const links = wbLinks(page);
    await expect(links).toHaveCount(2);
    expect(await links.evaluateAll((els) => els.map((el) => el.getAttribute('href')))).toEqual([
      wbUrl(product!),
      wbUrl(second!),
    ]);
  });

  test('the bag prices from the catalogue, not from the storage line', async ({page}) => {
    // Storage is hand-editable, so a tampered price must reach neither the line
    // nor the total. qty 2 so the line total is its own number rather than a
    // copy of the unit price — that keeps the `price * qty` multiplication in
    // the assertion.
    await seedBag(page, [bagLine(product!, {price: 99999, qty: 2})]);
    await visit(page, '/ru/bag');

    const line = main(page).locator('li');
    await expect(line).toHaveCount(1);

    expect(flatten(await line.innerText())).toContain(flatPrice(catalogPrice(product!) * 2));
    // Bare, not ₽-suffixed: a regression that printed the stored number without
    // its currency would otherwise slip through.
    expect(flatten(await main(page).innerText())).not.toContain('99999');
  });

  test('the PDP buy button points at the article', async ({page}) => {
    await visit(page, `/ru/product/${product!.slug}`);

    const buy = wbLinks(page);
    await expect(buy).toHaveCount(1);
    await expect(buy).toHaveText(pdp('buyOnWb'));
    await expect(buy).toHaveAttribute('href', wbUrl(product!));
    await expect(buy).toHaveAttribute('target', '_blank');
    await expect(buy).toHaveAttribute('rel', /noopener/);
    await expect(buy).toHaveAttribute('rel', /noreferrer/);
  });

  test('a mouse click hands off in a new tab and leaves the PDP where it was', async ({page, context}) => {
    const seen = await captureHandoffs(context);
    await visit(page, `/ru/product/${product!.slug}`);

    const buy = wbLinks(page);
    await watchFlood(buy);
    await buy.click();

    // Mouse keeps the plain anchor: one request, no deferral, no flood, and the
    // storefront stays put behind the new tab.
    await expect.poll(() => seen).toEqual([wbUrl(product!)]);
    expect(await flooded(page)).toBe(false);
    await expect(page).toHaveURL(new RegExp(`/ru/product\\?p=${product!.key}$`));
  });

  test.describe('on touch', () => {
    test.use({hasTouch: true});

    test('the tap floods first and still reaches the same article', async ({page, context}) => {
      const seen = await captureHandoffs(context);
      await visit(page, `/ru/product/${product!.slug}`);

      const buy = wbLinks(page);
      await watchFlood(buy);
      await expect(buy.locator('.wb-fill-fast')).toHaveCount(0);
      await buy.tap();

      // Touch has no hover, so the tap itself plays the fill and defers the
      // navigation — the handoff is window.open, and if the popup were blocked
      // the component falls back to location.assign, which the same context
      // route catches, so the article assertion holds on either path.
      await expect.poll(() => flooded(page)).toBe(true);
      await expect.poll(() => seen, {timeout: 5_000}).toEqual([wbUrl(product!)]);
      await expect(page).toHaveURL(new RegExp(`/ru/product\\?p=${product!.key}$`));
    });

    test('reduced motion taps straight through', async ({page, context}) => {
      const seen = await captureHandoffs(context);
      await page.emulateMedia({reducedMotion: 'reduce'});
      await visit(page, `/ru/product/${product!.slug}`);

      const buy = wbLinks(page);
      await watchFlood(buy);
      await buy.tap();

      await expect.poll(() => seen).toEqual([wbUrl(product!)]);
      expect(await flooded(page)).toBe(false);
    });
  });
});
