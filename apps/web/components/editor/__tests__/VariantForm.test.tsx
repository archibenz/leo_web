import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// «Наличие» читается отдельной ручкой (см. VariantForm.tsx) — apiFetch
// подделывает именно её. saveVariantDraft подделывает НЕ просто «успех», а
// маленький сервер: патч накапливается в сторе по тем же правилам, что и
// StorefrontDraftMerge.accumulate (JSONB-колонка не участвует — поля
// верхнего уровня перезаписываются целиком, ровно как gallery/image).
type StoredVariant = {
  price: number | null;
  salePrice: number | null;
  image: string;
  gallery: string[];
  stockQuantity: number;
};

let store: Record<string, StoredVariant>;

function resetStore() {
  store = {
    'wb-1': {
      price: 12000,
      salePrice: null,
      image: '/uploads/products/a.jpg',
      gallery: ['/uploads/products/b.jpg', '/uploads/products/c.jpg'],
      stockQuantity: 4,
    },
  };
}

const apiFetch = vi.fn((path: string) => {
  const match = /\/api\/admin\/storefront\/models\/(.+)$/.exec(path);
  if (!match) return Promise.reject(new Error(`неожиданный путь в тесте: ${path}`));
  return Promise.resolve({variants: {...store}});
});
vi.mock('../../../lib/api', () => ({
  apiFetch: (...args: [string]) => apiFetch(...args),
  getToken: () => null,
  API_BASE: '',
}));

const saveVariantDraft = vi.fn((variantId: string, patch: Partial<StoredVariant>) => {
  store[variantId] = {...store[variantId]!, ...patch};
  return Promise.resolve(store[variantId]);
});
const uploadMedia = vi.fn();
vi.mock('../editorApi', () => ({
  saveVariantDraft: (...args: [string, Partial<StoredVariant>]) => saveVariantDraft(...args),
  uploadMedia: (...args: unknown[]) => uploadMedia(...args),
}));

import VariantForm from '../VariantForm';

beforeEach(() => {
  resetStore();
  apiFetch.mockClear();
  saveVariantDraft.mockClear();
  uploadMedia.mockReset();
});
afterEach(cleanup);

describe('VariantForm — галерея варианта', () => {
  it('читает главный снимок и галерею модели и рисует их кадрами', async () => {
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);

    const images = await screen.findAllByRole('img');
    expect(images.map((i) => i.getAttribute('src'))).toEqual([
      '/uploads/products/a.jpg',
      '/uploads/products/b.jpg',
      '/uploads/products/c.jpg',
    ]);
  });

  // Приёмка из task-admin-media-brief.md: «Порядок меняется и сохраняется в
  // черновик — проверяется чтением черновика с сервера, а не видом на
  // экране» и «Обложка выбирается явно и переживает смену порядка». Тест
  // ниже размонтирует форму и монтирует её ЗАНОВО — свежий инстанс не может
  // унаследовать React-состояние старого, единственный источник для него —
  // то, что реально лежит в «сторе» (стоит вместо сервера). Это же — цель
  // мутации из ТЗ: подмени отправляемый порядок на исходный — именно этот
  // тест обязан покраснеть, и только он.
  it('порядок и обложка сохраняются в черновик и видны после переоткрытия панели — не с экрана, а из стора', async () => {
    const user = userEvent.setup();
    const {unmount} = render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    // c.jpg (кадр 3, не первый) становится обложкой.
    await user.click(screen.getByRole('button', {name: /Сделать обложкой.*кадр 3/}));
    // a.jpg (кадр 1, бывший главный снимок, НЕ обложка после предыдущего шага) — вниз.
    await user.click(screen.getByRole('button', {name: /^Вниз.*кадр 1/}));

    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(saveVariantDraft).toHaveBeenCalled());
    const [, patch] = saveVariantDraft.mock.calls.at(-1)!;
    expect(patch).toEqual({
      image: '/uploads/products/c.jpg',
      gallery: ['/uploads/products/b.jpg', '/uploads/products/a.jpg'],
    });

    unmount();
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);

    expect(await screen.findByText('Обложка')).toBeInTheDocument();
    const reopened = screen.getAllByRole('img');
    expect(reopened.map((i) => i.getAttribute('src'))).toEqual([
      '/uploads/products/c.jpg', // обложка — заново собранный список всегда кладёт её первой
      '/uploads/products/b.jpg',
      '/uploads/products/a.jpg',
    ]);
  });

  it('«Сохранить» ждёт окончания загрузки кадра и объясняет это словами', async () => {
    let resolveUpload!: (url: string) => void;
    uploadMedia.mockImplementation(() => new Promise((res) => (resolveUpload = res)));

    const user = userEvent.setup();
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    // Форма «грязная» уже ДО загрузки (цена тронута) — единственная причина,
    // по которой «Сохранить» обязана остаться выключенной ниже, это именно
    // незавершённая загрузка, а не то, что менять ещё нечего.
    await user.clear(screen.getByLabelText('Наличие, шт'));
    await user.type(screen.getByLabelText('Наличие, шт'), '9');

    await user.upload(screen.getByLabelText(/Добавить кадры/i), new File(['1'], 'new.jpg', {type: 'image/jpeg'}));

    const save = screen.getByRole('button', {name: /Сохранить в черновик/i});
    expect(save).toBeDisabled();
    expect(screen.getByText(/дождитесь загрузки кадров/i)).toBeInTheDocument();

    resolveUpload('/uploads/products/new.jpg');
    await waitFor(() => expect(save).toBeEnabled());
  });

  it('переключение на другой вариант не тащит за собой чужую галерею', async () => {
    store['wb-2'] = {
      price: 9000,
      salePrice: null,
      image: '/uploads/products/x.jpg',
      gallery: [],
      stockQuantity: 1,
    };
    const {rerender} = render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');
    expect(screen.getAllByRole('img')).toHaveLength(3);

    rerender(<VariantForm modelId="model-1" variantId="wb-2" onSaved={() => {}} />);

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1));
    expect(screen.getByRole('img').getAttribute('src')).toBe('/uploads/products/x.jpg');
  });
});
