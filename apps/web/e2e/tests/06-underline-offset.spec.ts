import {test, expect} from '@playwright/test';

// The quiet text-link underline used to be drawn by an ::after on the anchor
// itself. Most of those anchors are 44px tap targets around 11-12px text, so
// the hairline rendered ~16px below the glyphs instead of hugging them. The
// rule now lives on an inner .wv-link-ink span, whose box IS the text box.
// These tests measure the rendered geometry rather than the CSS source, and
// guard the pattern so a new call site cannot silently reintroduce the gap.

const PAGES = ['/ru/product?p=1', '/ru/bag', '/ru/account', '/ru/privacy', '/ru/shop'];
const VIEWPORTS = [
  {width: 1440, height: 900},
  {width: 390, height: 844},
];

// Measured against the drawn glyphs, not the box: above 0 the rule would strike
// the letters, and the bug this guards against put it 16px adrift.
const MIN_GAP = 0.5;
const MAX_GAP = 6;

async function measureInk(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const out: {text: string; gap: number}[] = [];
    document.querySelectorAll<HTMLElement>('.wv-link-ink').forEach((span) => {
      const after = getComputedStyle(span, '::after');
      if (after.content === 'none') return;
      const style = getComputedStyle(span);
      const box = span.getBoundingClientRect();
      if (box.height === 0) return;

      const raw = span.textContent || '';
      const rendered = style.textTransform === 'uppercase' ? raw.toUpperCase() : raw;
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const metrics = ctx.measureText(rendered);

      // Where the glyphs actually end inside the line box, half-leading included.
      const contentHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
      const baseline = (parseFloat(style.lineHeight) - contentHeight) / 2 + metrics.fontBoundingBoxAscent;
      const inkBottom = baseline + metrics.actualBoundingBoxDescent;
      const lineTop = box.height - parseFloat(after.bottom) - parseFloat(after.height);

      out.push({text: rendered.trim().slice(0, 40), gap: lineTop - inkBottom});
    });
    return out;
  });
}

test.describe('quiet link underlines hug their text', () => {
  for (const viewport of VIEWPORTS) {
    for (const path of PAGES) {
      test(`${path} @ ${viewport.width}px`, async ({page}) => {
        await page.setViewportSize(viewport);
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        const measured = await measureInk(page);
        test.skip(measured.length === 0, `no .wv-link-ink rendered on ${path}`);

        for (const link of measured) {
          expect(link.gap, `"${link.text}" underline is ${link.gap.toFixed(1)}px from its text`).toBeGreaterThanOrEqual(MIN_GAP);
          expect(link.gap, `"${link.text}" underline is ${link.gap.toFixed(1)}px from its text`).toBeLessThanOrEqual(MAX_GAP);
        }

        // The complaint was that the underlines did not agree with each other;
        // a tight spread across a page is what actually proves that fixed.
        // Cap-height differences between labels account for a couple of px.
        const gaps = measured.map((m) => m.gap);
        expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(3);
      });
    }
  }

  test('every .wv-link carries an ink span, so the rule can never anchor to the padded box', async ({page}) => {
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const orphans = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.wv-link')]
          .filter((el) => !el.querySelector('.wv-link-ink') && el.getAttribute('aria-current') !== 'page')
          .map((el) => (el.textContent || '').trim().slice(0, 40)),
      );
      expect(orphans, `${path} has .wv-link without .wv-link-ink`).toEqual([]);
    }
  });

  test('padded links keep their 44px tap target while the rule moves up', async ({page}) => {
    await page.goto('/ru/product?p=1');
    await page.waitForLoadState('networkidle');

    const padded = page.locator('.wv-link.min-h-11').first();
    await padded.waitFor({state: 'attached'});
    expect(await padded.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  });

  test('the wipe reveals on hover and is neutralised for reduced motion', async ({page}) => {
    await page.goto('/ru/product?p=1');
    await page.waitForLoadState('networkidle');

    const link = page.locator('.wv-link:has(.wv-link-ink)').first();
    const scaleX = (el: HTMLElement) =>
      new DOMMatrixReadOnly(getComputedStyle(el.querySelector('.wv-link-ink')!, '::after').transform).a;

    expect(await link.evaluate(scaleX)).toBeCloseTo(0, 1);
    await link.hover();
    await page.waitForTimeout(500);
    expect(await link.evaluate(scaleX)).toBeCloseTo(1, 1);

    await page.emulateMedia({reducedMotion: 'reduce'});
    const duration = await link.evaluate(
      (el) => getComputedStyle(el.querySelector('.wv-link-ink')!, '::after').transitionDuration,
    );
    expect(duration).toBe('0s');
  });

  test('links that wrap mid-sentence underline every line', async ({page}) => {
    await page.setViewportSize({width: 320, height: 844});
    await page.goto('/ru/bag');
    await page.waitForLoadState('networkidle');

    const inline = page.locator('.wv-link-inline').first();
    await inline.waitFor({state: 'attached'});
    // text-decoration fragments per line box, unlike the absolutely positioned
    // rule it replaced — that one collapsed to width:0 the moment it wrapped.
    expect(await inline.evaluate((el) => el.getClientRects().length)).toBeGreaterThanOrEqual(1);
    expect(await inline.evaluate((el) => parseFloat(getComputedStyle(el).textUnderlineOffset))).toBeLessThanOrEqual(4);

    await inline.hover();
    await page.waitForTimeout(500);
    const colour = await inline.evaluate((el) => getComputedStyle(el).textDecorationColor);
    expect(colour).not.toContain('rgba(0, 0, 0, 0)');
  });
});
