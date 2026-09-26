import {test, expect} from '@playwright/test';

// The quiet text-link underline used to be drawn by an ::after on the anchor
// itself. Most of those anchors are 44px tap targets around 11-12px text, so
// the hairline rendered ~16px below the glyphs instead of hugging them. The
// rule now lives on an inner .wv-link-ink span, whose box IS the text box.
// These tests measure the rendered geometry rather than the CSS source, and
// guard the pattern so a new call site cannot silently reintroduce the gap.

const PAGES = ['/ru/product/lnyanoy-kostyum-s-yubkoy-maksi', '/ru/bag', '/ru/account', '/ru/privacy', '/ru/shop'];
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
        // networkidle в CI наступал, пока карточка товара ещё стояла заглушкой
        // (shop)/loading.tsx; тест мерил подвал под ней, а с 26.09 подвал под
        // заглушкой скрыт — и кейс молча уходил в пропуск (7 вместо 5).
        // Ссылки с чертой есть на каждой из этих страниц: ждём страницу, а не
        // пропускаем её.
        await expect(page.locator('[data-shop-loading]')).toHaveCount(0);

        const measured = await measureInk(page);
        expect(measured.length, `no .wv-link-ink rendered on ${path}`).toBeGreaterThan(0);

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
    await page.goto('/ru/product/lnyanoy-kostyum-s-yubkoy-maksi');
    await page.waitForLoadState('networkidle');

    const padded = page.locator('.wv-link.min-h-11').first();
    await padded.waitFor({state: 'attached'});
    expect(await padded.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  });

  test('the wipe reveals on hover and is neutralised for reduced motion', async ({page}) => {
    await page.goto('/ru/product/lnyanoy-kostyum-s-yubkoy-maksi');
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

// ── Вторая, независимая механика подчёркивания: .wv-menu-link ──────────────
//
// Выше меряется .wv-link-ink — тихая ссылка, у которой черта рисуется ::after
// на внутреннем спане. У .wv-menu-link всё иначе: черта это ::before,
// position: absolute, top: 50%, — и разрешается она относительно ближайшего
// ПОЗИЦИОНИРОВАННОГО предка. Поэтому проверки выше про этот класс не говорят
// ничего: они честно отвечают за свой механизм и молчат о соседнем.
//
// Что было сломано: у самого .wv-menu-link не было position: relative. В
// шторке меню это не проявлялось, потому что `relative` дописан в месте
// вызова; на странице аккаунта предком оказывался блок .wv-rise высотой 336px,
// и top: 50% разрешался в 168px от ЕГО верха. Черта уезжала на соседние
// строки — владелец прислал снимок, где она лежит на «ВАШЕ» и «ВЫЙТИ».
//
// Меряется положение черты, а не наличие свойства: свойство это причина,
// положение — следствие, и владелец жаловался именно на следствие.

const MENU_LINK_PAGES = ['/ru/account'];

// Без вошедшего пользователя страница аккаунта показывает форму входа, а не
// список ссылок — и спека ниже тихо пропустилась бы, ничего не доказав.
// Подделываем тем же приёмом, что 12-edit-switch.spec.ts: токен в
// localStorage до первой отрисовки плюс подставленный /api/auth/me.
async function asUser(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({id: 'u1', name: 'Александр', email: 'owner@reinasleo.com', role: 'admin'}),
    }),
  );
  await page.addInitScript(() => window.localStorage.setItem('reinasleo_token', 'user-token'));
}

/**
 * Открыть страницу и дождаться СПИСКА ССЫЛОК, а не тишины в сети.
 *
 * `networkidle` отвечает за сеть, а не за отрисовку. Список ссылок появляется
 * ПОСЛЕ того, как клиент сходил за ролью и перерисовался, и на быстрой машине
 * это успевает произойти внутри тех же 500 мс тишины — а на чужой не успевает.
 * Первый прогон в CI 15.09 это и показал: обе спеки ниже там МОЛЧАЛИ
 * (`length === 0`), то есть ровно та тишина, от которой подделка входа и
 * защищает.
 */
async function openAccountAsUser(page: import('@playwright/test').Page, path: string): Promise<void> {
  await asUser(page);
  await page.goto(path);
  await expect(page.locator('.wv-menu-link').first()).toBeVisible();
}

test.describe('черта .wv-menu-link рисуется внутри своей строки', () => {
  for (const path of MENU_LINK_PAGES) {
    test(`${path}: ни одна черта не уезжает из своей ссылки`, async ({page}) => {
      await openAccountAsUser(page, path);

      const measured = await page.evaluate(() => {
        const out: {text: string; drift: number; blockTag: string}[] = [];
        document.querySelectorAll<HTMLElement>('.wv-menu-link').forEach((link) => {
          const before = getComputedStyle(link, '::before');
          if (before.content === 'none') return;
          const box = link.getBoundingClientRect();
          if (box.height === 0) return;

          // Содержащий блок для absolute — ближайший предок с position != static.
          let block: HTMLElement | null = link.parentElement;
          while (block && getComputedStyle(block).position === 'static') {
            block = block.parentElement;
          }
          const isSelf = getComputedStyle(link).position !== 'static';
          const cb = isSelf ? box : (block ? block.getBoundingClientRect() : document.body.getBoundingClientRect());

          // Куда фактически ляжет top: 50% этого содержащего блока.
          const lineY = cb.top + cb.height * 0.5;
          const linkMidY = box.top + box.height * 0.5;
          out.push({
            text: (link.textContent || '').trim().slice(0, 40),
            drift: lineY - linkMidY,
            blockTag: isSelf ? 'сама ссылка' : (block ? block.tagName.toLowerCase() : 'body'),
          });
        });
        return out;
      });

      // УТВЕРЖДЕНИЕ, А НЕ ПРОПУСК. Список адресов у спеки фиксированный, вход
      // подделан — пустота здесь невозможна по условию, а значит это дефект,
      // а не повод промолчать. Пока тут стоял test.skip, спека имела третье
      // состояние («ничего не проверил»), неотличимое от зелёного.
      expect(measured.length, `на ${path} не отрисовано ни одной .wv-menu-link`).toBeGreaterThan(0);

      for (const l of measured) {
        expect(
          Math.abs(l.drift),
          `черта у «${l.text}» уехала на ${l.drift.toFixed(0)}px от середины своей строки (содержащий блок: ${l.blockTag})`,
        ).toBeLessThanOrEqual(1);
      }
    });
  }

  // Контракт принадлежит классу, а не тому, кто его применяет: пока position
  // жил в месте вызова, шторка его ставила, аккаунт — нет, и класс выглядел
  // исправным ровно там, где его смотрели.
  test('position: relative лежит на самом классе, а не дописывается в месте вызова', async ({page}) => {
    await openAccountAsUser(page, '/ru/account');
    const positions = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.wv-menu-link')].map((el) => ({
        text: (el.textContent || '').trim().slice(0, 30),
        position: getComputedStyle(el).position,
        hasRelativeClass: el.classList.contains('relative'),
      })),
    );
    expect(positions.length, 'на /ru/account не отрисовано ни одной .wv-menu-link').toBeGreaterThan(0);
    for (const p of positions) {
      expect(p.position, `«${p.text}» — position: ${p.position}`).not.toBe('static');
      expect(p.hasRelativeClass, `«${p.text}» дописывает relative в месте вызова — контракт снова наполовину`).toBe(false);
    }
  });
});
