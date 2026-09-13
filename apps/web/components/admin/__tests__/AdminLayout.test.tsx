import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, it, expect, vi} from 'vitest';
import AdminLayout from '../AdminLayout';

// task-admin-white-brief.md, «Три вещи сверх перекраски» п.1: на телефоне
// меню сейчас занимает весь первый экран — владелец жаловался именно на это.
// Навигация обязана сворачиваться, и на телефоне первым видно раздел
// (children), а не список разделов. jsdom не считает Tailwind CSS, поэтому
// видимость через lg:/hidden проверяет e2e (16-admin-white-shell.spec.ts);
// здесь проверяется то, что jsdom видит честно — состояние тумблера
// (aria-expanded), которое реальное CSS-сворачивание читает так же, как и
// screen reader.

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/admin',
  useRouter: () => ({push: vi.fn()}),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({isAuthenticated: true, isLoading: false, isAdmin: true}),
}));

describe('AdminLayout — мобильная навигация сворачивается', () => {
  it('содержимое раздела видно сразу, список разделов свёрнут по умолчанию', () => {
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );
    expect(screen.getByText('содержимое раздела')).toBeVisible();
    expect(screen.getByRole('button', {expanded: false})).toBeInTheDocument();
  });

  it('нажатие на тумблер разворачивает список разделов (aria-expanded → true)', async () => {
    const user = userEvent.setup();
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );
    const toggle = screen.getByRole('button', {expanded: false});
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('повторное нажатие сворачивает список обратно', async () => {
    const user = userEvent.setup();
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );
    const toggle = screen.getByRole('button', {expanded: false});
    await user.click(toggle);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('тумблер — зона нажатия от 44px (min-h-11)', () => {
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );
    const toggle = screen.getByRole('button', {expanded: false});
    expect(toggle.className).toMatch(/\bmin-h-11\b/);
  });

  it('тумблер связан с областью навигации через aria-controls', () => {
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );
    const toggle = screen.getByRole('button', {expanded: false});
    const controls = toggle.getAttribute('aria-controls');
    expect(controls).toBeTruthy();
    expect(document.getElementById(controls!)).toBeInTheDocument();
  });
});
