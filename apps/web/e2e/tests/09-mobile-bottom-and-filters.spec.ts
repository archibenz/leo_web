import {test, expect, type Page, type Locator} from '@playwright/test';
import {STOREFRONT_FIXTURE} from '../../lib/catalogue/fixture';
import {skipUnlessFixtureCatalogue} from '../fixtures/catalogue';
import {copy} from '../fixtures/messages';
import {acknowledgeCookies, hydrateViaCookieNotice, instantScrollTo, openWhite, COOKIE_HEIGHT_VAR} from '../fixtures/white';

// Two phone-only defects from the 2026-09-12 release:
//
// 1. WhiteCookieNotice (fixed, bottom, z-1100) and the PDP's mobile sticky
//    add-to-bag bar (fixed, bottom, z-60) are both pinned to the bottom of the
//    viewport. The notice sits on top, so on a first visit it hides the bar
//    entirely — the one thing a shopper scrolled down for. The fix makes the
//    notice broadcast its own live height onto <html> as --wv-cookie-h, and
//    the bar reserves that much space at its own `bottom` instead of sitting
//    under the notice.
// 2. WhiteShopShowcase's filter bar never wraps, so on a phone the category
//    chips and the sort control share one line. Sort eats close to half the
//    width, and the category row's own edge-fade scroller then cuts off mid
//    word well before the screen edge — reads as broken layout, not "scroll
//    for more". The fix wraps the bar below `sm`, giving the categories the
//    full first line and sort its own line underneath.
//
// Product and slug come from the fixture the dev server actually serves
// (CATALOGUE_SOURCE=fixture) — inventing an address risks a 404 that has
// nothing to do with either defect.

const PRODUCT = STOREFRONT_FIXTURE.products[0]!;
const PHONE = {width: 390, height: 844} as const;
const DESKTOP = {width: 1440, height: 900} as const;

type Box = {x: number; y: number; width: number; height: number};

// Length of the vertical intersection of two boxes; 0 means they don't overlap.
function verticalOverlap(a: Box, b: Box): number {
  return Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
}

function verticalRangesOverlap(a: Box, b: Box): boolean {
  return a.y < b.y + b.height && b.y < a.y + a.height;
}

test.beforeEach(async ({request}) => {
  await skipUnlessFixtureCatalogue(request);
});

test.describe('the mobile price bar stacks above the cookie notice instead of under it', () => {
  // Same margins as the sticky-CTA case in 02-add-to-cart.spec.ts: the
  // IntersectionObserver keeps a -48px margin at the bottom, and a second
  // sentinel near the page end retracts the bar again, so the scroll target
  // has to clear the first without reaching the second.
  const REVEAL_MARGIN = 80;
  const END_MARGIN = 120;

  async function revealStickyBar(page: Page): Promise<Locator> {
    const inlineAdd = page.locator('#wv-main button.wv-btn');
    // The sticky bar renders as a sibling right after </main>; it's the only
    // such sibling that ever carries a button.wv-btn (the lightbox and the
    // page-end sentinel don't), which is what makes this unambiguous.
    const stickyBar = page.locator('#wv-main ~ div:has(button.wv-btn)');
    await expect(inlineAdd).toHaveCount(1);
    await expect(stickyBar).toHaveCount(1);

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
    await expect(stickyBar).toBeInViewport();
    return stickyBar;
  }

  test('first visit, consent not yet given: the price bar and the cookie notice never overlap', async ({page}) => {
    await page.setViewportSize(PHONE);
    await openWhite(page, `/ru/product/${PRODUCT.slug}`);

    const notice = page.getByRole('region', {name: copy('footer', 'cookieText')});
    await expect(notice).toBeVisible();

    const stickyBar = await revealStickyBar(page);

    // Polled, not a single read: the notice's height is a live measurement
    // (ResizeObserver + a re-check once the Jost UI webfont settles), so there
    // is a genuine, brief window right after mount where it can still be
    // catching up to its final size — same as WhiteShopShowcase's edge-fade,
    // which re-syncs for the same reason. A real shopper never scrolls fast
    // enough to see that window; this test would, without the poll.
    await expect
      .poll(
        async () => {
          const noticeBox = await notice.boundingBox();
          const barBox = await stickyBar.boundingBox();
          if (!noticeBox || !barBox) return null;
          return verticalOverlap(noticeBox, barBox);
        },
        {message: 'price bar must not overlap the cookie notice vertically'},
      )
      .toBe(0);
  });

  test('after consent, the space reserved for the notice is given back to the price bar', async ({page}) => {
    await page.setViewportSize(PHONE);
    await openWhite(page, `/ru/product/${PRODUCT.slug}`);

    const stickyBar = await revealStickyBar(page);

    // Same screen as the previous case — the notice is still up, and it
    // should already be reserving space for itself before anyone taps "OK".
    const beforeVar = await page.evaluate(
      (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
      COOKIE_HEIGHT_VAR,
    );
    expect(beforeVar, 'the notice should be broadcasting its height before consent is given').not.toBe('');

    // The real path a shopper has — not a storage shortcut, which would skip
    // the handler that actually releases the reservation.
    await hydrateViaCookieNotice(page);

    const afterVar = await page.evaluate(
      (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
      COOKIE_HEIGHT_VAR,
    );
    expect(afterVar, 'the reservation must be released once the notice is gone').toBe('');

    // Polled for the same reason as the previous case's overlap check: the
    // bar's own `bottom` is only as fresh as the last resize-observation
    // tick, so give it a moment to settle instead of reading it mid-tick.
    await expect
      .poll(
        async () => {
          const barBox = await stickyBar.boundingBox();
          return barBox ? Math.round(barBox.y + barBox.height) : null;
        },
        {message: 'price bar should sit flush against the window bottom again'},
      )
      .toBe(PHONE.height);
  });
});

test.describe('the shop keeps sort off the category row on a phone, but not on desktop', () => {
  test.beforeEach(async ({page}) => {
    // Not the point of these two cases — dismissed so a failure screenshot
    // shows the filter bar instead of an unrelated banner.
    await acknowledgeCookies(page);
  });

  test('390x844: the sort control drops to its own line, below the categories', async ({page}) => {
    await page.setViewportSize(PHONE);
    await openWhite(page, '/ru/shop');

    const categories = page.locator('#wv-main div.overflow-x-auto');
    const sort = page.locator('#wv-main select');
    await expect(categories).toBeVisible();
    await expect(sort).toBeVisible();

    const catBox = await categories.boundingBox();
    const sortBox = await sort.boundingBox();
    if (!catBox || !sortBox) throw new Error('category row or sort control rendered without a box');

    expect(
      catBox.y + catBox.height,
      'the category row must end above the sort control, not run into it on the same line',
    ).toBeLessThan(sortBox.y);
  });

  test('1440x900: categories and sort stay on the same line, as before', async ({page}) => {
    await page.setViewportSize(DESKTOP);
    await openWhite(page, '/ru/shop');

    const categories = page.locator('#wv-main div.overflow-x-auto');
    const sort = page.locator('#wv-main select');
    await expect(categories).toBeVisible();
    await expect(sort).toBeVisible();

    const catBox = await categories.boundingBox();
    const sortBox = await sort.boundingBox();
    if (!catBox || !sortBox) throw new Error('category row or sort control rendered without a box');

    expect(verticalRangesOverlap(catBox, sortBox), 'categories and sort must still share one line on desktop').toBe(true);
  });
});
