import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';

const search = {value: ''};
vi.mock('next/navigation', () => ({
  usePathname: () => '/ru',
  useSearchParams: () => new URLSearchParams(search.value),
  useRouter: () => ({refresh: vi.fn()}),
}));

const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string) => me(path),
  API_BASE: '',
}));

import EditorToggle from '../EditorToggle';
import EditorNotice from '../EditorNotice';
import EditableBlock from '../EditableBlock';
import {EditorProvider} from '../EditorProvider';

beforeEach(() => {
  search.value = '';
  token.value = null;
  me.mockReset().mockResolvedValue({role: 'admin'});
  sessionStorage.clear();
});

afterEach(cleanup);

describe('вход в режим', () => {
  it('посторонний не видит переключателя и не стоит ни одного запроса', async () => {
    render(<EditorToggle />);

    await waitFor(() => expect(screen.queryByRole('link')).toBeNull());
    expect(me).not.toHaveBeenCalled();
  });

  it('залогиненный покупатель переключателя тоже не получает', async () => {
    token.value = 'shopper-token';
    me.mockResolvedValue({role: 'user'});

    render(<EditorToggle />);

    await waitFor(() => expect(me).toHaveBeenCalledWith('/api/auth/me'));
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('владелец получает переключатель, и тот ставит флаг в адрес', async () => {
    token.value = 'admin-token';

    render(<EditorToggle />);

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/ru?edit=1');
    expect(link).toHaveAttribute('aria-pressed', 'false');
  });

  it('в режиме переключатель снимает флаг', async () => {
    token.value = 'admin-token';
    search.value = 'edit=1';

    render(<EditorToggle />);

    const link = await screen.findByRole('link');
    expect(link).toHaveAttribute('href', '/ru');
    expect(link).toHaveAttribute('aria-pressed', 'true');
  });

  // «Выйти» на витрине занято выходом из аккаунта (white.account.signOut,
  // header.dropdown.logOut). Назвав тем же словом выход из режима правки, мы
  // ставим рядом два разных действия под одной подписью: владелец нажмёт не то
  // и решит, что редактор его разлогинил.
  it.each([
    ['вне режима', ''],
    ['в режиме', 'edit=1'],
  ])('%s подпись переключателя не совпадает с выходом из аккаунта', async (_case, query) => {
    token.value = 'admin-token';
    search.value = query;

    render(<EditorToggle />);

    const link = await screen.findByRole('link');
    expect(link.textContent?.trim()).not.toBe('Выйти');
  });
});

describe('честность режима', () => {
  it('выход из режима подписан не как выход из аккаунта', async () => {
    render(<EditorNotice editing />);

    const exit = await screen.findByRole('link');
    expect(exit).toHaveTextContent('Закончить правку');
    expect(exit.textContent?.trim()).not.toBe('Выйти');
  });

  it('говорит вслух, когда флаг стоит, а черновика сервер не дал', async () => {
    token.value = 'admin-token';
    search.value = 'edit=1';

    render(<EditorNotice editing={false} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Сервер не признал сессию/);
  });

  it('постороннему по прямой ссылке не рассказывает ни про какой режим', async () => {
    search.value = 'edit=1';

    render(<EditorNotice editing={false} />);

    await waitFor(() => expect(me).not.toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('сломанный черновик', () => {
  const target = {
    kind: 'section' as const,
    id: 'sec-1',
    label: 'Герой',
    section: {id: 'sec-1', slug: 'aw26-hero', layout: 'hero' as const, status: 'active' as const, nameRu: 'Герой', nameEn: 'Hero', sortOrder: 0},
  };

  it('ставит видимый маркер рядом с карточкой, а не только строку в логе', () => {
    render(
      <EditorProvider
        editing
        brokenDrafts={[{kind: 'section', id: 'sec-1', key: 'aw26-hero', reason: 'draft_has_unknown_field:headlinRu'}]}
      >
        <EditableBlock target={target} owner={{kind: 'section', id: 'sec-1'}}>
          <p>опубликованный заголовок</p>
        </EditableBlock>
      </EditorProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent(/Черновик этой карточки не читается/);
    expect(screen.getByRole('status')).toHaveTextContent(/headlinRu/);
    expect(screen.getByText('опубликованный заголовок')).toBeInTheDocument();
  });

  it('вне режима не рисует ни рамок, ни кнопок — покупатель получает ту же страницу', () => {
    const {container} = render(
      <EditorProvider editing={false} brokenDrafts={[{kind: 'section', id: 'sec-1', key: 'aw26-hero', reason: 'x'}]}>
        <EditableBlock target={target} owner={{kind: 'section', id: 'sec-1'}}>
          <p>опубликованный заголовок</p>
        </EditableBlock>
      </EditorProvider>,
    );

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelector('aside')).toBeNull();
  });
});
