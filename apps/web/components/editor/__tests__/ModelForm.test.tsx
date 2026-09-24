import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Тексты модели читаются той же ручкой, что и вариант (см. VariantForm.test.tsx) —
// apiFetch подделывает карточку целиком, saveModelDraft подделывает маленький
// сервер: патч накапливается в сторе поверх уже лежащих значений, ровно как
// StorefrontDraftMerge.accumulate накапливает верхнеуровневые поля.
type StoredModel = {
  nameRu: string | null;
  nameEn: string | null;
  descRu: string | null;
  descEn: string | null;
  storyRu: string | null;
  storyEn: string | null;
  compositionRu: string | null;
  compositionEn: string | null;
  careRu: string | null;
  careEn: string | null;
  // Настоящая ручка отдаёт размеры всегда: в StorefrontModelRequest они @NotEmpty.
  sizes: string[];
  measurements?: {kind: string; values: Record<string, number>}[];
};

let store: Record<string, StoredModel>;

function resetStore() {
  store = {
    'model-1': {
      nameRu: 'Пальто',
      nameEn: 'Coat',
      descRu: 'Приталенное пальто прямого кроя.',
      descEn: 'A tailored, straight-cut coat.',
      storyRu: null,
      storyEn: null,
      compositionRu: 'Шерсть 100%',
      compositionEn: 'Wool 100%',
      careRu: 'Химчистка',
      careEn: 'Dry clean only',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      measurements: [],
    },
  };
}

const apiFetch = vi.fn((path: string) => {
  const match = /\/api\/admin\/storefront\/models\/(.+)$/.exec(path);
  if (!match) return Promise.reject(new Error(`неожиданный путь в тесте: ${path}`));
  const model = store[match[1]!];
  if (!model) return Promise.reject(new Error('модель не найдена в сторе теста'));
  return Promise.resolve({...model});
});
vi.mock('../../../lib/api', () => ({
  apiFetch: (...args: [string]) => apiFetch(...args),
  getToken: () => null,
  API_BASE: '',
}));

const saveModelDraft = vi.fn((modelId: string, patch: Partial<StoredModel>) => {
  store[modelId] = {...store[modelId]!, ...patch};
  return Promise.resolve(store[modelId]);
});
vi.mock('../editorApi', () => ({
  saveModelDraft: (...args: [string, Partial<StoredModel>]) => saveModelDraft(...args),
}));

import ModelForm from '../ModelForm';

beforeEach(() => {
  resetStore();
  apiFetch.mockClear();
  saveModelDraft.mockClear();
});
afterEach(cleanup);

describe('ModelForm — загрузка и раскладка', () => {
  it('русские поля читаются сразу и раскрыты', async () => {
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);

    expect(await screen.findByLabelText('Название · ru')).toHaveValue('Пальто');
    expect(screen.getByLabelText('Короткое описание · ru')).toHaveValue('Приталенное пальто прямого кроя.');
    expect(screen.getByLabelText('Состав · ru')).toHaveValue('Шерсть 100%');
    expect(screen.getByLabelText('Уход · ru')).toHaveValue('Химчистка');
  });

  it('английский раздел свёрнут по умолчанию — переключатель aria-expanded=false, полей не найти по роли', async () => {
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    const toggle = screen.getByRole('button', {name: /Английские тексты/i});
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    // getByRole по умолчанию не видит то, что скрыто атрибутом hidden — тот
    // же приём проверки видимости, что и у любого узла под атрибутом hidden.
    expect(screen.queryByRole('textbox', {name: 'Название · en'})).not.toBeInTheDocument();
  });

  it('клик по переключателю раскрывает английские поля с уже загруженными значениями', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    const toggle = screen.getByRole('button', {name: /Английские тексты/i});
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('textbox', {name: 'Название · en'})).toHaveValue('Coat');
    expect(screen.getByLabelText('Уход · en')).toHaveValue('Dry clean only');
  });

  it('переключение на другую модель не тащит за собой чужие тексты', async () => {
    store['model-2'] = {...store['model-1']!, nameRu: 'Юбка', nameEn: 'Skirt'};
    const {rerender} = render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    expect(await screen.findByLabelText('Название · ru')).toHaveValue('Пальто');

    rerender(<ModelForm modelId="model-2" onSaved={() => {}} />);

    await waitFor(() => expect(screen.getByLabelText('Название · ru')).toHaveValue('Юбка'));
  });
});

describe('ModelForm — сохранение', () => {
  it('шлёт только тронутое поле — минимальный патч, а не карточку целиком', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.clear(screen.getByLabelText('Название · ru'));
    await user.type(screen.getByLabelText('Название · ru'), 'Пальто новое');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalled());
    expect(saveModelDraft).toHaveBeenCalledWith('model-1', {nameRu: 'Пальто новое'});
  });

  it('очищенное необязательное поле (история) уезжает как null, а не пустой строкой', async () => {
    store['model-1']!.storyRu = 'Было что-то';
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    const story = await screen.findByLabelText('Подробно о вещи · ru');
    expect(story).toHaveValue('Было что-то');

    await user.clear(story);
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalled());
    expect(saveModelDraft).toHaveBeenCalledWith('model-1', {storyRu: null});
  });

  it('onSaved зовётся после успешного сохранения', async () => {
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={onSaved} />);
    await screen.findByLabelText('Название · ru');

    await user.type(screen.getByLabelText('Уход · ru'), ', деликатный режим');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });
});

describe('ModelForm — пустое обязательное поле', () => {
  it('очищенное обязательное поле блокирует «Сохранить» и показывает русский текст у поля, не отправляя запрос', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    const name = await screen.findByLabelText('Название · ru');

    await user.clear(name);

    const save = screen.getByRole('button', {name: /Сохранить в черновик/i});
    expect(save).toBeDisabled();
    expect(screen.getByText(/Впишите название/i)).toBeInTheDocument();

    // Кнопка недоступна — клик по ней ничего не делает, saveModelDraft не зовётся.
    await user.click(save);
    expect(saveModelDraft).not.toHaveBeenCalled();
  });

  it('поле, которое не трогали, не блокирует сохранение — проверяется только патч', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    // Меняем только уход — название остаётся нетронутым и не входит в patch.
    await user.type(screen.getByLabelText('Уход · ru'), ' и стирка при 30°');
    const save = screen.getByRole('button', {name: /Сохранить в черновик/i});
    expect(save).toBeEnabled();

    await user.click(save);
    await waitFor(() => expect(saveModelDraft).toHaveBeenCalled());
  });
});

describe('ModelForm — ошибки сервера', () => {
  it('errors: [{field: "nameRu", …}] рисует русский текст у поля «Название · ru»', async () => {
    saveModelDraft.mockRejectedValueOnce(
      Object.assign(new Error('Validation failed'), {
        status: 400,
        body: {message: 'Validation failed', errors: [{field: 'nameRu', message: 'must not be blank'}]},
      }),
    );
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.type(screen.getByLabelText('Уход · ru'), ', деликатный режим');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    expect(await screen.findByText(/Впишите название/i)).toBeInTheDocument();
  });

  it('незнакомое поле (не из текстов модели) показывает общий текст, по-русски, с именем поля из ответа', async () => {
    saveModelDraft.mockRejectedValueOnce(
      Object.assign(new Error('Validation failed'), {
        status: 400,
        body: {message: 'Validation failed', errors: [{field: 'sizes[0]', message: 'must not be blank'}]},
      }),
    );
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.type(screen.getByLabelText('Уход · ru'), ', деликатный режим');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    expect(await screen.findByRole('alert')).toHaveTextContent('sizes[0]');
  });

  it('сеть отвалилась (не апифетчевая ошибка) — общий текст «не сохранилось», без падения', async () => {
    saveModelDraft.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.type(screen.getByLabelText('Уход · ru'), ', деликатный режим');
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Failed to fetch/);
  });
});

// Размеры модели — кнопки размеров на карточке. Круг через подделанный
// черновик: изменил → сохранил → открыл заново → видно сохранённое.
describe('ModelForm — размеры', () => {
  it('добавил XXL и снял S — уходит набор в каноническом порядке, при повторном открытии он же', async () => {
    const user = userEvent.setup();
    const {unmount} = render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.click(screen.getByRole('button', {name: 'XXL'}));
    await user.click(screen.getByRole('button', {name: 'S'}));
    await user.click(screen.getByRole('button', {name: /сохранить/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalledTimes(1));
    expect(saveModelDraft.mock.calls[0]![1]).toEqual({sizes: ['XS', 'M', 'L', 'XL', 'XXL']});

    unmount();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');
    expect(screen.getByRole('button', {name: 'XXL'})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', {name: 'S'})).toHaveAttribute('aria-pressed', 'false');
  });

  it('снять все размеры нельзя: предупреждение и кнопка сохранения закрыта', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    for (const size of ['XS', 'S', 'M', 'L', 'XL']) await user.click(screen.getByRole('button', {name: size}));

    expect(screen.getByRole('alert')).toHaveTextContent('Выберите хотя бы один размер.');
    expect(screen.getByRole('button', {name: /сохранить/i})).toBeDisabled();
  });

  it('правка текста не трогает размеры — в заплатке их нет', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    const name = await screen.findByLabelText('Название · ru');

    await user.clear(name);
    await user.type(name, 'Пальто-пиджак');
    await user.click(screen.getByRole('button', {name: /сохранить/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalledTimes(1));
    expect(saveModelDraft.mock.calls[0]![1]).toEqual({nameRu: 'Пальто-пиджак'});
  });

  // Порядок нажатий ≠ порядок показа: S, добавленный к XS и M, обязан встать
  // между ними, а не в конец.
  it('добавленный размер встаёт на своё место, а не в конец', async () => {
    const user = userEvent.setup();
    store['model-1']!.sizes = ['XS', 'M'];
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.click(screen.getByRole('button', {name: 'S'}));
    await user.click(screen.getByRole('button', {name: /сохранить/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalledTimes(1));
    expect(saveModelDraft.mock.calls[0]![1]).toEqual({sizes: ['XS', 'S', 'M']});
  });

  it('включил размер и выключил обратно — изменений нет, сохранять нечего', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.click(screen.getByRole('button', {name: 'XXL'}));
    await user.click(screen.getByRole('button', {name: 'XXL'}));

    expect(screen.getByRole('button', {name: /сохранить/i})).toBeDisabled();
  });

  it('размер вне списка, уже стоящий в базе, не теряется', async () => {
    store['model-1']!.sizes = ['M', 'ONE'];
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    expect(screen.getByRole('button', {name: 'ONE'})).toHaveAttribute('aria-pressed', 'true');
  });
});

// Ответ без размеров (подделка e2e 18, старый черновик) — не «пустой набор»:
// правка названия сохраняется, выбора размеров нет, в заплатку они не идут.
describe('ModelForm — ответ без размеров', () => {
  it('правка текста сохраняется, размеры не показываются и не уходят', async () => {
    const user = userEvent.setup();
    delete (store['model-1'] as Partial<StoredModel>).sizes;
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    const name = await screen.findByLabelText('Название · ru');

    expect(screen.queryByRole('button', {name: 'XS'})).toBeNull();
    await user.clear(name);
    await user.type(name, 'Пальто-пиджак');
    await user.click(screen.getByRole('button', {name: /сохранить/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalledTimes(1));
    expect(saveModelDraft.mock.calls[0]![1]).toEqual({nameRu: 'Пальто-пиджак'});
  });
});

// Мерки изделия (п. 15). Круг через подделанный черновик.
describe('ModelForm — замеры изделия', () => {
  it('добавил «Ширину по груди», заполнил S и M — уходят числа, запятая понята', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.click(screen.getByRole('button', {name: '+ Ширина по груди'}));
    await user.type(screen.getByLabelText('Ширина по груди · S'), '46');
    await user.type(screen.getByLabelText('Ширина по груди · M'), '48,5');
    await user.click(screen.getByRole('button', {name: /сохранить/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalledTimes(1));
    expect(saveModelDraft.mock.calls[0]![1]).toEqual({measurements: [{kind: 'chest', values: {S: 46, M: 48.5}}]});
  });

  it('«убрать» мерку — уходит список без неё', async () => {
    const user = userEvent.setup();
    store['model-1']!.measurements = [{kind: 'length', values: {S: 110}}, {kind: 'chest', values: {S: 46}}];
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    expect(screen.getByLabelText('Длина изделия · S')).toHaveValue('110');
    await user.click(screen.getByRole('button', {name: 'Убрать «Длина изделия»'}));
    await user.click(screen.getByRole('button', {name: /сохранить/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalledTimes(1));
    expect(saveModelDraft.mock.calls[0]![1]).toEqual({measurements: [{kind: 'chest', values: {S: 46}}]});
  });

  it('клетка не с шагом 0,5 — сказано у клетки, сохранение закрыто', async () => {
    const user = userEvent.setup();
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.click(screen.getByRole('button', {name: '+ Длина рукава'}));
    await user.type(screen.getByLabelText('Длина рукава · M'), '60,3');

    expect(screen.getByText('шаг 0,5 см')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /сохранить/i})).toBeDisabled();
  });

  // Мерка по размеру, которого у вещи нет, не пройдёт сервер — снятый размер
  // уносит свой столбец сам.
  it('снял размер M — его мерки уходят вместе с ним', async () => {
    const user = userEvent.setup();
    store['model-1']!.measurements = [{kind: 'chest', values: {S: 46, M: 48}}];
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    await screen.findByLabelText('Название · ru');

    await user.click(screen.getByRole('button', {name: 'M'}));
    await user.click(screen.getByRole('button', {name: /сохранить/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalledTimes(1));
    expect(saveModelDraft.mock.calls[0]![1]).toEqual({
      sizes: ['XS', 'S', 'L', 'XL'],
      measurements: [{kind: 'chest', values: {S: 46}}],
    });
  });

  it('правка текста не трогает мерки', async () => {
    const user = userEvent.setup();
    store['model-1']!.measurements = [{kind: 'chest', values: {S: 46}}];
    render(<ModelForm modelId="model-1" onSaved={() => {}} />);
    const name = await screen.findByLabelText('Название · ru');

    await user.clear(name);
    await user.type(name, 'Пальто-пиджак');
    await user.click(screen.getByRole('button', {name: /сохранить/i}));

    await waitFor(() => expect(saveModelDraft).toHaveBeenCalledTimes(1));
    expect(saveModelDraft.mock.calls[0]![1]).toEqual({nameRu: 'Пальто-пиджак'});
  });
});
