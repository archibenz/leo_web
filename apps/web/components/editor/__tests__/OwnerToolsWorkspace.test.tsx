import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {NextIntlClientProvider} from 'next-intl';
import ru from '../../../messages/ru.json';
import OwnerTools from '../OwnerTools';

const session = vi.hoisted(() => ({isAdmin: true}));
vi.mock('../useEditorSession', () => ({useEditorSession: () => session}));
beforeEach(() => {session.isAdmin = true; document.cookie = 'rl_edit=; Path=/; Max-Age=0';});
afterEach(cleanup);

function entry() {
  return render(<NextIntlClientProvider locale="ru" messages={{white: {editModeSwitch: ru.white.editModeSwitch}}} timeZone="Europe/Moscow"><OwnerTools locale="ru" /></NextIntlClientProvider>);
}

describe('owner workspace entry', () => {
  it('opens the supported home preview directly instead of enabling a hidden mode', () => {
    entry();
    const edit = screen.getByRole('link', {name: /Редактировать сайт/});
    expect(edit).toHaveAttribute('href', '/ru?edit=1');
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    fireEvent.click(edit);
    expect(document.cookie).toContain('rl_edit=1');
    expect(screen.getByRole('link', {name: 'Админ-панель'})).toHaveAttribute('href', '/ru/admin');
    expect(screen.queryByRole('link', {name: 'Аналитика'})).not.toBeInTheDocument();
  });

  it('does not expose owner navigation to a visitor', () => {
    session.isAdmin = false;
    const {container} = entry();
    expect(container).toBeEmptyDOMElement();
  });
});
