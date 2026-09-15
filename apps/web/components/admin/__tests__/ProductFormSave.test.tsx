import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {fireEvent} from '@testing-library/react';
import ProductForm from '../ProductForm';

// ДОГОВОР СОХРАНЕНИЯ ФОРМЫ ТОВАРА.
//
// У трёх форм админки не было ни одного теста на запись. Это значит, что
// «переодели, поведение не тронули» проверялось прогоном руками по девятнадцати
// полям — и проверка держалась на внимании, а не на коде. Перед переездом форм
// на блоки Efferd договор снят здесь и закреплён.
//
// Проверяется РОВНО ОДНО: какое тело уходит на сервер. Не разметка, не классы,
// не подписи — они и должны меняться. Тело меняться не должно ничем.
//
// Поля ищутся ПО ПОДПИСИ — как их ищет человек и как их читает экранный
// диктор. До переезда так было нельзя: у <label> не было ни htmlFor, ни
// вложенного поля, и первая редакция этого теста искала по порядку в разметке.
// Дефект нашёлся именно здесь и починен переездом; ожидаемые тела запросов
// при этом те же, что были сняты с прежнего кода, — в них не изменилось ни
// одного поля.

// vi.hoisted обязателен: vi.mock поднимается ВЫШЕ объявлений, и обычный
// `const apiFetch = vi.fn()` в фабрике оказался бы в мёртвой зоне. Отказ при
// этом тихий — форма просто не получает ответов, а тест жалуется, что вызова
// не было, и уводит искать не туда. Стоило одного прогона.
const {apiFetch, push} = vi.hoisted(() => ({apiFetch: vi.fn(), push: vi.fn()}));

vi.mock('../../../lib/api', () => ({
  apiFetch,
  getToken: () => 'token',
  API_BASE: '',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({push}),
  usePathname: () => '/ru/admin/products/new',
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Загрузка кадров ходит в сеть и к файловой системе; к договору сохранения она
// отношения не имеет — картинки кладутся в форму отдельным полем и здесь
// остаются пустыми.
vi.mock('../ImageUpload', () => ({
  default: () => null,
}));

beforeEach(() => {
  apiFetch.mockReset();
  push.mockReset();
  // Список коллекций форма просит при монтировании.
  apiFetch.mockImplementation((path: string) =>
    path === '/api/admin/collections'
      ? Promise.resolve([{id: 'col-1', name: 'Осень'}])
      : Promise.resolve({}),
  );
});

afterEach(cleanup);

// Выпадающие списки теперь Radix, а не родной <select>: выбор делается
// нажатием на список и затем на пункт.
async function выбрать(user: ReturnType<typeof userEvent.setup>, подпись: string, пункт: string) {
  await user.click(screen.getByLabelText(подпись));
  await user.click(await screen.findByRole('option', {name: пункт}));
}

describe('форма товара — что уходит на сервер', () => {
  it('новый товар: тело POST собрано из полей ровно так, как договорено', async () => {
    const user = userEvent.setup();
    render(<ProductForm isNew productId={undefined} />);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/collections'));

    await user.type(screen.getByLabelText('id'), 'leya-sand');
    await user.type(screen.getByLabelText('title'), 'Платье «Лея»');
    await user.type(screen.getByLabelText('subtitle'), 'Вечернее · Шёлк');
    const price = screen.getByLabelText('price');
    const stock = screen.getByLabelText('stock');
    const threshold = screen.getByLabelText('threshold');
    await user.clear(price);
    await user.type(price, '28900');
    await user.clear(stock);
    await user.type(stock, '7');
    await user.clear(threshold);
    await user.type(threshold, '3');
    await user.type(screen.getByLabelText('sku'), 'LEYA-S');
    await user.type(screen.getByLabelText('color'), 'песок');
    await user.type(screen.getByLabelText('material'), 'шёлк');
    await user.type(screen.getByLabelText('description'), 'Длинное платье');
    await user.type(screen.getByLabelText('Описание ухода'), 'Только химчистка');
    await выбрать(user, 'category', 'categories.dresses');
    await выбрать(user, 'occasion', 'occasions.evening');
    await выбрать(user, 'collection', 'Осень');
    await user.click(screen.getByRole('switch', {name: 'active'})); // true → false

    // Размеры — кнопки-чипы, не поля.
    await user.click(screen.getByRole('button', {name: 'M'}));

    apiFetch.mockClear();
    apiFetch.mockResolvedValue({});

    await user.click(screen.getByRole('button', {name: 'save'}));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/products', expect.anything()));

    const [, opts] = apiFetch.mock.calls.find(([p]) => p === '/api/admin/products')!;
    expect(opts.method).toBe('POST');

    // Полный договор. Каждое поле названо явно: сравнение целиком, а не по
    // отдельным ключам, ловит и ЛИШНЕЕ поле, которое кто-нибудь допишет.
    expect(JSON.parse(opts.body)).toEqual({
      id: 'leya-sand',
      title: 'Платье «Лея»',
      subtitle: 'Вечернее · Шёлк',
      description: 'Длинное платье',
      price: 28900,
      stockQuantity: 7,
      lowStockThreshold: 3,
      sku: 'LEYA-S',
      category: 'dresses',
      occasion: 'evening',
      color: 'песок',
      material: 'шёлк',
      collectionId: 'col-1',
      sizes: ['M'],
      active: false,
      images: '[]',
      careInstructions: JSON.stringify({symbols: [], text: 'Только химчистка'}),
    });
  });

  it('пустые необязательные поля уходят как null, а не как пустая строка', async () => {
    const user = userEvent.setup();
    render(<ProductForm isNew productId={undefined} />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/collections'));

    // Идентификатор помечен required — без него браузер не даст отправить.
    await user.type(screen.getByLabelText('id'), 'min');
    await user.type(screen.getByLabelText('title'), 'Минимум');
    fireEvent.change(screen.getByLabelText('price'), {target: {value: '100'}});

    apiFetch.mockClear();
    apiFetch.mockResolvedValue({});
    await user.click(screen.getByRole('button', {name: 'save'}));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/products', expect.anything()));
    const [, opts] = apiFetch.mock.calls.find(([p]) => p === '/api/admin/products')!;
    const body = JSON.parse(opts.body);

    // Разница между '' и null здесь не косметическая: пустая строка пишется в
    // базу как пустая строка и потом печатается на сайте пустым местом, а null
    // означает «не задано» и на сайт не выводится вовсе.
    for (const ключ of ['category', 'occasion', 'color', 'material', 'subtitle', 'sku', 'collectionId']) {
      expect(body[ключ], `${ключ} обязан быть null, а не пустой строкой`).toBeNull();
    }
    // Ухода нет вовсе — не пустой объект, а null.
    expect(body.careInstructions).toBeNull();
  });

  // Два дефекта ввода, найденные этим файлом при написании договора. Оба про
  // порог остатка, и оба про одно: запасное значение подставлялось на каждом
  // нажатии вместо того, чтобы быть начальным.
  it('порог можно очистить и набрать заново — получается то, что набрал', async () => {
    const user = userEvent.setup();
    render(<ProductForm isNew productId={undefined} />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/collections'));

    const threshold = screen.getByLabelText('threshold') as HTMLInputElement;
    await user.clear(threshold);
    await user.type(threshold, '3');

    // Прежде выходило 53: очистка подставляла 5, и тройка приписывалась к нему.
    expect(threshold.value).toBe('3');
  });

  it('порог можно поставить в ноль — прежде ноль молча становился пятёркой', async () => {
    const user = userEvent.setup();
    render(<ProductForm isNew productId={undefined} />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/collections'));

    await user.type(screen.getByLabelText('id'), 'zero');
    await user.type(screen.getByLabelText('title'), 'Ноль');
    const threshold = screen.getByLabelText('threshold');
    await user.clear(threshold);
    await user.type(threshold, '0');

    apiFetch.mockClear();
    apiFetch.mockResolvedValue({});
    await user.click(screen.getByRole('button', {name: 'save'}));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/products', expect.anything()));
    const [, opts] = apiFetch.mock.calls.find(([p]) => p === '/api/admin/products')!;
    // `parseInt('0') || 5` возвращал 5. Владелец ставил ноль, сохранял и
    // получал пять, ничего об этом не узнав.
    expect(JSON.parse(opts.body).lowStockThreshold).toBe(0);
  });

  it('правка существующего: тот же договор, но PUT по адресу товара', async () => {
    const user = userEvent.setup();
    apiFetch.mockImplementation((path: string) => {
      if (path === '/api/admin/collections') return Promise.resolve([{id: 'col-1', name: 'Осень'}]);
      if (path === '/api/admin/products/p-1') {
        return Promise.resolve({
          id: 'leya', title: 'Лея', description: '', price: 100, category: null,
          sizes: [], collectionId: null, stockQuantity: 1, lowStockThreshold: 5,
          occasion: null, color: null, material: null, subtitle: null, sku: null,
          active: true, images: '[]', careInstructions: null,
        });
      }
      return Promise.resolve({});
    });

    render(<ProductForm isNew={false} productId="p-1" />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/products/p-1'));

    apiFetch.mockClear();
    apiFetch.mockResolvedValue({});
    await user.click(screen.getByRole('button', {name: 'save'}));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/api/admin/products/p-1', expect.anything()),
    );
    const [, opts] = apiFetch.mock.calls.find(([p]) => p === '/api/admin/products/p-1')!;
    expect(opts.method).toBe('PUT');
    // Переход к списку делается только у нового товара; правка остаётся на
    // странице. Проверяем, потому что это поведение легко потерять.
    expect(push).not.toHaveBeenCalled();
  });
});
