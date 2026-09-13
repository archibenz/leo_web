import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {NextIntlClientProvider} from 'next-intl';
import type {ComponentProps} from 'react';
import rawMessages from '../../../messages/ru.json';
import type {StorefrontSection, WhiteProduct} from '../../../lib/catalogue/types';

// messages/ru.json содержит string[] (home.philosophy.statements), а next-intl
// типизирует messages как AbstractIntlMessages (значения — только string или
// вложенные объекты) — расхождение чисто в типах JSON-литерала, не в рантайме:
// next-intl прекрасно печатает массивы там, где на них зовут t.raw(). Берём тип
// прямо у самого компонента, а не гадаем, откуда next-intl реэкспортирует
// AbstractIntlMessages.
const messages = rawMessages as unknown as ComponentProps<typeof NextIntlClientProvider>['messages'];

// «Куда ведёт» — выбор словами, а не текстовое поле (task-ticker-ux-brief.md,
// дефект №1, главный). Владелец вписал «Коллекция», получил 400 дважды и не
// смог добавить строку на живом сайте — это P1. Эти тесты и заменяют, и
// расширяют прежний блок «бегущая строка (TickerForm)» из EditorPanel.test.tsx:
// та версия проверяла свободный ввод в href, которого больше нет.

const calls: {path: string; init?: {method?: string; body?: unknown}}[] = [];
const answer = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => 'admin-token',
  API_BASE: '',
  apiFetch: (path: string, init?: {method?: string; body?: unknown}) => {
    calls.push({path, init});
    return answer(path, init);
  },
}));

import TickerForm from '../TickerForm';

const TICKER_SECTION: StorefrontSection = {
  id: 'tick-1',
  slug: 'home-ticker',
  layout: 'ticker',
  status: 'active',
  nameRu: 'Бегущая строка',
  nameEn: 'Home ticker',
  sortOrder: -1,
  items: [
    {ru: 'Скидка 20% до воскресенья', en: '20% off until Sunday', href: '/ru/sets', until: '2026-09-14'},
    {ru: 'Открытие шоурума', en: 'Showroom opening', href: '/ru/lookbook'},
  ],
};

const PRODUCTS: WhiteProduct[] = [
  {
    id: 'p1', key: 2, slug: 'palto-pidzhak-pritalennoe', en: 'Fitted Blazer Coat', ru: 'Пальто-пиджак приталенное',
    cat: 'outerwear', descEn: '', descRu: '', compositionEn: '', compositionRu: '', careEn: '', careRu: '',
    colors: [], image: '/images/white/products/p-1.jpg', nm: 1,
  },
  {
    id: 'p2', key: 8, slug: 'yubka-ballon-atlasnaya', en: 'Satin Balloon Skirt', ru: 'Юбка баллон атласная',
    cat: 'skirts', descEn: '', descRu: '', compositionEn: '', compositionRu: '', careEn: '', careRu: '',
    colors: [], image: '/images/white/products/p-2.jpg', nm: 2,
  },
];

function renderForm(props: Partial<Parameters<typeof TickerForm>[0]> = {}) {
  return render(
    <NextIntlClientProvider locale="ru" messages={messages}>
      <TickerForm section={TICKER_SECTION} products={PRODUCTS} locale="ru" onSaved={() => {}} {...props} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  calls.length = 0;
  answer.mockReset().mockResolvedValue({});
});

afterEach(cleanup);

describe('чтение существующих строк', () => {
  it('разбирает href обратно в выбор — /ru/sets это «Сеты», /ru/lookbook это «Лукбук»', () => {
    renderForm();

    expect(screen.getByLabelText('Куда ведёт · строка 1')).toHaveValue('sets');
    expect(screen.getByLabelText('Куда ведёт · строка 2')).toHaveValue('lookbook');
    expect(screen.getByRole('button', {name: /Сохранить в черновик/i})).toBeDisabled();
  });

  it('дата в строке 1 выводится по-русски рядом с полем', () => {
    renderForm();
    expect(screen.getByText('14 сентября 2026 г.')).toBeInTheDocument();
  });
});

describe('«Куда ведёт» — выбор вместо текстового поля (дефект №1)', () => {
  it('«Магазин» кладёт /<locale>/shop', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'shop');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(calls).toHaveLength(1));
    const body = JSON.parse(String(calls[0]!.init?.body)) as {items: {href: string | null}[]};
    expect(body.items[0]!.href).toBe('/ru/shop');
  });

  it('«Без ссылки» кладёт null', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'none');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(calls).toHaveLength(1));
    const body = JSON.parse(String(calls[0]!.init?.body)) as {items: {href: string | null}[]};
    expect(body.items[0]!.href).toBeNull();
  });

  it('«Конкретный товар» открывает второй выбор и кладёт /<locale>/product/<slug>', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'product');
    // Второй выбор подставляется сразу первым товаром — не пустой, не ловушка.
    expect(screen.getByLabelText('Какой товар · строка 1')).toHaveValue('palto-pidzhak-pritalennoe');

    await user.selectOptions(screen.getByLabelText('Какой товар · строка 1'), 'yubka-ballon-atlasnaya');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(calls).toHaveLength(1));
    const body = JSON.parse(String(calls[0]!.init?.body)) as {items: {href: string | null}[]};
    expect(body.items[0]!.href).toBe('/ru/product/yubka-ballon-atlasnaya');
  });

  it('без товаров в каталоге «Конкретный товар» не подсовывает пустой список, а объясняет по-русски', async () => {
    const user = userEvent.setup();
    renderForm({products: []});

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'product');

    expect(screen.queryByLabelText('Какой товар · строка 1')).not.toBeInTheDocument();
    expect(screen.getByText(/Список товаров пуст/)).toBeInTheDocument();
  });

  it('«Своя ссылка» с внешним адресом физически не даёт сохранить и показывает русский текст у поля', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'custom');
    await user.type(screen.getByLabelText('Адрес ссылки · строка 1'), 'https://evil.example/phish');

    expect(screen.getByRole('button', {name: /Сохранить в черновик/i})).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Ссылка должна вести на страницу нашего сайта — выберите из списка.');
    expect(calls).toHaveLength(0);
  });

  it('«Своя ссылка» с корректным локальным путём разрешает сохранить', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'custom');
    await user.type(screen.getByLabelText('Адрес ссылки · строка 1'), '/ru/contact');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(calls).toHaveLength(1));
    const body = JSON.parse(String(calls[0]!.init?.body)) as {items: {href: string | null}[]};
    expect(body.items[0]!.href).toBe('/ru/contact');
  });
});

describe('отказ сервера — русский текст у той самой строки и поля (дефект №2)', () => {
  it('errors: [{field: "items[1].href", …}] рисует текст у ВТОРОЙ строки, не у первой и не сверху', async () => {
    answer.mockRejectedValue(
      Object.assign(new Error('Validation failed'), {
        status: 400,
        body: {
          message: 'Validation failed',
          errors: [{field: 'items[1].href', message: 'href must be a local /path, not an external address'}],
        },
      }),
    );
    const user = userEvent.setup();
    renderForm();

    // Тронуть форму, иначе «Сохранить» выключена нечем.
    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'shop');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    const alerts = await screen.findAllByRole('alert');
    const secondRowLabel = screen.getByLabelText('Куда ведёт · строка 2').closest('div');
    const firstRowLabel = screen.getByLabelText('Куда ведёт · строка 1').closest('div');

    expect(secondRowLabel).toContainElement(screen.getByText('Ссылка должна вести на страницу нашего сайта — выберите из списка.'));
    expect(firstRowLabel).not.toContainElement(screen.getByText('Ссылка должна вести на страницу нашего сайта — выберите из списка.'));
    // Не общей плашкой сверху формы — ровно один alert, и он у строки 2.
    expect(alerts).toHaveLength(1);
  });
});

describe('отказ сервера — незнакомое поле никогда не проваливается молча (правка координатора)', () => {
  it('errors: [{field: "items[0].somethingNew", …}] показывает что-то видимое, по-русски, с именем поля из ответа', async () => {
    answer.mockRejectedValue(
      Object.assign(new Error('Validation failed'), {
        status: 400,
        body: {message: 'Validation failed', errors: [{field: 'items[0].somethingNew', message: 'some english reason'}]},
      }),
    );
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'shop');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    const alert = await screen.findByRole('alert');
    // (а) видно — findByRole уже гарантирует; (б) по-русски — не несёт
    // английский текст ответа; (в) имя поля из ответа присутствует дословно.
    expect(alert).toHaveTextContent('items[0].somethingNew');
    expect(alert).not.toHaveTextContent('some english reason');
    expect(alert.textContent).toMatch(/[а-яё]/i);
  });
});

describe('отказ сервера — вообще без errors[] (500, сеть) не показывает английский текст', () => {
  it('body без errors — общий русский текст, не body.message', async () => {
    answer.mockRejectedValue(Object.assign(new Error('Unexpected error'), {status: 500, body: {message: 'Unexpected error'}}));
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'shop');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('Unexpected error');
    expect(alert.textContent).toMatch(/[а-яё]/i);
  });

  it('сетевой сбой без .body вовсе — тоже не молчит и не течёт по-английски', async () => {
    answer.mockRejectedValue(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Куда ведёт · строка 1'), 'shop');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    const alert = await screen.findByRole('alert');
    expect(alert).not.toHaveTextContent('Failed to fetch');
    expect(alert.textContent).toMatch(/[а-яё]/i);
  });
});

describe('строки списка — не изменившееся поведение', () => {
  it('«Добавить строку» заводит пустую строку с «Без ссылки» по умолчанию', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', {name: 'Добавить строку'}));

    expect(screen.getByLabelText('Текст (ru) · строка 3')).toHaveValue('');
    expect(screen.getByLabelText('Куда ведёт · строка 3')).toHaveValue('none');
    expect(screen.getByRole('button', {name: /Сохранить в черновик/i})).toBeEnabled();
  });

  it('«убрать» снимает строку из списка — бывшая строка 2 сдвигается на её место', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getAllByRole('button', {name: 'убрать'})[0]!);

    expect(screen.queryByLabelText('Текст (ru) · строка 2')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Текст (ru) · строка 1')).toHaveValue('Открытие шоурума');
  });
});
