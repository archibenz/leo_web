import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionForm from '../CollectionForm';
import CareGuideForm from '../CareGuideForm';

// Договоры сохранения двух оставшихся форм — коллекции и ухода. Тот же смысл,
// что у ProductFormSave.test.tsx: проверяется ТЕЛО ЗАПРОСА, а не разметка.
// Сняты с работающего кода ДО переезда форм на блоки Efferd, чтобы «поведение
// не тронуто» проверялось кодом, а не вниманием.

const {apiFetch, push} = vi.hoisted(() => ({apiFetch: vi.fn(), push: vi.fn()}));

vi.mock('../../../lib/api', () => ({apiFetch, getToken: () => 'token', API_BASE: ''}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({push, refresh: vi.fn()}),
  usePathname: () => '/ru/admin/collections/new',
}));

vi.mock('next-intl', () => ({useTranslations: () => (key: string) => key}));

vi.mock('../ImageUpload', () => ({default: () => null}));

// Форма ухода САМА оборачивается в оболочку админки, в отличие от двух других,
// которые оборачивают их страницы. Оболочка тянет сторож доступа и боковую
// панель с matchMedia — к договору сохранения это отношения не имеет.
vi.mock('../AdminLayout', () => ({
  default: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
}));

beforeEach(() => {
  apiFetch.mockReset().mockResolvedValue({});
  push.mockReset();
});

afterEach(cleanup);

// После переезда формы подпись СВЯЗАНА с полем, и поля ищутся по подписи —
// как их ищет человек и как их читает экранный диктор. До переезда так было
// нельзя: у <label> не было ни htmlFor, ни вложенного поля, и тест искал по
// порядку в разметке. Договор при этом не изменился ни на поле: ожидаемые тела
// запросов ниже те же, что были сняты с прежнего кода.
function поля() {
  return {
    name: screen.getByLabelText('name'),
    description: screen.getByLabelText('description'),
    sortOrder: screen.getByLabelText('sortOrder'),
    отправить: screen.getByRole('button', {name: 'save'}),
  };
}

describe('форма коллекции — что уходит на сервер', () => {
  it('новая коллекция: тело POST — ровно четыре поля', async () => {
    const user = userEvent.setup();
    render(<CollectionForm isNew />);

    const {name, description, sortOrder, отправить} = поля();

    await user.type(name, 'Осень 2026');
    await user.type(description, 'Плотные ткани');
    fireEvent.change(sortOrder, {target: {value: '3'}});

    await user.click(отправить);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/api/admin/collections', expect.anything()),
    );
    const [, opts] = apiFetch.mock.calls.find(([p]) => p === '/api/admin/collections')!;
    expect(opts.method).toBe('POST');
    // Форма коллекции отправляет СВОЁ СОСТОЯНИЕ ЦЕЛИКОМ (JSON.stringify(form)),
    // а не собранный вручную объект. Значит любое новое поле состояния уедет на
    // сервер само, даже если его туда не звали, — и этот кейс покраснеет.
    expect(JSON.parse(opts.body)).toEqual({
      name: 'Осень 2026',
      description: 'Плотные ткани',
      imageUrl: '',
      sortOrder: 3,
    });
  });

  it('правка: PUT по адресу коллекции, со страницы не уводит', async () => {
    const user = userEvent.setup();
    apiFetch.mockImplementation((path: string) =>
      path === '/api/admin/collections/c-1'
        ? Promise.resolve({name: 'Осень', description: '', imageUrl: '', sortOrder: 0})
        : Promise.resolve({}),
    );

    render(<CollectionForm collectionId="c-1" isNew={false} />);
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/collections/c-1'));

    apiFetch.mockClear();
    apiFetch.mockResolvedValue({});
    await user.click(поля().отправить);

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/api/admin/collections/c-1', expect.anything()),
    );
    const [, opts] = apiFetch.mock.calls.find(([p]) => p === '/api/admin/collections/c-1')!;
    expect(opts.method).toBe('PUT');
    expect(push).not.toHaveBeenCalled();
  });
});

describe('форма ухода — что уходит на сервер', () => {
  it('новая запись: пустые поля уходят как null, символы — строкой JSON', async () => {
    const user = userEvent.setup();
    render(<CareGuideForm />);

    // У этой формы нет элемента <form>: сохранение висит на кнопке. Поле
    // ищется по подписи — после переезда она связана с ним через id.
    await user.type(screen.getByLabelText('Название ткани'), 'Шёлк');

    await user.click(screen.getByRole('button', {name: 'Сохранить'}));

    await waitFor(() =>
      expect(apiFetch).toHaveBeenCalledWith('/api/admin/care-guides', expect.anything()),
    );
    const [, opts] = apiFetch.mock.calls.find(([p]) => p === '/api/admin/care-guides')!;
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.title).toBe('Шёлк');
    // Пустое — null, а не пустая строка: пустая строка печаталась бы на месте
    // описания пустым абзацем.
    expect(body.description).toBeNull();
    expect(body.tips).toBeNull();
    expect(body.image).toBeNull();
    // Символы ухода — СТРОКА с JSON, а не массив. Отправь массив, и бэкенд
    // положит в колонку не то, что читает витрина.
    expect(body.careSymbols).toBe('[]');
    expect(typeof body.careSymbols).toBe('string');
    expect(body.active).toBe(true);
  });

  it('без названия не отправляет вовсе', async () => {
    const user = userEvent.setup();
    render(<CareGuideForm />);

    await user.click(screen.getByRole('button', {name: 'Сохранить'}));

    // Проверка на пустое название сделана в самом обработчике, а не атрибутом
    // required: сообщение показывается формой. Значит запрос не должен уйти
    // вообще — иначе бэкенд получит запись без названия.
    await waitFor(() => expect(screen.getByText('Введите название')).toBeInTheDocument());
    expect(apiFetch).not.toHaveBeenCalledWith('/api/admin/care-guides', expect.anything());
  });
});
