import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../messages/ru.json';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({refresh}),
}));

const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string) => me(path),
  API_BASE: '',
}));

import EditModeSwitch from '../EditModeSwitch';

function renderSwitch() {
  return render(
    <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
      <EditModeSwitch />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  token.value = null;
  me.mockReset().mockResolvedValue({role: 'admin'});
  refresh.mockReset();
  sessionStorage.clear();
  // Кука — сеансовая, но между тестами файл остаётся один и тот же jsdom-документ.
  document.cookie = 'rl_edit=; Path=/; Max-Age=0';
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
