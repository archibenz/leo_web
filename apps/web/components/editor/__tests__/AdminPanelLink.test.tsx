import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../messages/ru.json';

// Владелец не нашёл вход в админку: ссылки на /admin не было нигде на
// витрине, попасть можно было только вписав адрес руками (isAdmin у него
// уже работал — он в тот же день правил бегущую строку через выключатель в
// аккаунте). Тот же приём мокинга, что EditModeSwitch.test.tsx — та же
// сессия (useEditorSession), тот же владелец.

const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string) => me(path),
  API_BASE: '',
}));

import AdminPanelLink from '../AdminPanelLink';

function renderLink(locale = 'ru') {
  return render(
    <NextIntlClientProvider locale={locale} messages={ruMessages as never}>
      <AdminPanelLink locale={locale} />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  token.value = null;
  me.mockReset().mockResolvedValue({role: 'admin'});
  sessionStorage.clear();
});

afterEach(cleanup);

describe('видимость — ссылка только владельцу, не в разметке вовсе (не display:none)', () => {
  it('посторонний (гость) — ссылки нет', async () => {
    renderLink();

    // ANONYMOUS резолвится синхронно (useEditorSession: нет токена — нет
    // запроса), но эффект всё равно асинхронный — ждём устойчивого состояния.
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
  });

  it('залогиненный покупатель (не admin) — тоже ничего', async () => {
    token.value = 'shopper-token';
    me.mockResolvedValue({role: 'user'});

    renderLink();

    await waitFor(() => expect(me).toHaveBeenCalledWith('/api/auth/me'));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('владелец — ссылка есть, ведёт на /<locale>/admin, подписана из messages/ru.json', async () => {
    token.value = 'admin-token';

    renderLink('ru');

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/ru/admin');
    expect(link).toHaveAccessibleName(ruMessages.white.editModeSwitch.adminLink);
  });

  it('локаль в адресе — та, что передана пропом, не захардкожена', async () => {
    token.value = 'admin-token';

    renderLink('en');

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/en/admin');
  });
});

describe('телефон владельца — зона нажатия и кегль', () => {
  it('min-h-11 (44px) и кегль не мельче 13', async () => {
    token.value = 'admin-token';

    renderLink();

    const link = await screen.findByRole('link');
    expect(link.className).toMatch(/min-h-11/);
    expect(link.className).toMatch(/text-\[13px\]/);
  });
});
