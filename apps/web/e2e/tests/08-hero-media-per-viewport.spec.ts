import {test, expect, type Page} from '@playwright/test';
import {STOREFRONT_FIXTURE} from '../../lib/catalogue/fixture';
import {skipUnlessFixtureCatalogue} from '../fixtures/catalogue';
import {openWhite} from '../fixtures/white';

// lw-smu6 — на широком экране первым кадром видна телефонная обложка героя.
// Причина: сервер не знает ширины экрана, поэтому portrait-файлы всегда уходили
// в разметку, а на десктопные их подменял useEffect — то есть уже ПОСЛЕ
// гидратации. Критерий владельца дословно: «при выключенном JavaScript на
// широком экране телефонного кадра нет вовсе».
//
// Обложка (poster) и ролик (video) чинятся по-разному и проверяются по-разному:
//
// - Обложка — `<picture><source media>`, решается браузером до всякого JS,
//   одинаково на chromium и webkit. Кейс 3 (без JS) не читает page.content()
//   построчным поиском портретного пути: `<picture>` обязан по спеке нести
//   <img src> с портретным файлом как fallback для браузеров без поддержки
//   <picture> — эта строка в разметке будет ЛЕЖАТЬ всегда, у любого
//   корректного решения, и её присутствие ничего не говорит о том, какой файл
//   браузер в итоге показал. Проверяется тем же способом, что и первые два
//   кейса, — какой файл ушёл по сети.
// - Ролик — сервер не отдаёт <source> вовсе (see WhiteShowcase.tsx): source
//   ставит только JS, после гидратации, одинаково на обоих движках. Без JS
//   ролика поэтому нет вообще ни на одном движке — раньше на Safari без JS
//   утекал портретный файл (media на <video><source> Safari не читает), а на
//   Chromium утекал бы верный файл, но утекал бы БЕЗ спроса; теперь не течёт
//   ничего, и это и есть новый инвариант кейса 3.
//
// Имена файлов не захардкожены: оба набора берутся из той же фикстуры
// (CATALOGUE_SOURCE=fixture, см. e2e/fixtures/catalogue.ts), которую отдаёт сама
// витрина, — так спек проверяет страницу, а не собственные ожидания о ней.

const HERO = STOREFRONT_FIXTURE.sections.find((s) => s.layout === 'hero')!;

const NARROW = {width: 390, height: 844};
const WIDE = {width: 1440, height: 900};

// `networkidle` не годится: герой зациклен (loop), и проигрывание само тянет
// байт-рейнджи, так что сеть не «утихает» никогда. Используется только там, где
// нет `currentSrc`, за которым можно дождаться детерминированно (кейс без JS).
const SETTLE_MS = 2_000;

function trackRequestPaths(page: Page): string[] {
  const paths: string[] = [];
  page.on('request', (req) => paths.push(new URL(req.url()).pathname));
  return paths;
}

// Ждёт, пока JS не выберет и не поставит src (единственный источник этого
// решения теперь — эффект в WhiteShowcase.tsx, ни один движок не решает сам).
// Таймаут — это и есть проверка: если src не появился, значит эффект не
// выполнился или выбрал не то, и тест должен упасть, а не тихо проехать.
async function waitForHeroVideoSrc(page: Page): Promise<string> {
  const handle = await page.waitForFunction(
    () => document.querySelector<HTMLVideoElement>('section video')?.currentSrc || null,
    undefined,
    {timeout: 5_000},
  );
  const src = await handle.jsonValue();
  // Небольшой буфер после появления currentSrc: сам сетевой запрос — побочный
  // эффект присвоения .src браузером, и может долететь до page.on('request')
  // на тик позже, чем currentSrc успевает измениться в DOM.
  await page.waitForTimeout(300);
  return src as string;
}

test.beforeEach(async ({request}) => {
  await skipUnlessFixtureCatalogue(request);
});

test.describe('hero media stays on its own side of the breakpoint', () => {
  test(`narrow (${NARROW.width}x${NARROW.height}) never fetches the desktop cut, and the video lands on the portrait cut`, async ({page}) => {
    await page.setViewportSize(NARROW);
    const paths = trackRequestPaths(page);
    await openWhite(page, '/ru');
    const src = await waitForHeroVideoSrc(page);

    expect(paths, 'narrow viewport requested the desktop poster').not.toContain(HERO.posterDesktopUrl!);
    expect(paths, 'narrow viewport requested the desktop video').not.toContain(HERO.videoDesktopUrl!);
    expect(src, 'narrow viewport video did not land on the portrait cut').toContain(HERO.videoUrl!);
  });

  test(`wide (${WIDE.width}x${WIDE.height}) never fetches the portrait cut, and the video lands on the desktop cut`, async ({page}) => {
    await page.setViewportSize(WIDE);
    const paths = trackRequestPaths(page);
    await openWhite(page, '/ru');
    const src = await waitForHeroVideoSrc(page);

    // No per-engine exception here on purpose: the video no longer ships a
    // <source> for either engine's native resource selection to get right or
    // wrong, so both are held to exactly the same bar.
    expect(paths, 'wide viewport requested the portrait poster').not.toContain(HERO.posterUrl!);
    expect(paths, 'wide viewport requested the portrait video').not.toContain(HERO.videoUrl!);
    expect(src, 'wide viewport video did not land on the desktop cut').toContain(HERO.videoDesktopUrl!);
  });

  test('with JavaScript off, the wide viewport never fetches any video, and the poster is correct', async ({browser}) => {
    const context = await browser.newContext({viewport: WIDE, javaScriptEnabled: false});
    const page = await context.newPage();
    const paths = trackRequestPaths(page);
    await openWhite(page, '/ru');
    await page.waitForTimeout(SETTLE_MS);

    expect(paths, 'wide + no JS never requested the desktop poster at all').toContain(HERO.posterDesktopUrl!);
    expect(paths, 'wide + no JS requested the portrait poster').not.toContain(HERO.posterUrl!);
    // The video has no <source> in the server markup at all — without JS to
    // set one, neither cut should ever be requested, on either engine.
    expect(paths, 'wide + no JS requested the desktop video').not.toContain(HERO.videoDesktopUrl!);
    expect(paths, 'wide + no JS requested the portrait video').not.toContain(HERO.videoUrl!);

    await context.close();
  });
});
