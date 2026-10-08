import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {act, render, screen, cleanup, waitFor} from '@testing-library/react';

// У useWhiteAuth не было ни одного теста, а он решает два разных вопроса:
// кто вошёл и можно ли ему править сайт. Ниже — ровно те свойства, на
// которых он ломался.

const token = {value: null as string | null};
const me = vi.fn();
const cookieMe = vi.fn();
const cleared = vi.fn();

vi.mock('../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string, options: {skipBearer?: boolean}) => options?.skipBearer ? cookieMe(path, options) : me(path, options),
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
let auth: typeof import('../useWhiteAuth');

function Probe() {
  const {user, ready, authError, logoutError, isLoggingOut} = useWhiteAuth();
  return (
    <>
    <span data-testid="итог">
      {!ready ? 'ждём' : user ? `вошёл:${user.role ?? 'без роли'}` : 'никого'}
    </span>
    <span data-testid="проверка">{isLoggingOut ? 'выходим' : logoutError ? 'выход не завершён' : authError ? 'временный отказ' : 'готово'}</span>
    </>
  );
}

beforeEach(async () => {
  token.value = null;
  cleared.mockReset();
  me.mockReset();
  cookieMe.mockReset().mockRejectedValue({status: 403});
  vi.resetModules();
  auth = await import('../useWhiteAuth');
  ({useWhiteAuth} = auth);
});

afterEach(() => {cleanup(); vi.useRealTimers();});

describe('роль едет вместе с пользователем', () => {
  it('роль из ответа /api/auth/me доезжает до потребителя', async () => {
    token.value = 'admin-token';
    me.mockResolvedValue({id: 1, email: 'a@b.c', name: 'Александр', role: 'admin'});

    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('вошёл:admin'));
    // Ровно один запрос: раньше режим правки спрашивал ту же ручку второй раз
    // ради одного поля, и страница аккаунта стоила двух из десяти в минуту.
    expect(me).toHaveBeenCalledTimes(1);
    expect(me).toHaveBeenCalledWith('/api/auth/me', {skipAuthHandler: true});
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
  it.each([401, 403])('%i от /me: недействительная сессия — стираем', async (status) => {
    token.value = 'stale-token';
    me.mockRejectedValue(Object.assign(new Error('unauthorized'), {status}));

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
  it('гость проверяет cookie один раз, без bearer', async () => {
    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('итог')).toHaveTextContent('никого'));
    expect(me).not.toHaveBeenCalled();
    expect(cookieMe).toHaveBeenCalledTimes(1);
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
}

const owner = {id: 1, email: 'owner@example.invalid', name: 'Owner', role: 'admin'};
const buyer = {id: 2, email: 'buyer@example.invalid', name: 'Buyer', role: 'user'};

function remoteLogout(phase: string) {
  const event = new Event('storage');
  Object.assign(event, {key: 'reinasleo_logout', newValue: JSON.stringify({phase, nonce: 'another-tab'})});
  window.dispatchEvent(event);
}

describe('cookie-only restoration', () => {
  it('orphaned pending logout becomes retryable failure after 15s without verifying the old cookie', async () => {
    vi.useFakeTimers();
    cookieMe.mockResolvedValue(owner);
    render(<Probe />);
    await act(async () => {});
    act(() => {remoteLogout('pending');});
    await act(async () => {await vi.advanceTimersByTimeAsync(15_000);});
    expect(screen.getByTestId('итог')).toHaveTextContent('никого');
    expect(screen.getByTestId('проверка')).toHaveTextContent('выход не завершён');
    await act(async () => {await auth.whiteRetryAuth();});
    expect(cookieMe).toHaveBeenCalledTimes(1);
    await act(async () => {await auth.whiteLogout();});
    expect(screen.getByTestId('проверка')).toHaveTextContent('готово');
  });

  it('another cookie-only tab blocks immediately during logout, keeps failure and clears on confirmed completion', async () => {
    cookieMe.mockResolvedValue(owner);
    render(<Probe />);
    await screen.findByText('вошёл:admin');
    expect(token.value).toBeNull();
    act(() => {remoteLogout('pending');});
    expect(screen.getByTestId('итог')).toHaveTextContent('никого');
    expect(screen.getByTestId('проверка')).toHaveTextContent('выходим');
    await act(async () => {await auth.whiteRetryAuth();});
    expect(cookieMe).toHaveBeenCalledTimes(1);
    act(() => {remoteLogout('failed');});
    expect(screen.getByTestId('проверка')).toHaveTextContent('выход не завершён');
    await act(async () => {await auth.whiteRetryAuth();});
    expect(cookieMe).toHaveBeenCalledTimes(1);
    act(() => {remoteLogout('complete');});
    expect(screen.getByTestId('итог')).toHaveTextContent('никого');
    expect(screen.getByTestId('проверка')).toHaveTextContent('готово');
    expect(cookieMe).toHaveBeenCalledTimes(1);
    cookieMe.mockResolvedValue(buyer);
    await act(async () => {await auth.whiteAdoptToken('new-login');});
    expect(screen.getByTestId('итог')).toHaveTextContent('вошёл:user');
  });

  it('a pending cookie result stays obsolete after another tab completes logout', async () => {
    const pending = deferred<typeof owner>();
    cookieMe.mockReturnValue(pending.promise);
    render(<Probe />);
    act(() => {remoteLogout('pending'); remoteLogout('complete');});
    await act(async () => {pending.resolve(owner);});
    expect(screen.getByTestId('итог')).toHaveTextContent('никого');
    expect(screen.getByTestId('проверка')).toHaveTextContent('готово');
  });

  it('restores a verified cookie user without localStorage', async () => {
    cookieMe.mockResolvedValue(owner);
    render(<Probe />);
    await screen.findByText('вошёл:admin');
    expect(token.value).toBeNull();
    expect(cookieMe).toHaveBeenCalledTimes(1);
    expect(me).not.toHaveBeenCalled();
  });

  it('retires an older bearer only after the current cookie user is verified', async () => {
    token.value = 'old-admin-token';
    const pending = deferred<typeof buyer>();
    cookieMe.mockReturnValue(pending.promise);
    render(<Probe />);
    expect(token.value).toBe('old-admin-token');
    await act(async () => {pending.resolve(buyer);});
    await screen.findByText('вошёл:user');
    expect(token.value).toBeNull();
    expect(cleared).toHaveBeenCalledTimes(1);
    expect(me).not.toHaveBeenCalled();
    expect(screen.getByTestId('проверка')).toHaveTextContent('готово');
  });

  it.each([429, 503])('cookie-only failure %s stays unavailable and can recover without another login', async status => {
    cookieMe.mockRejectedValueOnce({status}).mockResolvedValueOnce(owner);
    render(<Probe />);
    await screen.findByText('временный отказ');
    expect(me).not.toHaveBeenCalled();
    await act(async () => {await auth.whiteRetryAuth();});
    await screen.findByText('вошёл:admin');
    expect(token.value).toBeNull();
  });

  it('a late cookie result cannot restore a user after confirmed server logout', async () => {
    const pending = deferred<typeof owner>();
    cookieMe.mockReturnValue(pending.promise);
    me.mockResolvedValue(undefined);
    render(<Probe />);
    await act(async () => {await auth.whiteLogout();});
    await act(async () => {pending.resolve(owner);});
    expect(screen.getByTestId('итог')).toHaveTextContent('никого');
    expect(screen.getByTestId('проверка')).toHaveTextContent('готово');
    expect(cookieMe).toHaveBeenCalledTimes(1);
  });
});

describe('выход и смена сессии', () => {
  it('выход сразу убирает пользователя и вызывает серверное удаление cookie', async () => {
    token.value = 'owner-token';
    const logout = deferred<void>();
    me.mockImplementation((path: string) => path.endsWith('/logout') ? logout.promise : Promise.resolve(owner));
    render(<Probe />);
    await screen.findByText('вошёл:admin');

    let result!: Promise<unknown>;
    act(() => {result = auth.whiteLogout();});
    expect(token.value).toBeNull();
    expect(screen.getByTestId('итог')).toHaveTextContent('никого');
    expect(me).toHaveBeenCalledWith('/api/auth/logout', {method: 'POST', skipAuthHandler: true});
    await act(async () => {logout.resolve(); await expect(result).resolves.toEqual({ok: true});});
  });

  it('ошибка серверного выхода видна вызывающему коду', async () => {
    token.value = 'owner-token';
    me.mockRejectedValue(Object.assign(new Error('temporary'), {status: 502}));
    await expect(auth.whiteLogout()).resolves.toEqual({ok: false});
    expect(token.value).toBeNull();
  });

  it('поздний /me после выхода не возвращает пользователя', async () => {
    token.value = 'owner-token';
    const pending = deferred<typeof owner>();
    me.mockImplementation((path: string) => path.endsWith('/logout') ? Promise.resolve() : pending.promise);
    render(<Probe />);
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1));
    await act(async () => {await auth.whiteLogout();});
    await act(async () => {pending.resolve(owner); await pending.promise;});
    expect(screen.getByTestId('итог')).toHaveTextContent('никого');
    expect(token.value).toBeNull();
  });

  it('смена токена не усыновляет старый inflight /me', async () => {
    const old = deferred<typeof owner>();
    me.mockImplementation(() => token.value === 'old-token' ? old.promise : Promise.resolve(buyer));
    let a!: Promise<{ok: boolean}>;
    act(() => {a = auth.whiteAdoptToken('old-token');});
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1));
    await expect(auth.whiteAdoptToken('new-token')).resolves.toEqual({ok: true});
    old.resolve(owner);
    await expect(a).resolves.toEqual({ok: false});
    render(<Probe />);
    await screen.findByText('вошёл:user');
    expect(token.value).toBe('new-token');
    expect(me).toHaveBeenCalledTimes(2);
  });

  it('поздний 401 старой сессии не стирает новый токен', async () => {
    const old = deferred<typeof owner>();
    me.mockImplementation(() => token.value === 'old-token' ? old.promise : Promise.resolve(buyer));
    const a = auth.whiteAdoptToken('old-token');
    await waitFor(() => expect(me).toHaveBeenCalledTimes(1));
    await auth.whiteAdoptToken('new-token');
    old.reject(Object.assign(new Error('old token'), {status: 401}));
    await a;
    expect(token.value).toBe('new-token');
    expect(cleared).not.toHaveBeenCalled();
  });

  it.each([429, 502])('после %i повтор восстанавливает пользователя без входа', async (status) => {
    token.value = 'owner-token';
    me.mockRejectedValueOnce(Object.assign(new Error('temporary'), {status})).mockResolvedValue(owner);
    render(<Probe />);
    await screen.findByText('никого');
    await act(async () => {await auth.whiteRetryAuth();});
    await screen.findByText('вошёл:admin');
    expect(token.value).toBe('owner-token');
    expect(cleared).not.toHaveBeenCalled();
    expect(me).toHaveBeenCalledTimes(2);
  });

  it('выход в другой вкладке отменяет ожидающий /me', async () => {
    token.value = 'owner-token';
    const pending = deferred<typeof owner>();
    me.mockReturnValue(pending.promise);
    render(<Probe />);
    token.value = null;
    act(() => window.dispatchEvent(new StorageEvent('storage', {key: 'reinasleo_token', newValue: null})));
    await act(async () => {pending.resolve(owner); await pending.promise;});
    expect(screen.getByTestId('итог')).toHaveTextContent('никого');
    expect(token.value).toBeNull();
  });

  it('старый finally не завершает проверку новой сессии', async () => {
    token.value = 'owner-token';
    const old = deferred<typeof owner>();
    const next = deferred<typeof buyer>();
    me.mockImplementation(() => token.value === 'owner-token' ? old.promise : next.promise);
    render(<Probe />);
    token.value = 'buyer-token';
    act(() => window.dispatchEvent(new StorageEvent('storage', {key: 'reinasleo_token', newValue: token.value})));
    await act(async () => {old.resolve(owner); await old.promise;});
    expect(screen.getByTestId('итог')).toHaveTextContent('ждём');
    await act(async () => {next.resolve(buyer); await next.promise;});
    expect(screen.getByTestId('итог')).toHaveTextContent('вошёл:user');
  });

  it('смена токена при ожидающем logout проверяется после его завершения', async () => {
    token.value = 'owner-token';
    const pending = deferred<void>();
    me.mockImplementation((path: string) => path.endsWith('/logout') ? pending.promise : Promise.resolve(token.value === 'buyer-token' ? buyer : owner));
    render(<Probe />);
    await screen.findByText('вошёл:admin');
    let logout!: Promise<{ok: boolean}>;
    act(() => {logout = auth.whiteLogout();});
    token.value = 'buyer-token';
    act(() => window.dispatchEvent(new StorageEvent('storage', {key: 'reinasleo_token', newValue: token.value})));
    expect(me).toHaveBeenCalledTimes(2);
    await act(async () => {pending.resolve(); await logout;});
    await screen.findByText('вошёл:user');
    expect(token.value).toBe('buyer-token');
    expect(me).toHaveBeenCalledTimes(3);
  });

  it.each(['reinasleo_token', null])('storage %s не скрывает незавершённый серверный выход', async (key) => {
    token.value = 'owner-token';
    me.mockRejectedValue(Object.assign(new Error('offline'), {status: 502}));
    render(<Probe />);
    await act(async () => {await auth.whiteLogout();});
    expect(screen.getByTestId('проверка')).toHaveTextContent('выход не завершён');
    act(() => window.dispatchEvent(new StorageEvent('storage', {key, newValue: null})));
    expect(screen.getByTestId('проверка')).toHaveTextContent('выход не завершён');
  });

  it('автоматические повторы учитывают Retry-After и заканчиваются после двух попыток', async () => {
    vi.useFakeTimers();
    token.value = 'owner-token';
    me.mockRejectedValue(Object.assign(new Error('rate limited'), {status: 429, retryAfter: '60'}));
    render(<Probe />);
    await act(async () => {});
    expect(screen.getByTestId('проверка')).toHaveTextContent('временный отказ');
    await act(async () => {await vi.advanceTimersByTimeAsync(59_999);});
    expect(me).toHaveBeenCalledTimes(1);
    await act(async () => {await vi.advanceTimersByTimeAsync(1);});
    expect(me).toHaveBeenCalledTimes(2);
    await act(async () => {await vi.advanceTimersByTimeAsync(60_000);});
    expect(me).toHaveBeenCalledTimes(3);
    await act(async () => {await vi.advanceTimersByTimeAsync(600_000);});
    expect(me).toHaveBeenCalledTimes(3);
    expect(token.value).toBe('owner-token');
  });

  it('logout не создаёт второй запрос при повторном нажатии', async () => {
    const pending = deferred<void>();
    me.mockReturnValue(pending.promise);
    const first = auth.whiteLogout();
    expect(auth.whiteLogout()).toBe(first);
    expect(me).toHaveBeenCalledTimes(1);
    pending.resolve();
    await expect(first).resolves.toEqual({ok: true});
  });

  it.each(['login', 'register'])('поздний ответ %s не восстанавливает токен после выхода', async (method) => {
    const pending = deferred<{token: string}>();
    me.mockImplementation((path: string) => path.endsWith('/logout') ? Promise.resolve() : pending.promise);
    const action = method === 'login' ? auth.whiteLogin('owner@example.invalid', 'Passw0rd') :
      auth.whiteRegister({email: 'owner@example.invalid', code: '123456', firstName: 'Owner', password: 'Passw0rd'});
    await auth.whiteLogout();
    pending.resolve({token: 'late-token'});
    await expect(action).resolves.toEqual({ok: false});
    expect(token.value).toBeNull();
    expect(me.mock.calls.map(([path]) => path)).not.toContain('/api/auth/me');
  });
});
