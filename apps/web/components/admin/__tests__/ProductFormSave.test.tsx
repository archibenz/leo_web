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
// Поля выбираются по порядку в разметке, а не по подписи, и это не лень:
// в нынешней форме подпись НЕ СВЯЗАНА с полем — у <label> нет ни htmlFor, ни
// вложенного поля. То есть экранный диктор не назовёт ни одного из девятнадцати.
// Это отдельный дефект, он чинится переездом; но тест, написанный ДО починки,
// обязан работать с тем, что есть.

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

function поля() {
  const form = document.querySelector('form') as HTMLFormElement;
  return {
    form,
    тексты: Array.from(form.querySelectorAll<HTMLInputElement>('input.admin-input')),
    области: Array.from(form.querySelectorAll<HTMLTextAreaElement>('textarea.admin-input')),
    списки: Array.from(form.querySelectorAll<HTMLSelectElement>('select.admin-input')),
    флажок: form.querySelector<HTMLInputElement>('input[type="checkbox"]')!,
  };
}

describe('форма товара — что уходит на сервер', () => {
  it('новый товар: тело POST собрано из полей ровно так, как договорено', async () => {
    const user = userEvent.setup();
    render(<ProductForm isNew productId={undefined} />);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/collections'));

    const {тексты, области, списки, флажок} = поля();
    // Порядок в разметке: id, название, подзаголовок, цена, остаток, порог,
    // артикул, цвет, материал.
    const [id, title, subtitle, price, stock, threshold, sku, color, material] = тексты;
    const [description, careText] = области;
    const [category, occasion, collection] = списки;

    await user.type(id, 'leya-sand');
    await user.type(title, 'Платье «Лея»');
    await user.type(subtitle, 'Вечернее · Шёлк');
    await user.clear(price);
    await user.type(price, '28900');
    await user.clear(stock);
    await user.type(stock, '7');
    // Через fireEvent, а не набором, и причина стоит того, чтобы её записать.
    // Очистка числового поля вызывает onChange с пустой строкой, а обработчик
    // подставляет запасное значение (`parseInt(...) || 5`). Поле снова
    // показывает 5, набранная следом тройка приписывается к нему, и выходит 53.
    // То есть ОЧИСТИТЬ И НАБРАТЬ ЗАНОВО нельзя — получится не то, что набрал.
    // Это настоящий дефект ввода, найден этим тестом; чинится вместе с
    // переездом формы (запасное значение должно применяться при сохранении, а
    // не на каждом нажатии). Здесь проверяется договор сохранения, а не способ
    // набора, поэтому значение ставится напрямую.
    fireEvent.change(threshold, {target: {value: '3'}});
    await user.type(sku, 'LEYA-S');
    await user.type(color, 'песок');
    await user.type(material, 'шёлк');
    await user.type(description, 'Длинное платье');
    await user.type(careText, 'Только химчистка');
    await user.selectOptions(category, 'dresses');
    await user.selectOptions(occasion, 'evening');
    await user.selectOptions(collection, 'col-1');
    await user.click(флажок); // active: true → false

    // Размеры — кнопки-чипы, не поля.
    await user.click(screen.getByRole('button', {name: 'M'}));

    apiFetch.mockClear();
    apiFetch.mockResolvedValue({});

    const submit = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    await user.click(submit);

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

    const {тексты} = поля();
    const [id, title, , price] = тексты;
    // Идентификатор помечен required — без него браузер не даст отправить.
    await user.type(id, 'min');
    await user.type(title, 'Минимум');
    fireEvent.change(price, {target: {value: '100'}});

    apiFetch.mockClear();
    apiFetch.mockResolvedValue({});
    await user.click(document.querySelector('button[type="submit"]') as HTMLButtonElement);

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
    await user.click(document.querySelector('button[type="submit"]') as HTMLButtonElement);

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
