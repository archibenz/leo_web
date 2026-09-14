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
    // же приём проверки видимости, что и у guideOpen в WhitePdpShowcase.tsx.
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
