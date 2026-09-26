import {render, screen, cleanup, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../../../messages/ru.json';
import AdminProductsPage from '../products/page';

// Список товаров админки (вычистка 26.09): тестовые (демо) товары скрыты по
// умолчанию — на проде их 13 из 100, все неактивны, английскими названиями
// стояли первыми. Не удалены (на них могут быть ссылки) — показываются по
// переключателю. Категория — по-русски, а не слагом «dresses».

const apiFetch = vi.fn();
vi.mock('../../../../../lib/api', () => ({
  apiFetch: (path: string, init?: RequestInit) => apiFetch(path, init),
}));
vi.mock('next/navigation', () => ({usePathname: () => '/ru/admin/products'}));

const product = (id: string, title: string, isTest: boolean, category = 'dresses') => ({
  id, title, category, isTest, active: !isTest, price: 1000, stockQuantity: 1, collectionName: null,
});
const PRODUCTS = [
  product('demo-gown', 'Silk Evening Gown', true),
  product('palto-seryy', 'Пальто-пиджак — Серый', false, 'outerwear'),
  product('plate-chernoe', 'Платье — Чёрное', false),
];

function renderPage() {
  return render(
    <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
      <AdminProductsPage />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(PRODUCTS);
});

afterEach(cleanup);

describe('список товаров', () => {
  it('тестовые скрыты по умолчанию и показываются переключателем', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Пальто-пиджак — Серый');
    expect(screen.queryByText('Silk Evening Gown')).toBeNull();

    await user.click(screen.getByRole('switch', {name: 'Показывать тестовые (1)'}));
    expect(await screen.findByText('Silk Evening Gown')).toBeInTheDocument();
  });

  it('категория — по-русски, не слагом', async () => {
    renderPage();
    const row = (await screen.findByText('Пальто-пиджак — Серый')).closest('tr')!;
    expect(within(row).getByText('Верхняя одежда')).toBeInTheDocument();
    expect(within(row).queryByText('outerwear')).toBeNull();
  });
});

// Ручки /api/admin/products/{id}/recommendations в API нет с 6220cfdd; блок,
// который в неё ходил, снят 26.09. Вернётся вызов — вернётся 404 на каждой
// загрузке правки товара.
describe('в админке нет вызовов удалённой ручки рекомендаций', () => {
  it('ни один файл админки не зовёт /recommendations', () => {
    const roots = ['app/[locale]/(admin)', 'components/admin'].map((d) => resolve(process.cwd(), d));
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name !== '__tests__') walk(full);
        } else if (/\.tsx?$/.test(name) && /\/recommendations[`'"]/.test(readFileSync(full, 'utf8'))) {
          offenders.push(full);
        }
      }
    };
    roots.forEach(walk);
    expect(offenders).toEqual([]);
  });
});
