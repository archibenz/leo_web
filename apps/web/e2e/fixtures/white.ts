import {expect, type Page} from '@playwright/test';
import {copy} from './messages';

// Storefront helpers shared by the bag/PDP specs. The White storefront keeps its
// state in localStorage and mounts nothing server-side, so seeding, hydration
// and scrolling all need the same handling in every spec that touches them.

export const BAG_KEY = 'wv-bag'; // hooks/useWhiteBag.ts
export const COOKIE_KEY = 'wv-cookie-ok'; // app/[locale]/WhiteCookieNotice.tsx
// The notice's live height, broadcast onto <html> while it's up so anything
// else pinned to the bottom of the viewport can reserve the same space
// instead of sitting underneath it. app/[locale]/WhiteCookieNotice.tsx
export const COOKIE_HEIGHT_VAR = '--wv-cookie-h';

// `next dev` compiles a route the first time it is asked for; on a cold runner
// that compile alone can outrun the config's 15s navigationTimeout. This covers
// the compile, not page behaviour.
export const COLD_COMPILE = 60_000;

export type BagLine = {
  id?: string;
  key: number;
  en: string;
  ru: string;
  price: number;
  size: string;
  colorEn: string;
  colorRu: string;
  qty: number;
};

export function openWhite(page: Page, path: string) {
  // domcontentloaded, not load: against a deployed E2E_BASE_URL the chrome also
  // pulls the Metrika tag, and none of these specs has anything to say about a
  // third-party host.
  return page.goto(path, {waitUntil: 'domcontentloaded', timeout: COLD_COMPILE});
}

export function readBag(page: Page): Promise<BagLine[]> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), BAG_KEY);
}

// useWhiteBag reads storage on mount, so a seed has to be in place before the
// first paint — an init script runs earlier than any page script.
export function seedBag(page: Page, lines: readonly BagLine[]) {
  return page.addInitScript(
    ([key, raw]) => {
      try {
        window.localStorage.setItem(key, raw);
      } catch {
        /* opaque origin (about:blank) — the real document gets its own run */
      }
    },
    [BAG_KEY, JSON.stringify(lines)] as const,
  );
}

// The cookie line is fixed to the bottom at z-1100 until this key is set, so it
// covers the PDP's z-60 sticky CTA. Specs that drive the bottom of the screen
// acknowledge it before first paint instead of dismissing it through its copy.
export function acknowledgeCookies(page: Page) {
  return page.addInitScript((key) => {
    try {
      window.localStorage.setItem(key, '1');
    } catch {
      /* opaque origin — the real document gets its own run */
    }
  }, COOKIE_KEY);
}

// The White pages are server-rendered before the bag is wired up, and the
// server's bag is always empty — so an empty list means nothing until React has
// finished. React's own container marker is no use as a gate: it is written when
// hydrateRoot marks the container, i.e. before the first client render, and the
// DOM at that point is still the SSR output. WhiteCookieNotice renders from a
// mount effect and from nothing else, so its appearance is the app's own proof
// that effects have run; dismissing it through its button is also the only way
// to clear the bar that would otherwise eat clicks aimed at what it covers.
export async function hydrateViaCookieNotice(page: Page) {
  const notice = page.getByRole('region', {name: copy('footer', 'cookieText')});
  await notice.getByRole('button', {name: copy('footer', 'cookieOk')}).click();
  await expect(notice).toBeHidden();
}

// isAdmin (useEditorSession) решается АСИНХРОННО — эффектом, который для
// владельца бьёт в /api/auth/me. До того, как эффект отработал, всё, что
// завязано на editing/isAdmin (переключатель в аккаунте, ярлык блока в
// EditableBlock, панель редактора), физически не могло ни появиться, ни
// остаться. Проверка сразу после навигации — ловушка: и «не появится», и
// «ещё не появилось» выглядят одинаково, а toHaveCount(0) в этом окне зелёный
// всегда, в том числе на пустой странице.
//
// Поймано трижды: 12-edit-switch (два ложно-зелёных кейса при мутации),
// 13-ticker-usability (мигающий спек), 15-admin-media. Тот же класс, не
// совпадение — поэтому помощник живёт здесь, а не четвёртой копией.
//
// У владельца есть точный признак помимо гидратации — сетевой ответ
// /api/auth/me. Слушатель ставится ДО навигации (Promise.all): поставленный
// после, он может опоздать за быстрым ответом. Затем добираем «первый круг
// клиентских эффектов прошёл» через hydrateViaCookieNotice — он заодно
// снимает баннер, который иначе перекрывал бы низ панели.
export async function openSettledForOwner(page: Page, path: string): Promise<void> {
  await Promise.all([page.waitForResponse((r) => r.url().includes('/api/auth/me')), openWhite(page, path)]);
  await hydrateViaCookieNotice(page);
}

// globals.css sets html{scroll-behavior:smooth}, so a plain scrollTo would
// animate and every following assertion would race the animation.
export function instantScrollTo(page: Page, top: number) {
  return page.evaluate((y) => window.scrollTo({top: y, behavior: 'instant'}), top);
}
