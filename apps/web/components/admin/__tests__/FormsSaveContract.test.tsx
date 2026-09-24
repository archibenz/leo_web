import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CareGuideForm from '../CareGuideForm';

// Договор сохранения формы ухода. (Форма коллекции убрана 24.09 вместе с
// разделом: коллекциями управляет бот, см. BotAdminCollectionsTest.) Тот же смысл,
// что у ProductFormSave.test.tsx: проверяется ТЕЛО ЗАПРОСА, а не разметка.
// Сняты с работающего кода ДО переезда форм на блоки Efferd, чтобы «поведение
// не тронуто» проверялось кодом, а не вниманием.

const {apiFetch, push} = vi.hoisted(() => ({apiFetch: vi.fn(), push: vi.fn()}));

vi.mock('../../../lib/api', () => ({apiFetch, getToken: () => 'token', API_BASE: ''}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({push, refresh: vi.fn()}),
  usePathname: () => '/ru/admin/care/new',
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

describe('форма ухода — что уходит на сервер', () => {
  it('новая запись: пустые поля уходят как null, символы — строкой JSON', async () => {
    const user = userEvent.setup();
    render(<CareGuideForm />);

    // У этой формы нет элемента <form>: сохранение висит на кнопке. Поле
    // ищется по подписи — после переезда она связана с ним через id.
    //
    // Подписи здесь — КЛЮЧИ, как у двух форм выше: с 17.09 текст этого экрана
    // взят из словаря, а мок next-intl в шапке файла отдаёт ключ как есть. Так
    // тест утверждает, что вызван нужный ключ, а не что совпал русский текст.
    await user.type(screen.getByLabelText('fabricName'), 'Шёлк');

    await user.click(screen.getByRole('button', {name: 'save'}));

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

    await user.click(screen.getByRole('button', {name: 'save'}));

    // Проверка на пустое название сделана в самом обработчике, а не атрибутом
    // required: сообщение показывается формой. Значит запрос не должен уйти
    // вообще — иначе бэкенд получит запись без названия.
    await waitFor(() => expect(screen.getByText('errTitleRequired')).toBeInTheDocument());
    expect(apiFetch).not.toHaveBeenCalledWith('/api/admin/care-guides', expect.anything());
  });
});
