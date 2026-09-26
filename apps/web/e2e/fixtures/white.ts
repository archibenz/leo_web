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

// СВОЙСТВО ВСЕГО НАБОРА, КОТОРОЕ СТОИЛО ПОЛДНЯ ПОИСКА И ВЫШЛО СЛУЧАЙНО.
//
// `next dev` при ЛЮБОМ предупреждении о гидратации поднимает свою панель
// ошибок, а она лежит поверх страницы и ПЕРЕХВАТЫВАЕТ НАЖАТИЯ. Поэтому любой
// кейс, который кликает, падает по таймауту — и падает он не на том, что
// проверяет. В логе это видно одной строкой:
//
//   <nextjs-portal> … intercepts pointer events
//
// Если упало сразу несколько кейсов про интерактив, а про вёрстку и
// содержимое ни одного — ищите не в них. Ищите расхождение гидратации на той
// странице, которую они открывают.
//
// Поймано 21.09.2026: встроенный скрипт ставил src у ролика ДО оживления,
// React писал «some attributes … didn't match», панель вставала, и три кейса
// падали на клике. Сама гидратация была цела.
//
// Побочно набор оказался сторожем расхождений гидратации — даром, но всерьёз:
// снимать это свойство без нужды не стоит.

// Сколько ждать ПЕРВОГО КЛИЕНТСКОГО РЕШЕНИЯ на уже отрисованной странице —
// появления того, что рисуется только после гидратации.
//
// ЗАМЕРЕНО, А НЕ ВЫБРАНО. 17.09.2026, `01-account-auth`, вкладки входа: три
// параллельных прогона по прогретому серверу, тридцать замеров.
//
//   минимум 1874 мс · медиана 5218 мс · максимум 7273 мс
//   ВОСЕМНАДЦАТЬ из тридцати перевалили за 5000
//
// 5000 мс — стандартный таймаут Playwright, то есть порог стоял не рядом с
// распределением, а ПОСЕРЕДИНЕ него: каждый второй прогон — монета. Крайний
// случай упал с запасом в 36 мс. Отсюда и «нестабильный спек» (lw-v8wd),
// который на деле не нестабилен: цель появляется ВСЕГДА, просто позже.
//
// Почему медленно, тоже видно в замерах: первые семь целей в каждом прогоне
// ждут 5–7 секунд, последние три — около двух. Воркеры стартуют разом и встают
// в очередь за процессором вместе с `next dev`; освобождается очередь — падает
// время. В CI этого не бывает вовсе: `workers: CI ? 1 : undefined`.
//
// 15 секунд, а не «шесть с небольшим»: 7273 мс — максимум на ЭТОЙ машине под
// СЕГОДНЯШНЕЙ нагрузкой. Порог, подогнанный впритык к замеру, вернёт мигание
// на другой машине — и вернёт его с объяснением «мы же мерили». Двойной запас
// над худшим наблюдением, и вчетверо меньше, чем COLD_COMPILE.
//
// Запас не прячет поломку: там, где цель не появляется ВОВСЕ, спек падает
// по-прежнему — только через пятнадцать секунд вместо пяти. Разница между
// шестью и пятнадцатью стоит нам времени на настоящем отказе, и ничего больше.
//
// РАССМОТРЕНО И ОТКЛОНЕНО. Настоящее лечение класса — не давать воркерам
// штурмовать дев-сервер разом (развести старт, срезать число воркеров
// локально). Отклонено: беда локальная и в CI отсутствует по устройству
// (`workers: CI ? 1 : undefined`), а цена — синхронизация старта под проблему,
// которой нет нигде, кроме одной машины. Записано здесь, чтобы следующий не
// считал этот путь незамеченным.
export const HYDRATION = 15_000;

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

// Переход, который утверждает, что пришла НАЗВАННАЯ страница, а не 404.
// Выдуманный или устаревший адрес на дев-стенде отвечает 200 и рисует «Такой
// страницы нет» (07-soft-404-status: настоящий 404 — только на сборке), и
// спек молча мерит не то: 06-underline месяцами мерил 404 под видом карточки
// товара (слага с прода нет в фикстуре), 25-layout-shift — под видом /ru/info
// (такого раздела нет вовсе). Ждём видимый h1 — на заглушке загрузки его нет,
// так что проверка не проходит впустую раньше страницы.
export async function gotoRealPage(page: Page, path: string, heading?: string): Promise<void> {
  const response = await page.goto(path);
  expect(response?.status(), `${path} answered ${response?.status()}`).toBe(200);
  const h1 = page.getByRole('heading', {level: 1}).first();
  await expect(h1, `${path} rendered no heading`).toBeVisible({timeout: HYDRATION});
  await expect(h1, `${path} is the not-found page`).not.toHaveText(copy('notFound', 'title'));
  if (heading) await expect(h1).toHaveText(heading);
}
