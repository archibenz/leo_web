import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';

const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  API_BASE: '',
  apiFetch: (path: string) => me(path),
}));

// useEditorSession хранит inFlight/silentUntil в переменных на уровне модуля —
// одно обещание и один отказ-на-минуту на все компоненты страницы, это и
// проверяется ниже. Но тот же module-scope переживает и переход между
// тестами: «отказ запоминается» выставляет silentUntil на минуту вперёд, и
// без сброса модуля это глушило бы все ПОСЛЕДУЮЩИЕ тесты файла тем же
// молчанием, вне зависимости от их собственного мока. Зелёное держалось
// только на том, что «отказ» объявлен последним по тексту — vi.resetModules()
// плюс динамический re-import перед каждым тестом делают порядок неважным.
let useEditorSession: typeof import('../useEditorSession').useEditorSession;

function Probe({label}: {label: string}) {
  const {isAdmin, checked} = useEditorSession();
  return <span data-testid={label}>{!checked ? 'ждём' : isAdmin ? 'редактор' : 'посторонний'}</span>;
}

beforeEach(async () => {
  token.value = null;
  me.mockReset().mockResolvedValue({role: 'admin'});
  sessionStorage.clear();
  vi.useRealTimers();
  vi.resetModules();
  ({useEditorSession} = await import('../useEditorSession'));
});

afterEach(cleanup);

// `/api/auth/**` лимитирован десятью запросами в минуту на IP. Хук зовут два
// одновременно смонтированных компонента — переключатель в чроме и полоса
// режима внутри провайдера. По два запроса на перезагрузку выбирали бы бакет
// вдвое быстрее, и владелец терял бы кнопку на ровном месте.
describe('цена опознания роли', () => {
  it('два компонента в одном такте стоят одного запроса, а не двух', async () => {
    token.value = 'admin-token';

    render(
      <>
        <Probe label="шапка" />
        <Probe label="полоса" />
      </>,
    );

    await waitFor(() => expect(screen.getByTestId('шапка')).toHaveTextContent('редактор'));
    expect(screen.getByTestId('полоса')).toHaveTextContent('редактор');
    expect(me).toHaveBeenCalledTimes(1);
  });

  it('следующая страница берёт роль из памяти вкладки, а не из сети', async () => {
    token.value = 'admin-token';
    render(<Probe label="первая" />);
    await waitFor(() => expect(screen.getByTestId('первая')).toHaveTextContent('редактор'));
    cleanup();

    render(<Probe label="вторая" />);

    await waitFor(() => expect(screen.getByTestId('вторая')).toHaveTextContent('редактор'));
    expect(me).toHaveBeenCalledTimes(1);
  });

  it('отказ запоминается: попав на лимитер, страница не стучится снова', async () => {
    token.value = 'admin-token';
    me.mockRejectedValue(Object.assign(new Error('rate limited'), {status: 429}));

    render(<Probe label="первая" />);
    await waitFor(() => expect(screen.getByTestId('первая')).toHaveTextContent('посторонний'));
    cleanup();

    render(<Probe label="вторая" />);

    await waitFor(() => expect(screen.getByTestId('вторая')).toHaveTextContent('посторонний'));
    expect(me).toHaveBeenCalledTimes(1);
  });

  it('анонимный посетитель не стоит ни одного запроса', async () => {
    render(<Probe label="гость" />);

    await waitFor(() => expect(screen.getByTestId('гость')).toHaveTextContent('посторонний'));
    expect(me).not.toHaveBeenCalled();
  });
});
