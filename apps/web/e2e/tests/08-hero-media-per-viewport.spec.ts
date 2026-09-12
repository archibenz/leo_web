import {test, expect, type Page} from '@playwright/test';
import {STOREFRONT_FIXTURE} from '../../lib/catalogue/fixture';
import {skipUnlessFixtureCatalogue} from '../fixtures/catalogue';
import {openWhite} from '../fixtures/white';

// lw-smu6 — на широком экране первым кадром видна телефонная обложка героя.
// Причина: сервер не знает ширины экрана, поэтому portrait-файлы всегда уходят
// в разметку, а на десктопные их подменяет useEffect — то есть уже ПОСЛЕ
// гидратации. Критерий владельца дословно: «при выключенном JavaScript на
// широком экране телефонного кадра нет вовсе», поэтому третий кейс ниже поднимает
// контекст без JS и смотрит, какой файл реально ушёл по сети.
//
// Кейс 3 нарочно не читает page.content() построчным поиском портретного пути:
// `<picture>` обязан по спеке нести <img src> с портретным файлом как fallback
// для браузеров без поддержки <picture> — эта строка в разметке будет ЛЕЖАТЬ
// всегда, у любого корректного решения, и её наличие ничего не говорит о том,
// какой файл браузер в итоге показал. «Кадра нет» проверяется тем же способом,
// что и первые два кейса, — какой файл ушёл по сети, — просто в контексте без JS.
//
// Имена файлов не захардкожены: оба набора берутся из той же фикстуры
// (CATALOGUE_SOURCE=fixture, см. e2e/fixtures/catalogue.ts), которую отдаёт сама
// витрина, — так спек проверяет страницу, а не собственные ожидания о ней.

const HERO = STOREFRONT_FIXTURE.sections.find((s) => s.layout === 'hero')!;
const DESKTOP_FILES = [HERO.posterDesktopUrl!, HERO.videoDesktopUrl!];

const NARROW = {width: 390, height: 844};
const WIDE = {width: 1440, height: 900};

// `networkidle` не годится: герой зациклен (loop), и проигрывание само тянет
// байт-рейнджи, так что сеть не «утихает» никогда. Секунды хватает и на холодном
// dev-сервере — preload="metadata" уходит сразу после разбора разметки, а
// JS-страховка для Safari — тиком после гидратации.
const SETTLE_MS = 2_000;

function trackRequestPaths(page: Page): string[] {
  const paths: string[] = [];
  page.on('request', (req) => paths.push(new URL(req.url()).pathname));
  return paths;
}

test.beforeEach(async ({request}) => {
  await skipUnlessFixtureCatalogue(request);
});

test.describe('hero media stays on its own side of the breakpoint', () => {
  test(`narrow (${NARROW.width}x${NARROW.height}) never fetches the desktop cut`, async ({page}) => {
    await page.setViewportSize(NARROW);
    const paths = trackRequestPaths(page);
    await openWhite(page, '/ru');
    await page.waitForTimeout(SETTLE_MS);

    for (const file of DESKTOP_FILES) {
      expect(paths, `narrow viewport requested the desktop file ${file}`).not.toContain(file);
    }
  });

  test(`wide (${WIDE.width}x${WIDE.height}) never fetches the portrait poster, and the video lands on the desktop cut`, async ({
    page,
    browserName,
  }) => {
    await page.setViewportSize(WIDE);
    const paths = trackRequestPaths(page);
    await openWhite(page, '/ru');
    await page.waitForTimeout(SETTLE_MS);

    // The poster is `<picture><source media>` — part of the HTML spec, honoured
    // by both engines before any script runs. This is the actual owner
    // complaint (lw-smu6): it must hold everywhere or the bug is back.
    expect(paths, 'wide viewport requested the portrait poster').not.toContain(HERO.posterUrl!);

    if (browserName !== 'webkit') {
      // Chromium reads `media` on <video><source> natively at resource
      // selection — no JS required to get the right file the first time.
      expect(paths, 'wide viewport requested the portrait video').not.toContain(HERO.videoUrl!);
      return;
    }

    // Measured, not assumed (lw-smu6 brief, part 2): Safari does not evaluate
    // `media` on <video><source> — it settles on the unconditioned source
    // regardless of viewport, and does it while parsing the initial HTML,
    // before hydration can run. No JS runs early enough to stop that first
    // request. A two-<video> layout (one per breakpoint, CSS-toggled) was
    // measured as the alternative and rejected: the narrow/no-JS cases above
    // proved a `display:none` cut still gets fetched in both engines, which
    // trades this flicker for doubled traffic — worse, not better. So this
    // one wrong request on Safari is accepted, and what's guarded here is
    // that the existing v.src fallback still corrects it a tick later: the
    // video Safari actually ends up playing is the desktop cut, poster and
    // motion agreeing, even though one wasted request happened first.
    await page.waitForFunction(
      (desktopVideo) => document.querySelector<HTMLVideoElement>('section video')?.currentSrc.includes(desktopVideo) ?? false,
      HERO.videoDesktopUrl!,
      {timeout: 5_000},
    );
  });

  test('with JavaScript off, the wide viewport never fetches the portrait poster', async ({browser}) => {
    const context = await browser.newContext({viewport: WIDE, javaScriptEnabled: false});
    const page = await context.newPage();
    const paths = trackRequestPaths(page);
    await openWhite(page, '/ru');
    await page.waitForTimeout(SETTLE_MS);

    expect(paths, 'wide + no JS never requested the desktop poster at all').toContain(HERO.posterDesktopUrl!);
    expect(paths, 'wide + no JS requested the portrait poster').not.toContain(HERO.posterUrl!);

    await context.close();
  });
});
