import {render, screen, waitFor, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, it, expect, vi} from 'vitest';
import {NextIntlClientProvider} from 'next-intl';
import ruMessages from '../../../../../messages/ru.json';
import {setViewport} from '../../../../../components/editor/__tests__/viewport';
import AdminTextsPage from '../texts/page';

const apiFetch = vi.fn();
vi.mock('../../../../../lib/api', () => ({
  apiFetch: (path: string, init?: RequestInit) => apiFetch(path, init),
}));

function renderPage() {
  return render(
    <NextIntlClientProvider locale="ru" messages={ruMessages as never}>
      <AdminTextsPage />
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (_p: string, init?: RequestInit) =>
    init?.method === 'PUT' ? JSON.parse(String(init.body)) : {texts: {'white.sets.title': {ru: 'Образы'}}},
  );
});

afterEach(cleanup);

const ru = (key: string) => `text-${key}-ru`;

// querySelector отдаёт null, а не бросает, — и waitFor с ним не ждал бы вовсе.
function byId<T extends Element>(container: HTMLElement, id: string): () => T {
  return () => {
    const el = container.querySelector<T>(`#${CSS.escape(id)}`);
    if (!el) throw new Error(`#${id} ещё нет`);
    return el;
  };
}

describe('admin site texts', () => {
  it('shows the original inside each empty field and saves the edits as a whole', async () => {
    setViewport(1280);
    const user = userEvent.setup();
    const {container} = renderPage();

    const theEdit = await waitFor(byId<HTMLInputElement>(container, ru('white.landing.theEdit')));
    expect(theEdit).toHaveAttribute('placeholder', 'Подборка');
    await user.type(theEdit, 'Выбор сезона');
    await user.type(container.querySelector<HTMLInputElement>('#text-contact-email')!, 'hello@reinasleo.com');
    await user.click(screen.getByRole('button', {name: 'Сохранить'}));

    await waitFor(() => expect(apiFetch.mock.calls.some(([, i]) => i?.method === 'PUT')).toBe(true));
    const [, init] = apiFetch.mock.calls.find(([, i]) => i?.method === 'PUT')!;
    const body = JSON.parse(init.body);
    expect(body.texts['white.landing.theEdit']).toEqual({ru: 'Выбор сезона'});
    expect(body.texts['white.sets.title']).toEqual({ru: 'Образы'}); // прежняя правка не потерялась
    expect(body.contactEmail).toBe('hello@reinasleo.com');
  });

  // Плейсхолдер потерян — витрина правку не покажет. Говорим у поля и не даём
  // сохранить, а не молча записываем бесполезную правку.
  it('a lost placeholder is named at the field and blocks saving', async () => {
    setViewport(1280);
    const user = userEvent.setup();
    const {container} = renderPage();

    const body = await waitFor(byId<HTMLTextAreaElement>(container, ru('white.pdp.preorderBody')));
    await user.type(body, 'Вещи нет, напишем');

    expect(await screen.findByText('нужно оставить {name}')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Сохранить'})).toBeDisabled();
  });

  it('«restore original» empties both languages of that field', async () => {
    setViewport(1280);
    const user = userEvent.setup();
    const {container} = renderPage();

    const title = await waitFor(byId<HTMLInputElement>(container, ru('white.sets.title')));
    await waitFor(() => expect(title).toHaveValue('Образы'));
    await user.click(screen.getByRole('button', {name: 'Вернуть как было'}));

    expect(title).toHaveValue('');
  });

  it('on a phone the texts are visible but closed for editing', async () => {
    setViewport(390);
    const {container} = renderPage();

    const title = await waitFor(byId<HTMLInputElement>(container, ru('white.sets.title')));
    expect(title).toBeDisabled();
    expect(screen.queryByRole('button', {name: 'Сохранить'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Вернуть как было'})).toBeNull();
    expect(screen.getByText(ruMessages.admin.texts.desktopOnly)).toBeInTheDocument();
  });
});
