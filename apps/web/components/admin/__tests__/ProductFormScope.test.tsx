import {render, screen} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import ProductForm from '../ProductForm';

// Половина полей этой формы не доходит до страниц сайта: форма пишет строку
// ВАРИАНТА (`products`), а витрина берёт имя и описание из МОДЕЛИ
// (`product_models`) — StorefrontMapping читает из варианта только price,
// salePrice, colorKey/Hex/Name*, image, images, stockQuantity, active,
// sortOrder. При этом цена и наличие из той же формы работают, поэтому на вид
// поля неотличимы: сохранение проходит, поле записывается, страница не
// меняется.
//
// Подпись — единственное, что сегодня отделяет владельца от уверенности, что
// он переименовал товар. Снимать её можно будет только вместе с выводом полей
// модели в редактор — этот тест не даст снять её молча.

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/admin/products/new',
  useRouter: () => ({push: vi.fn()}),
}));

// Ключ отдаётся как есть — так тест утверждает, что нужный ключ ВЫЗВАН, а не
// что совпал русский текст: переписывание формулировки не должно ронять
// сторож, а удаление подписи должно.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('../../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ok: true, json: async () => []}),
}));

vi.mock('../ImageUpload', () => ({default: () => null}));

describe('форма товара честно говорит, что доходит до сайта', () => {
  it('над формой стоит оговорка про область действия полей', () => {
    render(<ProductForm isNew />);
    expect(screen.getByText('scopeNotice')).toBeInTheDocument();
  });

  it('название, подзаголовок и описание помечены как не показываемые на сайте', () => {
    render(<ProductForm isNew />);
    // Ровно три: название, подзаголовок, описание. Цена и наличие пометки не
    // несут — они на сайт попадают, и лишняя пометка соврала бы в другую
    // сторону.
    expect(screen.getAllByText('notOnSite')).toHaveLength(3);
  });
});
