import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';

const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  API_BASE: '',
  apiFetch: (path: string, options?: unknown) => me(path, options),
  setToken: (value: string) => {token.value = value;},
  clearToken: () => {token.value = null;},
}));

// Роль и дедупликация принадлежат общему cookie-aware useWhiteAuth.
// Сбрасываем его module-scope, чтобы результат одного кейса не решал следующий.
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
    expect(me).toHaveBeenCalledExactlyOnceWith('/api/auth/me', {skipAuthHandler: true, skipBearer: true});
    expect(token.value).toBeNull();
  });

  it('следующая страница берёт роль из памяти вкладки, а не из сети', async () => {
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

  it('анонимность определяет один cookie-запрос без наследования роли', async () => {
    me.mockRejectedValue(Object.assign(new Error('anonymous cookie'), {status: 401}));
    render(<Probe label="гость" />);

    await waitFor(() => expect(screen.getByTestId('гость')).toHaveTextContent('посторонний'));
    expect(me).toHaveBeenCalledExactlyOnceWith('/api/auth/me', {skipAuthHandler: true, skipBearer: true});
  });
});
