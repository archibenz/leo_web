import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/ru',
  useSearchParams: () => new URLSearchParams('edit=1'),
  useRouter: () => ({refresh}),
}));

const calls: {path: string; init?: {method?: string; body?: unknown}}[] = [];
const answer = vi.fn();
vi.mock('../../../lib/api', () => ({
  getToken: () => 'admin-token',
  API_BASE: '',
  apiFetch: (path: string, init?: {method?: string; body?: unknown}) => {
    calls.push({path, init});
    return answer(path, init);
  },
}));

import SectionForm from '../SectionForm';
import PublishList from '../PublishList';
import {EditorProvider} from '../EditorProvider';

const SECTION = {
  id: 'sec-1',
  slug: 'aw26-hero',
  layout: 'hero' as const,
  status: 'active' as const,
  nameRu: 'Герой',
  nameEn: 'Hero',
  eyebrowRu: 'Осень / Зима 2026',
  eyebrowEn: 'Autumn / Winter 2026',
  headlineRu: 'Точный\nкрой',
  headlineEn: 'Precise\ntailoring',
  videoUrl: '/videos/white/hero.mp4',
  posterUrl: '/images/white/hero.jpg',
  sortOrder: 0,
};

beforeEach(() => {
  calls.length = 0;
  refresh.mockReset();
  answer.mockReset().mockResolvedValue({});
});

afterEach(cleanup);

describe('правка блока на месте', () => {
  it('шлёт только тронутое поле — иначе вторая правка затирала бы первую', async () => {
    const user = userEvent.setup();
    render(<SectionForm section={SECTION} onSaved={() => {}} />);

    const save = screen.getByRole('button', {name: /Сохранить в черновик/i});
    expect(save).toBeDisabled();

    await user.clear(screen.getByLabelText('Надзаголовок · ru'));
    await user.type(screen.getByLabelText('Надзаголовок · ru'), 'Зима');
    await user.click(save);

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]!.path).toBe('/api/admin/storefront/sections/sec-1');
    expect(calls[0]!.init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({eyebrowRu: 'Зима'});
  });

  it('очищенное поле уезжает как null — снять подпись это намерение, а не забытый ключ', async () => {
    const user = userEvent.setup();
    render(<SectionForm section={SECTION} onSaved={() => {}} />);

    await user.clear(screen.getByLabelText('Надзаголовок · ru'));
    await user.click(screen.getByRole('button', {name: /Сохранить в черновик/i}));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({eyebrowRu: null});
  });
});

describe('публикация и отмена', () => {
  const drafts = [{kind: 'section' as const, id: 'sec-1', key: 'aw26-hero', fields: ['headlineRu', 'posterUrl']}];

  function renderList() {
    answer.mockImplementation((path: string) => Promise.resolve(path.endsWith('/drafts') ? drafts : {}));
    return render(
      <EditorProvider editing brokenDrafts={[]}>
        <PublishList reloadKey={0} />
      </EditorProvider>,
    );
  }

  it('показывает, что именно изменится', async () => {
    renderList();

    expect(await screen.findByText(/aw26-hero/)).toBeInTheDocument();
    expect(screen.getByText('headlineRu, posterUrl')).toBeInTheDocument();
  });

  it('«Опубликовать» бьёт в ручку публикации этого блока и перечитывает страницу', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByRole('button', {name: /Опубликовать/i}));

    await waitFor(() => expect(calls.map((c) => c.path)).toContain('/api/admin/storefront/sections/sec-1/publish'));
    expect(calls.find((c) => c.path.endsWith('/publish'))!.init?.method).toBe('POST');
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('«Отменить черновик» удаляет именно черновик, а не строку', async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(await screen.findByRole('button', {name: /Отменить черновик/i}));

    await waitFor(() => expect(calls.map((c) => c.path)).toContain('/api/admin/storefront/sections/sec-1/draft'));
    expect(calls.find((c) => c.path.endsWith('/draft'))!.init?.method).toBe('DELETE');
  });

  it('у нечитаемого черновика говорит, что публиковать его нельзя', async () => {
    answer.mockImplementation((path: string) => Promise.resolve(path.endsWith('/drafts') ? drafts : {}));
    render(
      <EditorProvider editing brokenDrafts={[{kind: 'section', id: 'sec-1', key: 'aw26-hero', reason: 'unknown_variant:wb-404'}]}>
        <PublishList reloadKey={0} />
      </EditorProvider>,
    );

    expect(await screen.findByRole('status')).toHaveTextContent(/опубликовать его нельзя/i);
  });
});
