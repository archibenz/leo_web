import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../../../messages/ru.json';
import AdminProductsPage from '../products/page';
import AdminCarePage from '../care/page';
import EditCareGuidePage from '../care/[id]/page';
import AdminInventoryPage from '../inventory/page';
import AdminHomepagePage from '../homepage/page';
import ProductForm from '../../../../../components/admin/ProductForm';
import {FormActions} from '../../../../../components/admin/form/field';

const {apiFetch} = vi.hoisted(() => ({apiFetch: vi.fn()}));
vi.mock('../../../../../lib/api', () => ({apiFetch}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/admin/products', useRouter: () => ({push: vi.fn()}), useParams: () => ({id: 'p-1'}),
}));
vi.mock('../../../../../components/admin/ImageUpload', () => ({default: () => null}));

const product = {id: 'p-1', title: 'Лея', active: true, isTest: false, category: null, price: 100,
  stockQuantity: 4, lowStockThreshold: 0, images: '[]'};
function show(node: React.ReactNode) {
  return render(<NextIntlClientProvider locale="ru" messages={ruMessages as never}>{node}</NextIntlClientProvider>);
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {resolve = done; reject = fail;});
  return {promise, resolve, reject};
}
beforeEach(() => {apiFetch.mockReset();});
afterEach(() => {cleanup(); vi.restoreAllMocks();});

describe('admin read failures are recoverable and never look empty', () => {
  it.each([
    ['products', AdminProductsPage, ruMessages.admin.product.noProducts],
    ['care', AdminCarePage, ruMessages.admin.careGuides.empty],
    ['inventory', AdminInventoryPage, ruMessages.admin.product.noProducts],
  ])('%s shows a retry after a failed GET', async (_name, Page, empty) => {
    apiFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    show(<Page />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить');
    expect(screen.queryByText(empty)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Повторить'}));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByText(empty)).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('does not expose a blank product form before or after failed GET; retry restores saved zero', async () => {
    const pending = deferred<typeof product>();
    apiFetch.mockImplementation((path: string) => path.endsWith('/collections') ? Promise.resolve([]) : pending.promise);
    const user = userEvent.setup();
    show(<ProductForm productId="p-1" />);
    expect(screen.queryByRole('button', {name: 'Сохранить'})).not.toBeInTheDocument();
    await act(async () => pending.reject(new Error('offline')));
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить');
    expect(screen.queryByLabelText(ruMessages.admin.product.title)).not.toBeInTheDocument();
    apiFetch.mockImplementation((path: string) => Promise.resolve(path.endsWith('/collections') ? [] : product));
    await user.click(screen.getByRole('button', {name: 'Повторить'}));
    expect(await screen.findByLabelText(ruMessages.admin.product.threshold)).toHaveValue(0);
    await user.click(screen.getByRole('button', {name: 'Сохранить'}));
    const [, init] = apiFetch.mock.calls.find(([, init]) => init?.method === 'PUT')!;
    expect(JSON.parse(init.body).lowStockThreshold).toBe(0);
  });

  it('homepage does not allow saving initial defaults when its GET fails', async () => {
    apiFetch.mockRejectedValue(new Error('offline'));
    show(<AdminHomepagePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить');
    expect(screen.queryByRole('button', {name: ruMessages.admin.saveSettings})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Повторить'})).toBeEnabled();
    expect(apiFetch.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false);
  });

  it('retries product collection options without reloading or losing edited product values', async () => {
    apiFetch.mockImplementation((path: string) => path.endsWith('/collections')
      ? Promise.reject(new Error('offline')) : Promise.resolve(product));
    const user = userEvent.setup();
    show(<ProductForm productId="p-1" />);
    const title = await screen.findByLabelText(ruMessages.admin.product.title);
    fireEvent.change(title, {target: {value: 'Лея новая'}});
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить коллекции');
    expect(screen.getByRole('combobox', {name: ruMessages.admin.product.collection})).toBeDisabled();
    apiFetch.mockImplementation((path: string) => Promise.resolve(path.endsWith('/collections') ? [] : product));
    await user.click(screen.getByRole('button', {name: 'Повторить'}));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(title).toHaveValue('Лея новая');
    expect(apiFetch.mock.calls.filter(([path]) => path === '/api/admin/products/p-1')).toHaveLength(1);
  });

  it('care edit preserves a failed read as an error with retry', async () => {
    apiFetch.mockRejectedValue(new Error('offline'));
    show(<EditCareGuidePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить');
    expect(screen.queryByText('Not found')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Сохранить'})).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Повторить'})).toBeEnabled();
  });
});

describe('admin mutations keep errors and pending state at the action', () => {
  it('stock input has a product-specific name, freezes pending edits, and preserves them on failure', async () => {
    const pending = deferred<unknown>();
    apiFetch.mockImplementation((_path: string, init?: RequestInit) => init?.method === 'PATCH' ? pending.promise : Promise.resolve([product]));
    const user = userEvent.setup();
    show(<AdminInventoryPage />);
    await user.click(await screen.findByRole('button', {name: ruMessages.admin.product.updateStock}));
    const input = screen.getByRole('spinbutton', {name: 'Остаток: Лея'});
    fireEvent.change(input, {target: {value: '0'}});
    await user.click(screen.getByRole('button', {name: ruMessages.admin.ok}));
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', {name: ruMessages.admin.ok})).toBeDisabled();
    expect(screen.getByRole('button', {name: ruMessages.admin.cancel})).toBeDisabled();
    await act(async () => pending.reject(new Error('offline')));
    expect(input).toHaveValue(0);
    expect(input).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось сохранить остаток');
    expect(screen.getByText('Лея')).toBeInTheDocument();
    apiFetch.mockResolvedValue({...product, stockQuantity: 0});
    await user.click(screen.getByRole('button', {name: ruMessages.admin.ok}));
    await waitFor(() => expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument());
    expect(screen.getByText('0')).toBeInTheDocument();
    const [, init] = apiFetch.mock.calls.filter(([, init]) => init?.method === 'PATCH').at(-1)!;
    expect(JSON.parse(init.body)).toEqual({quantity: 0});
  });

  it.each([['products', AdminProductsPage, product], ['care', AdminCarePage, {...product, careSymbols: '[]', sortOrder: 0}]])(
    '%s delete disables its own row and reports failure without dropping data', async (_name, Page, row) => {
      const pending = deferred<unknown>();
      apiFetch.mockImplementation((_path: string, init?: RequestInit) => init?.method === 'DELETE' ? pending.promise : Promise.resolve([row]));
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      const user = userEvent.setup();
      show(<Page />);
      const actions = await screen.findByRole('button', {name: 'Действия: Лея'});
      await user.click(actions);
      await user.click(screen.getByRole('menuitem', {name: 'Удалить'}));
      expect(actions).toBeDisabled();
      await act(async () => pending.reject(new Error('offline')));
      expect(actions).toBeEnabled();
      expect(screen.getByRole('alert')).toHaveTextContent('Не удалось удалить');
      expect(screen.getByText('Лея')).toBeInTheDocument();
    },
  );

  it('shared save button reports actual pending and never infers success from a message', () => {
    const {rerender} = render(<FormActions saving message="Ошибка" saveLabel="Сохранить" savingLabel="Сохраняем…" />);
    const button = screen.getByRole('button', {name: 'Сохраняем…'});
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('type', 'submit');
    rerender(<FormActions saving={false} message="Ошибка" saveLabel="Сохранить" savingLabel="Сохраняем…" />);
    expect(screen.getByRole('button', {name: 'Сохранить'})).toHaveAttribute('aria-busy', 'false');
  });
});
