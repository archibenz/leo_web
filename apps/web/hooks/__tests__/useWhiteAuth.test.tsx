import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';

// У useWhiteAuth не было ни одного теста, а он решает два разных вопроса:
// кто вошёл и можно ли ему править сайт. Ниже — ровно те свойства, на
// которых он ломался.

const token = {value: null as string | null};
const me = vi.fn();
const cleared = vi.fn();

vi.mock('../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string) => me(path),
  setToken: (t: string) => {
    token.value = t;
  },
  clearToken: () => {
    cleared();
    token.value = null;
  },
  API_BASE: '',
}));

// Пользователь и признак «уже спрашивали» живут в переменных на уровне
// модуля: одно хранилище на все компоненты страницы. Между тестами его надо
// сбрасывать, иначе первый кейс закрепляет свой ответ на весь файл.
let useWhiteAuth: typeof import('../useWhiteAuth').useWhiteAuth;

function Probe() {
  const {user, ready} = useWhiteAuth();
  return (
    <span data-testid="итог">
      {!ready ? 'ждём' : user ? `вошёл:${user.role ?? 'без роли'}` : 'никого'}
    </span>
  );
}

beforeEach(async () => {
  token.value = null;
  cleared.mockReset();
  me.mockReset();
  vi.resetModules();
  ({useWhiteAuth} = await import('../useWhiteAuth'));
});

afterEach(cleanup);

describe('роль едет вместе с пользователем', () => {
  it('роль из ответа /api/auth/me доезжает до потребителя', async () => {
    token.value = 'admin-token';
    me.mockResolvedValue({id: 1, email: 'a@b.c', name: 'Александр', role: 'admin'});

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('вошёл:admin'));
    // Ровно один запрос: раньше режим правки спрашивал ту же ручку второй раз
    // ради одного поля, и страница аккаунта стоила двух из десяти в минуту.
    expect(me).toHaveBeenCalledTimes(1);
    expect(me).toHaveBeenCalledWith('/api/auth/me');
  });

  it('обычный покупатель приезжает без роли admin', async () => {
    token.value = 'buyer-token';
    me.mockResolvedValue({id: 2, email: 'b@b.c', name: 'Покупатель', role: 'user'});

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('вошёл:user'));
  });
});

// Главное свойство этого файла. apiFetch бросает на ЛЮБОМ плохом ответе, и
// раньше всякая неудача стирала токен: 429 от лимитера (десять запросов в
// минуту на /api/auth/**), 502 при перезапуске API, оборванная сеть.
// То есть «не удалось спросить» было неотличимо от «тебе больше нельзя», и
// владельца выкидывало из аккаунта на ровном месте.
describe('временная беда — не то же, что недействительный токен', () => {
  it('401: бэкенд сказал «токен недействителен» — стираем', async () => {
    token.value = 'stale-token';
    me.mockRejectedValue(Object.assign(new Error('unauthorized'), {status: 401}));

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('никого'));
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(token.value).toBeNull();
  });

  it.each([
    ['лимитер', 429],
    ['перезапуск API', 502],
    ['ошибка сервера', 500],
  ])('%s (%i): токен остаётся, из аккаунта не выкидывает', async (_что, status) => {
    token.value = 'good-token';
    me.mockRejectedValue(Object.assign(new Error('temporary'), {status}));

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('никого'));
    expect(cleared).not.toHaveBeenCalled();
    expect(token.value).toBe('good-token');
  });

  it('оборванная сеть (ошибка без кода) — тоже не повод стирать', async () => {
    token.value = 'good-token';
    me.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('никого'));
    expect(cleared).not.toHaveBeenCalled();
    expect(token.value).toBe('good-token');
  });
});

describe('цена опознания', () => {
  it('гость не стоит ни одного запроса', async () => {
    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('никого'));
    expect(me).not.toHaveBeenCalled();
  });

  it('два компонента в одном такте стоят одного запроса', async () => {
    token.value = 'admin-token';
    me.mockResolvedValue({id: 1, email: 'a@b.c', name: 'А', role: 'admin'});

    render(
      <>
        <Probe />
        <Probe />
      </>,
    );

    await waitFor(() => expect(screen.getAllByTestId('итог')[0]).toHaveTextContent('вошёл:admin'));
    expect(me).toHaveBeenCalledTimes(1);
  });

  it('отказ не повторяется: попав на лимитер, страница не стучится снова', async () => {
    token.value = 'good-token';
    me.mockRejectedValue(Object.assign(new Error('rate limited'), {status: 429}));

    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('никого'));
    cleanup();

    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('никого'));
    expect(me).toHaveBeenCalledTimes(1);
  });
});
