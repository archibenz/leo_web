import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../messages/ru.json';

// Тот же приём, что в AdminPanelLink.test.tsx: роль из useWhiteAuth живёт в
// модуле, поэтому модуль сбрасывается перед каждым кейсом.
const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string) => me(path),
  setToken: (t: string) => {
    token.value = t;
  },
  clearToken: () => {
    token.value = null;
  },
  API_BASE: '',
}));

let AnalyticsLink: typeof import('../AnalyticsLink').default;

function renderLink() {
  return render(
    <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
      <AnalyticsLink />
    </NextIntlClientProvider>,
  );
}

beforeEach(async () => {
  token.value = null;
  me.mockReset().mockResolvedValue({role: 'admin'});
  vi.resetModules();
  ({default: AnalyticsLink} = await import('../AnalyticsLink'));
});

afterEach(cleanup);

describe('ссылка на дашборд аналитики', () => {
  it('гостю — нет', async () => {
    renderLink();
    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
  });

  it('покупателю — нет', async () => {
    token.value = 'shopper-token';
    me.mockResolvedValue({role: 'user'});
    renderLink();
    await waitFor(() => expect(me).toHaveBeenCalledWith('/api/auth/me'));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('владельцу — ведёт на /analytics без локали', async () => {
    token.value = 'admin-token';
    renderLink();
    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/analytics');
    expect(link).toHaveAccessibleName(ruMessages.white.editModeSwitch.analyticsLink);
  });
});
