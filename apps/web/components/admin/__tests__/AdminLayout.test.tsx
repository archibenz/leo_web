import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import AdminLayout from '../AdminLayout';

// Владелец жаловался: на телефоне меню занимает весь первый экран. Требование
// из этого выросло такое — первым виден РАЗДЕЛ, а не список разделов.
//
// МЕХАНИЗМ СМЕНИЛСЯ, ТРЕБОВАНИЕ ОСТАЛОСЬ. Прежняя оболочка сворачивала список
// своим тумблером и держала состояние в aria-expanded; проверки были написаны
// про него. Оболочка переехала на блок `app-shell-7` из реестра Efferd, и там
// на телефоне панель уезжает в выдвижную шторку — списка нет в разметке вовсе,
// пока его не позвали.
//
// Поэтому проверки переписаны на СЛЕДСТВИЕ, а не на устройство: «разделов не
// видно, пока не нажали» верно при обоих механизмах и переживёт следующий.
// Прежние проверки про aria-expanded были верны только про снятое устройство.

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru/admin',
  useRouter: () => ({push: vi.fn(), refresh: vi.fn()}),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Один источник правды о пользователе на всю админку: этим же контекстом
// пользуется и меню в шапке (shell/nav-user.tsx). Отдельного витринного хука
// там нарочно нет — иначе на каждую страницу уходило бы два запроса к
// /api/auth/me против лимита в десять в минуту.
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    isAdmin: true,
    user: {id: 1, email: 'a@b.c', name: 'Александр'},
    logout: vi.fn(),
  }),
}));

// Панель спрашивает ширину экрана через matchMedia, которого в jsdom нет.
// Подставляем его так, чтобы ширину задавал сам тест: без этого оба режима —
// телефон и монитор — были бы неотличимы, и проверка «на телефоне списка нет»
// проходила бы на настольной раскладке, то есть не проверяла бы ничего.
function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', {value: width, configurable: true, writable: true});
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: width < 768,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const PHONE = 390;
const DESKTOP = 1440;

beforeEach(() => {
  document.cookie = 'sidebar:state=; Path=/; Max-Age=0';
});

describe('оболочка админки на телефоне — первым виден раздел', () => {
  it('содержимое раздела видно сразу', () => {
    setViewport(PHONE);
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );

    expect(screen.getByText('содержимое раздела')).toBeVisible();
  });

  it('списка разделов нет в разметке, пока его не позвали', () => {
    setViewport(PHONE);
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );

    // Ключи словаря, а не подписи: next-intl здесь подменён на «верни ключ».
    expect(screen.queryByText('products')).toBeNull();
    expect(screen.queryByText('collections')).toBeNull();
    expect(screen.queryByText('homepage')).toBeNull();
  });

  it('нажатие на кнопку выводит разделы', async () => {
    setViewport(PHONE);
    const user = userEvent.setup();
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );

    await user.click(screen.getByRole('button', {name: 'toggleNav'}));

    expect(await screen.findByText('products')).toBeInTheDocument();
    expect(screen.getByText('homepage')).toBeInTheDocument();
  });
});

describe('оболочка админки на мониторе', () => {
  it('разделы видны сразу, без нажатия', () => {
    setViewport(DESKTOP);
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );

    expect(screen.getByText('products')).toBeInTheDocument();
    expect(screen.getByText('collections')).toBeInTheDocument();
  });
});

describe('телефон владельца — кнопка навигации', () => {
  it('подписана: на телефоне это единственный переход между разделами', () => {
    setViewport(PHONE);
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );

    expect(screen.getByRole('button', {name: 'toggleNav'})).toBeInTheDocument();
  });

  it('зона нажатия 44px, а не 28 из коробки shadcn', () => {
    setViewport(PHONE);
    render(
      <AdminLayout>
        <h1>содержимое раздела</h1>
      </AdminLayout>,
    );

    const trigger = screen.getByRole('button', {name: 'toggleNav'});
    // size-11 = 2.75rem = 44px. У примитива по умолчанию h-7 w-7 (28px) —
    // ниже нашего порога, поэтому размер переопределён на месте вызова.
    expect(trigger.className).toMatch(/\bsize-11\b/);
    expect(trigger.className).not.toMatch(/\bh-7\b/);
  });
});
