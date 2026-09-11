import {test, type APIRequestContext} from '@playwright/test';
import {STOREFRONT_FIXTURE} from '../../lib/catalogue/fixture';

// Специй 02 и 03 проверяют вещи из фикстуры (lib/catalogue/fixture.ts), а
// подставляет её только тот dev-сервер, который поднял сам Playwright:
// playwright.config.ts передаёт CATALOGUE_SOURCE=fixture в webServer. С
// E2E_SKIP_WEB_SERVER=1 (свой сервер, деплой) этой переменной нет, и спек
// сравнивал бы фикстуру с настоящим каталогом — падение, которое ничего не
// говорит о продукте. Поэтому перед прогоном спрашиваем саму страницу.
//
// Метка выбрана так, чтобы её нельзя было получить случайно: фикстура нарочно
// называет вариант wb-795522033 чёрным, а в каталоге это слоновая кость. PDP
// печатает имя каждого цвета в aria-label свотча (WhitePdpShowcase), так что
// обе проверки — про один и тот же товар и один и тот же элемент.
const PRODUCT = STOREFRONT_FIXTURE.products[0]!;
const FIXTURE_ONLY = `aria-label="${PRODUCT.colors[0]!.ru}"`;
const CATALOGUE_ONLY = 'aria-label="Слоновая кость"';

export const FIXTURE_REQUIRED =
  'the served catalogue is not the fixture — start the dev server with CATALOGUE_SOURCE=fixture';

// Ответ один на воркер: страница за прогон не меняется, а лишний запрос на
// каждый тест — лишняя секунда на холодной компиляции.
let servesFixture: boolean | null = null;

export async function skipUnlessFixtureCatalogue(request: APIRequestContext): Promise<void> {
  if (servesFixture === null) {
    try {
      const res = await request.get(`/ru/product/${PRODUCT.slug}`);
      const html = res.ok() ? await res.text() : '';
      servesFixture = html.includes(FIXTURE_ONLY) && !html.includes(CATALOGUE_ONLY);
    } catch {
      // Сервер не ответил вовсе — это тоже «фикстуры нет».
      servesFixture = false;
    }
  }
  test.skip(!servesFixture, FIXTURE_REQUIRED);
}
