import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const search = {value: ''};
const path = {value: '/ru'};
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => path.value,
  useSearchParams: () => new URLSearchParams(search.value),
  useRouter: () => ({refresh}),
}));

const token = {value: null as string | null};
const me = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => token.value,
  apiFetch: (path: string) => me(path),
  API_BASE: '',
}));

import EditorNotice from '../EditorNotice';
import EditableBlock from '../EditableBlock';
import {EditorProvider} from '../EditorProvider';

beforeEach(() => {
  search.value = '';
  path.value = '/ru';
  token.value = null;
  me.mockReset().mockResolvedValue({role: 'admin'});
  sessionStorage.clear();
  refresh.mockReset();
  document.cookie = 'rl_edit=; Path=/; Max-Age=0';
});

afterEach(cleanup);

describe('честность режима', () => {
  it('выход из режима подписан не как выход из аккаунта', async () => {
    render(<EditorNotice editing />);

    const exit = await screen.findByRole('link');
    expect(exit).toHaveTextContent('Закончить правку');
    expect(exit.textContent?.trim()).not.toBe('Выйти');
  });

  // Раньше ссылка только снимала ?edit=1 из адреса. Кука, которую ставит
  // выключатель в аккаунте, той навигацией не трогалась — режим включился бы
  // снова на следующей загрузке той же страницы.
  it('снимает куку rl_edit, а не только параметр из адреса', async () => {
    document.cookie = 'rl_edit=1; Path=/; SameSite=Lax; Secure';
    const user = userEvent.setup();
    render(<EditorNotice editing />);

    const exit = await screen.findByRole('link');
    await user.click(exit);

    expect(document.cookie).not.toContain('rl_edit=1');
    expect(refresh).toHaveBeenCalled();
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
