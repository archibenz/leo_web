import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// «Наличие» читается отдельной ручкой (см. VariantForm.tsx) — apiFetch
// подделывает именно её. saveVariantDraft подделывает НЕ просто «успех», а
// маленький сервер: патч накапливается в сторе по тем же правилам, что и
// StorefrontDraftMerge.accumulate (JSONB-колонка не участвует — поля
// верхнего уровня перезаписываются целиком, ровно как gallery/image).
//
// priceSource/discountPct и четыре флага — то же поле ответа
// StorefrontVariantRequest, что уже отдаёт бэкенд (этап 2). discountPct у
// фикстуры — 5, специально НЕ 0 и НЕ 90: тесты ниже проверяют, что ровно эти
// границы принимаются, и если бы фикстура сама уже стояла на одной из них,
// «Сохранить» осталась бы включённой не из-за валидности значения, а просто
// потому что оно совпало с исходным (patchOf не увидел бы изменения).
type StoredVariant = {
  price: number | null;
  image: string;
  gallery: string[];
  stockQuantity: number;
  priceSource: 'manual' | 'ozon';
  discountPct: number;
  sourceMissing: boolean;
  costUnknown: boolean;
  thresholdApplied: boolean;
  manualPriceInactive: boolean;
  sourcePrice: number | null;
  shownPrice: number | null;
  sourceCheckedAt: string | null;
};

let store: Record<string, StoredVariant>;

function resetStore() {
  store = {
    'wb-1': {
      price: 12000,
      image: '/uploads/products/a.jpg',
      gallery: ['/uploads/products/b.jpg', '/uploads/products/c.jpg'],
      stockQuantity: 4,
      priceSource: 'manual',
      discountPct: 5,
      sourceMissing: false,
      costUnknown: false,
      thresholdApplied: false,
      manualPriceInactive: false,
      sourcePrice: null,
      shownPrice: 11400,
      sourceCheckedAt: null,
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
      image: '/uploads/products/x.jpg',
      gallery: [],
      stockQuantity: 1,
      priceSource: 'manual',
      discountPct: 0,
      sourceMissing: false,
      costUnknown: false,
      thresholdApplied: false,
      manualPriceInactive: false,
      sourcePrice: null,
      shownPrice: 9000,
      sourceCheckedAt: null,
    };
    const {rerender} = render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');
    expect(screen.getAllByRole('img')).toHaveLength(3);

    rerender(<VariantForm modelId="model-1" variantId="wb-2" onSaved={() => {}} />);

    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(1));
    expect(screen.getByRole('img').getAttribute('src')).toBe('/uploads/products/x.jpg');
  });
});

// Приёмка из task-price-ui-brief.md (этап 3а): процент вместо суммы, ровно
// два источника без wildberries, три флага различимы, ручная цена блокируется
// признаком, а не молчит. Мутация из того же брифа («верни отправку salePrice
// вместо discountPct — e2e обязан покраснеть») целится в e2e-спеку, но тест
// «уходит без salePrice» ниже — тот же periметр, только на уровне формы: он
// тоже красный, если patchOf откатить к старому полю.
describe('VariantForm — источник цены и скидка процентом', () => {
  it('переключатель источника — ровно два значения, wildberries среди них нет', async () => {
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    const select = screen.getByLabelText('Источник цены') as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['manual', 'ozon']);
    expect(values).not.toContain('wildberries');
  });

  it('скидка принимает 0 и 90 — ошибки нет, «Сохранить» остаётся включённой', async () => {
    const user = userEvent.setup();
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    const percent = screen.getByLabelText('Скидка, %');
    const save = screen.getByRole('button', {name: /Сохранить в черновик/i});

    await user.clear(percent);
    await user.type(percent, '90');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(save).toBeEnabled();

    await user.clear(percent);
    await user.type(percent, '0');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(save).toBeEnabled();
  });

  it('скидка отбивает 91 и −1 — ошибка рядом с полем, «Сохранить» выключена', async () => {
    const user = userEvent.setup();
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    const percent = screen.getByLabelText('Скидка, %');
    const save = screen.getByRole('button', {name: /Сохранить в черновик/i});

    await user.clear(percent);
    await user.type(percent, '91');
    expect(screen.getByRole('alert')).toHaveTextContent(/0 до 90/);
    expect(save).toBeDisabled();

    await user.clear(percent);
    await user.type(percent, '-1');
    expect(screen.getByRole('alert')).toHaveTextContent(/0 до 90/);
    expect(save).toBeDisabled();
  });

  it('три флага — три РАЗНЫЕ подписи одновременно, не одна общая', async () => {
    store['wb-1'] = {...store['wb-1']!, sourceMissing: true, costUnknown: true, thresholdApplied: false};
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(await screen.findByText('Цена с Ozon ещё не приходила — показана своя')).toBeInTheDocument();
    expect(screen.getByText('Себестоимость неизвестна — порог не действует')).toBeInTheDocument();
    expect(screen.queryByText('Скидка уменьшена: ниже себестоимости продавать нельзя')).not.toBeInTheDocument();
  });

  it('порог по себестоимости — своя подпись, отдельная от «себестоимость неизвестна»', async () => {
    store['wb-1'] = {...store['wb-1']!, costUnknown: false, thresholdApplied: true};
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(await screen.findByText('Скидка уменьшена: ниже себестоимости продавать нельзя')).toBeInTheDocument();
    expect(screen.queryByText('Себестоимость неизвестна — порог не действует')).not.toBeInTheDocument();
    expect(screen.queryByText('Цена с Ozon ещё не приходила — показана своя')).not.toBeInTheDocument();
  });

  it('ни один флаг не поднят — ни одной из трёх подписей нет', async () => {
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(screen.queryByText('Цена с Ozon ещё не приходила — показана своя')).not.toBeInTheDocument();
    expect(screen.queryByText('Себестоимость неизвестна — порог не действует')).not.toBeInTheDocument();
    expect(screen.queryByText('Скидка уменьшена: ниже себестоимости продавать нельзя')).not.toBeInTheDocument();
  });

  it('«ручная цена не действует» — поле цены недоступно для правки', async () => {
    store['wb-1'] = {...store['wb-1']!, manualPriceInactive: true};
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(await screen.findByLabelText('Ваша цена, ₽')).toBeDisabled();
  });

  it('источник «своя цена» (по умолчанию) — поле цены доступно для правки', async () => {
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(screen.getByLabelText('Ваша цена, ₽')).toBeEnabled();
  });

  it('сохранение уходит с discountPct — и БЕЗ salePrice в теле вовсе', async () => {
    const user = userEvent.setup();
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    const percent = screen.getByLabelText('Скидка, %');
    await user.clear(percent);
    await user.type(percent, '20');

    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(saveVariantDraft).toHaveBeenCalled());
    const [, patch] = saveVariantDraft.mock.calls.at(-1)!;
    expect(patch).toEqual({discountPct: 20});
    expect(patch).not.toHaveProperty('salePrice');
  });

  it('переключение источника на Ozon уходит патчем priceSource', async () => {
    const user = userEvent.setup();
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    await user.selectOptions(screen.getByLabelText('Источник цены'), 'ozon');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(saveVariantDraft).toHaveBeenCalled());
    const [, patch] = saveVariantDraft.mock.calls.at(-1)!;
    expect(patch).toEqual({priceSource: 'ozon'});
  });
});

// Этап 3б: «ваша цена» и «цена с площадки» — два разных числа, и на экране их
// должно быть видно двумя разными строками. Проверка не косметическая: до
// 15.09 поле «Цена» при включённом источнике показывало цену ПЛОЩАДКИ, а
// публикация записывала её в колонку собственной цены владельца (сторож
// круга — ManualPriceRoundTripTest на бэкенде). Здесь — та же беда с той
// стороны, с которой её видит владелец.
describe('VariantForm — своя цена и цена с площадки', () => {
  it('при источнике Ozon в «Вашей цене» стоит СВОЯ цена, а цена площадки — отдельной строкой', async () => {
    store['wb-1'] = {
      ...store['wb-1']!,
      price: 12000,
      priceSource: 'ozon',
      manualPriceInactive: true,
      sourcePrice: 5000,
      shownPrice: 5000,
      sourceCheckedAt: '2026-09-15T12:00:00Z',
    };
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    // Своя цена цела и видна владельцу — именно она вернётся в базу.
    expect(await screen.findByLabelText('Ваша цена, ₽')).toHaveValue(12000);
    // Цена площадки названа своим именем и не выдаёт себя за его цену.
    expect(screen.getByText(/Цена с Ozon: 5[\s ]000 ₽/)).toBeInTheDocument();
    expect(screen.getByText(/Покупатель платит: 5[\s ]000 ₽/)).toBeInTheDocument();
  });

  // Полдень UTC выбран нарочно: календарный день у него один и тот же в любом
  // часовом поясе от −11 до +11, поэтому тест не зависит от TZ машины. Час
  // зависит — его и не проверяем числом.
  it('дата показывает, КОГДА площадка присылала цену', async () => {
    store['wb-1'] = {
      ...store['wb-1']!,
      priceSource: 'ozon',
      sourcePrice: 5000,
      sourceCheckedAt: '2026-09-15T12:00:00Z',
    };
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(await screen.findByText(/проверена 15 сентября, \d{2}:\d{2}/)).toBeInTheDocument();
  });

  it('прошлогодняя цена показывает год — иначе застывшая выглядит свежей', async () => {
    store['wb-1'] = {
      ...store['wb-1']!,
      priceSource: 'ozon',
      sourcePrice: 5000,
      sourceCheckedAt: '2024-09-15T12:00:00Z',
    };
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(await screen.findByText(/проверена 15 сентября 2024/)).toBeInTheDocument();
  });

  it('источник включён, но цена не приходила — своё число под чужой подписью не показывается', async () => {
    store['wb-1'] = {
      ...store['wb-1']!,
      price: 12000,
      priceSource: 'ozon',
      sourceMissing: true,
      sourcePrice: null,
      shownPrice: 12000,
      sourceCheckedAt: null,
    };
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(await screen.findByText('Цена с Ozon ещё не приходила — показана своя')).toBeInTheDocument();
    expect(screen.queryByText(/Цена с Ozon: /)).not.toBeInTheDocument();
    expect(screen.queryByText(/проверена /)).not.toBeInTheDocument();
    // Покупатель платит свою цену — это и есть «показана своя», но сказанное числом.
    expect(screen.getByText(/Покупатель платит: 12[\s ]000 ₽/)).toBeInTheDocument();
  });

  it('порог сработал — «покупатель платит» показывает себестоимость, которую иначе с экрана не вывести', async () => {
    store['wb-1'] = {
      ...store['wb-1']!,
      price: 12000,
      discountPct: 90,
      thresholdApplied: true,
      shownPrice: 2500,
    };
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(await screen.findByText('Скидка уменьшена: ниже себестоимости продавать нельзя')).toBeInTheDocument();
    // Ни 12 000, ни 90% на экране не дают 2 500 — число видно только так.
    expect(screen.getByText(/Покупатель платит: 2[\s ]500 ₽/)).toBeInTheDocument();
  });

  it('цены нет вовсе — сказано словом «предзаказ», а не нулём', async () => {
    store['wb-1'] = {...store['wb-1']!, price: null, shownPrice: null};
    render(<VariantForm modelId="model-1" variantId="wb-1" onSaved={() => {}} />);
    await screen.findAllByRole('img');

    expect(await screen.findByText('Покупатель видит «Предзаказ» — цены нет')).toBeInTheDocument();
  });
});
