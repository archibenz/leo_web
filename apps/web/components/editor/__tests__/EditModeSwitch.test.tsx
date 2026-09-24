import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../messages/ru.json';
import {resizeViewport, setViewport} from './viewport';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({refresh}),
}));

const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string) => me(path),
  setToken: () => {},
  clearToken: () => {
    token.value = null;
  },
  API_BASE: '',
}));

// Роль приходит из useWhiteAuth, а он держит пользователя в переменных на
// уровне модуля — одно хранилище на все компоненты страницы. Между тестами
// этот module-scope тоже переживает: гостевой кейс выставил бы «спросили,
// никого нет» на весь файл. Сброс плюс динамический импорт снимают порядок.
let EditModeSwitch: typeof import('../EditModeSwitch').default;

function renderSwitch() {
  return render(
    <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
      <EditModeSwitch />
    </NextIntlClientProvider>,
  );
}

beforeEach(async () => {
  // Правка работает только на компьютере (useIsDesktop.ts) — эти кейсы про неё.
  setViewport(1280);
  token.value = null;
  me.mockReset().mockResolvedValue({role: 'admin'});
  refresh.mockReset();
  // Кука — сеансовая, но между тестами файл остаётся один и тот же jsdom-документ.
  document.cookie = 'rl_edit=; Path=/; Max-Age=0';
  vi.resetModules();
  ({default: EditModeSwitch} = await import('../EditModeSwitch'));
});

afterEach(cleanup);

describe('видимость — переключатель только владельцу', () => {
  it('посторонний ничего не видит и куку не трогает', async () => {
    renderSwitch();

    await waitFor(() => expect(screen.queryByRole('switch')).toBeNull());
    expect(document.cookie).not.toContain('rl_edit=1');
  });

  it('залогиненный покупатель — тоже ничего', async () => {
    token.value = 'shopper-token';
    me.mockResolvedValue({role: 'user'});

    renderSwitch();

    await waitFor(() => expect(me).toHaveBeenCalledWith('/api/auth/me'));
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('владелец видит выключатель, подписанный строкой из messages/ru.json', async () => {
    token.value = 'admin-token';

    renderSwitch();

    const control = await screen.findByRole('switch');
    expect(control).toHaveAccessibleName(ruMessages.white.editModeSwitch.label);
  });

  // Слово «Выйти» занято выходом из аккаунта (white.account.signOut) — то же
  // требование, что у старого EditorToggle. Переключатель — другой ТИП
  // контрола (switch, не ссылка), но подпись не должна повторять его тоже.
  it('подпись не совпадает с выходом из аккаунта', async () => {
    token.value = 'admin-token';

    renderSwitch();

    const control = await screen.findByRole('switch');
    expect(control.textContent?.trim()).not.toBe('Выйти');
  });
});

describe('стартовое состояние читается из куки', () => {
  it('куки нет — выключен', async () => {
    token.value = 'admin-token';

    renderSwitch();

    const control = await screen.findByRole('switch');
    expect(control).toHaveAttribute('aria-checked', 'false');
  });

  it('кука уже стоит (вошли на страницу уже в режиме) — включён', async () => {
    token.value = 'admin-token';
    document.cookie = 'rl_edit=1; Path=/; SameSite=Lax; Secure';

    renderSwitch();

    const control = await screen.findByRole('switch');
    expect(control).toHaveAttribute('aria-checked', 'true');
  });
});

describe('клик — кука и пересборка страницы', () => {
  it('включает: ставит куку, aria-checked=true, зовёт router.refresh()', async () => {
    token.value = 'admin-token';
    const user = userEvent.setup();
    renderSwitch();
    const control = await screen.findByRole('switch');

    await user.click(control);

    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(document.cookie.split('; ')).toContain('rl_edit=1');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('второй клик выключает и снимает куку', async () => {
    token.value = 'admin-token';
    const user = userEvent.setup();
    renderSwitch();
    const control = await screen.findByRole('switch');

    await user.click(control);
    await user.click(control);

    expect(control).toHaveAttribute('aria-checked', 'false');
    expect(document.cookie).not.toContain('rl_edit=1');
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

// Правка — только на компьютере (решение владельца 24.09, useIsDesktop.ts).
describe('только на компьютере', () => {
  it('390 px: у владельца выключателя нет, даже если кука режима уже стоит', async () => {
    setViewport(390);
    token.value = 'admin-token';
    document.cookie = 'rl_edit=1; Path=/';

    renderSwitch();

    await waitFor(() => expect(me).toHaveBeenCalledWith('/api/auth/me'));
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('окно расширили до 1280 px — выключатель появился без перезагрузки; сузили — пропал', async () => {
    setViewport(390);
    token.value = 'admin-token';

    renderSwitch();
    await waitFor(() => expect(me).toHaveBeenCalledWith('/api/auth/me'));
    expect(screen.queryByRole('switch')).toBeNull();

    resizeViewport(1280);
    expect(await screen.findByRole('switch')).toBeInTheDocument();

    resizeViewport(390);
    await waitFor(() => expect(screen.queryByRole('switch')).toBeNull());
  });
});
