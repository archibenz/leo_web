import {test, expect, type Page} from '@playwright/test';
import {acknowledgeCookies, openWhite} from '../fixtures/white';

// КНОПКУ НИЧТО НЕ ДОЛЖНО НАКРЫВАТЬ. 24.09 нашлось: на компьютере «Предзаказ»
// не нажимался с 18.08 — клик забирала невидимая плашка .wv-tap::after от
// кнопки размера XL. Плашка (44 px, чтобы мелкая ссылка ловила палец)
// рассчитана на хозяина с position: relative; у кнопок размеров его не было,
// и она растянулась на 548 px от дальнего предка поверх соседней кнопки.
//
// ГДЕ ИМЕННО ляжет такая плашка, зависит от высоты дальнего предка, то есть
// от содержимого страницы: на прод-данных — на «Предзаказ», на заглушке
// каталога e2e — в пустое место. Поэтому первый сторож проверяет КОРЕНЬ, а не
// место падения: у каждого хозяина плашки позиционирование не static. Он
// краснеет на прежнем CSS при любой раскладке.

// Страницы, где .wv-tap есть: главная — ссылка в плашке cookie; карточка —
// крошки, кнопки размеров, ссылка на сеты. В магазине, сетах и контактах его
// нет вовсе (проверено 24.09) — там и стеречь нечего.
const PAGES = ['/ru', '/ru/product/sportivnyy-kostyum-s-kantom'];

async function staticTapOwners(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.wv-tap')]
      .filter((el) => getComputedStyle(el).position === 'static')
      .map((el) => `${el.tagName.toLowerCase()} «${(el.textContent || '').trim().slice(0, 20)}»`),
  );
}

test.describe('плашка .wv-tap::after не уходит от хозяина', () => {
  for (const path of PAGES) {
    test(`${path}: у каждого .wv-tap позиционирование не static`, async ({page}) => {
      // Плашка cookie тоже несёт .wv-tap — на первой странице её не прячем.
      if (path !== '/ru') await acknowledgeCookies(page);
      await openWhite(page, path);
      await expect(page.locator('.wv-tap').first()).toBeAttached();

      expect(await staticTapOwners(page)).toEqual([]);
    });
  }
});

// Шире: в центре каждой видимой кнопки и ссылки карточки сверху лежит она
// сама — так поймается и следующая плашка, не только эта. Закреплённые
// шапка и нижняя полоса законно ложатся поверх кадра при прокрутке — их не
// считаем.
async function coveredControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>('main a[href], main button')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') continue;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const top = document.elementFromPoint(x, y);
      if (!top || top === el || el.contains(top) || top.contains(el)) continue;
      let n: Element | null = top;
      let pinned = false;
      while (n) {
        const pos = getComputedStyle(n).position;
        if (pos === 'fixed' || pos === 'sticky') { pinned = true; break; }
        n = n.parentElement;
      }
      if (pinned) continue;
      out.push(`«${(el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30)}» ← ${top.tagName.toLowerCase()}`);
    }
    return out;
  });
}

test.describe('кнопки карточки ничем не накрыты', () => {
  for (const viewport of [
    {width: 1280, height: 900},
    {width: 390, height: 844},
  ] as const) {
    test(`${viewport.width} px: в центре каждой кнопки и ссылки сверху — она сама`, async ({page}) => {
      await page.setViewportSize(viewport);
      await acknowledgeCookies(page);
      await openWhite(page, '/ru/product/sportivnyy-kostyum-s-kantom');
      await expect(page.locator('main button').first()).toBeAttached();

      const covered = new Set<string>();
      const height = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < height; y += Math.floor(viewport.height * 0.8)) {
        await page.evaluate((top) => window.scrollTo({top, behavior: 'instant' as ScrollBehavior}), y);
        for (const c of await coveredControls(page)) covered.add(c);
      }
      expect([...covered]).toEqual([]);
    });
  }
});
