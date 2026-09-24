import {render, screen, waitFor, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../../../messages/ru.json';
import {setViewport} from '../../../../../components/editor/__tests__/viewport';
import AdminSocialsPage from '../socials/page';

const apiFetch = vi.fn();
vi.mock('../../../../../lib/api', () => ({
  apiFetch: (path: string, init?: RequestInit) => apiFetch(path, init),
}));

const LINKS = [
  {network: 'instagram', href: 'https://instagram.com/reinasleo', shown: true},
  {network: 'telegram', href: 'https://t.me/reinasleo', shown: true},
  {network: 'vk', href: 'https://vk.com/reinasleo', shown: true},
];

function renderPage() {
  return render(
    <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
      <AdminSocialsPage />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (_path: string, init?: RequestInit) =>
    init?.method === 'PUT' ? JSON.parse(String(init.body)) : {links: LINKS},
  );
});

afterEach(cleanup);

describe('admin socials — one list for the whole site', () => {
  it('on a computer: untick a network, save — the whole list goes to the server', async () => {
    setViewport(1280);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('checkbox', {name: 'Показывать Instagram на сайте'}));
    await user.click(screen.getByRole('button', {name: 'Сохранить'}));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/api/admin/site/socials', expect.objectContaining({method: 'PUT'})));
    const [, init] = apiFetch.mock.calls.find(([, i]) => i?.method === 'PUT')!;
    expect(JSON.parse(init.body).links).toEqual([
      {network: 'instagram', href: 'https://instagram.com/reinasleo', shown: false},
      {network: 'telegram', href: 'https://t.me/reinasleo', shown: true},
      {network: 'vk', href: 'https://vk.com/reinasleo', shown: true},
    ]);
    expect(await screen.findByRole('status')).toHaveTextContent(ruMessages.admin.socials.saved);
  });

  // Причина отказа — от сервера, как есть: «должен вести на t.me» понятнее,
  // чем «ошибка 400».
  it('shows the server reason when an address is refused', async () => {
    setViewport(1280);
    apiFetch.mockImplementation(async (_p: string, init?: RequestInit) => {
      if (init?.method === 'PUT') throw new Error('адрес telegram должен вести на t.me');
      return {links: LINKS};
    });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', {name: 'Сохранить'}));

    expect(await screen.findByRole('status')).toHaveTextContent('адрес telegram должен вести на t.me');
  });

  // Правка — только на компьютере (как режим правки витрины, #84).
  it('on a phone the list is visible but closed for editing', async () => {
    setViewport(390);
    renderPage();

    const telegram = await screen.findByLabelText('Telegram');
    expect(telegram).toBeDisabled();
    expect(screen.getByRole('checkbox', {name: 'Показывать Telegram на сайте'})).toBeDisabled();
    expect(screen.queryByRole('button', {name: 'Сохранить'})).toBeNull();
    expect(screen.getByText(ruMessages.admin.socials.desktopOnly)).toBeInTheDocument();
  });
});
