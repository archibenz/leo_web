import {test, expect, type Page} from '@playwright/test';
import {STOREFRONT_DRAFT_FIXTURE} from '../../lib/catalogue/fixture';
import {skipUnlessFixtureCatalogue} from '../fixtures/catalogue';
import {openSettledForOwner} from '../fixtures/white';

// P1: владелец открыл панель на телефоне и не смог добавить строку бегущей
// строки — вписал «Коллекция» в свободное поле «Куда ведёт», получил 400
// дважды на живом сайте (task-ticker-ux-brief.md). Эта спека проходит именно
// той дорогой, на которой он застрял: добавить строку, выбрать назначение из
// списка (не вписывать вручную), сохранить — без 400.
//
// Живой API не нужен — тот же приём, что 10-home-ticker.spec.ts: предпросмотр
// в CATALOGUE_SOURCE=fixture отдаёт STOREFRONT_DRAFT_FIXTURE без сети (см.
// lib/catalogue/fetch.ts), а PUT сохранения здесь перехватывает сама спека
// (07-storefront-editor.spec.ts — «локально nginx'а нет, и Next не
// проксирует /api»). Фикстура при этом неизменяема: сохранение не может
// заставить её отдать новую строку на перечитывании, и это свойство самой
// фикстуры, не пробел проверки. Поэтому здесь доказывается ровно то, что
// доступно честно: (1) запрос уходит с валидным телом — тем самым /ru/sets,
// от которого сервер раньше отбивал 400, а не с текстом «Коллекция»; (2) само
// сохранение проходит без отказа панели (нет alert, кнопка возвращается из
// «сохраняю…»); (3) строка со сделанным выбором остаётся на месте в панели.
// Серверное правило href остаётся под своим тестом (TickerItemRequest) и
// здесь не переисследуется — только форма, которая раньше пускала «Коллекция».
//
// openSettledForOwner (не openWhite впрямую) — ярлык «Бегущая строка» и
// панель зависят от isAdmin/editing, которые решаются асинхронно клиентским
// эффектом на /api/auth/me; действие сразу после навигации иногда обгоняло
// его же появление (третий кейс этого класса гонки в спеках после
// 12-edit-switch.spec.ts — см. комментарий у openSettledForOwner в
// fixtures/white.ts).

const TOKEN = 'fixture-editor-token';
const TICKER = STOREFRONT_DRAFT_FIXTURE.sections.find((s) => s.layout === 'ticker')!;
const NEW_ROW_INDEX = TICKER.items!.length + 1;
const NEW_ROW_TEXT = 'Открылись новые сеты';

// Тот же приём, что asOwner в 10-home-ticker.spec.ts / 07-storefront-editor.spec.ts:
// роль подменяется маршрутом, не настоящим логином.
async function asOwner(page: Page): Promise<void> {
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({id: 'owner', role: 'admin'})}),
  );
  await page.context().addCookies([{name: 'rl_session', value: TOKEN, domain: 'localhost', path: '/'}]);
  await page.addInitScript((token) => window.localStorage.setItem('reinasleo_token', token), TOKEN);
}

test.beforeEach(async ({request}) => {
  await skipUnlessFixtureCatalogue(request);
});

test('добавить строку, выбрать «Сеты» из списка, сохранить в черновик — без 400', async ({page}) => {
  let savedBody: {items: {ru: string; href: string | null}[]} | null = null;

  await asOwner(page);
  // PUT сохранения и GET списка черновиков (PublishList — вторая панель под
  // формой) перехватываются здесь же: без этого второй запрос упал бы в
  // отсутствующий локальный бэкенд и панель ниже формы показала бы свой
  // собственный alert, который спутался бы с проверкой «нет отказа» ниже.
  await page.route('**/api/admin/storefront/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() === 'PUT' && url.pathname === `/api/admin/storefront/sections/${TICKER.id}`) {
      savedBody = req.postDataJSON();
      await route.fulfill({status: 200, contentType: 'application/json', body: '{}'});
      return;
    }
    if (req.method() === 'GET' && url.pathname === '/api/admin/storefront/drafts') {
      await route.fulfill({status: 200, contentType: 'application/json', body: '[]'});
      return;
    }
    await route.abort();
  });

  await openSettledForOwner(page, '/ru?edit=1');
  await page.getByRole('button', {name: 'Бегущая строка'}).click();
  const panel = page.getByRole('complementary', {name: 'Правка витрины'});
  await expect(panel).toBeVisible();

  await panel.getByRole('button', {name: 'Добавить строку'}).click();
  const ruField = panel.getByLabel(`Текст (ru) · строка ${NEW_ROW_INDEX}`, {exact: true});
  await expect(ruField).toBeVisible();
  await ruField.fill(NEW_ROW_TEXT);

  // Дефект №1: раньше это было текстовое поле, и сюда вписывали «Коллекция».
  // Теперь — список; выбор пальцем/мышью, ничего не набирается руками.
  const destination = panel.getByLabel(`Куда ведёт · строка ${NEW_ROW_INDEX}`, {exact: true});
  await destination.selectOption('sets');
  await expect(destination).toHaveValue('sets');

  const saveButton = panel.getByRole('button', {name: /Сохранить в черновик|сохраняю/i});
  await saveButton.click();

  // Отказа нет — ни общей плашкой, ни у поля.
  await expect(saveButton).toHaveText('Сохранить в черновик', {timeout: 10_000});
  await expect(panel.getByRole('alert')).toHaveCount(0);

  expect(savedBody).not.toBeNull();
  const sent = savedBody!.items.find((item) => item.ru === NEW_ROW_TEXT);
  expect(sent, 'новая строка обязана уйти в теле PUT').toBeTruthy();
  expect(sent!.href).toBe('/ru/sets');

  // Строка остаётся в панели с тем же выбором — «появилась строка со ссылкой
  // на сеты» в границах, доступных без перечитывания неизменяемой фикстуры
  // (см. комментарий вверху файла).
  await expect(ruField).toHaveValue(NEW_ROW_TEXT);
  await expect(destination).toHaveValue('sets');
});
