import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {EditorProvider} from '../EditorProvider';
import EditableBlock from '../EditableBlock';
import {setViewport} from './viewport';

vi.mock('next/navigation', () => ({
  usePathname: () => '/ru',
  useSearchParams: () => new URLSearchParams('edit=1'),
  useRouter: () => ({refresh: vi.fn()}),
}));
vi.mock('../useEditorSession', () => ({useEditorSession: () => ({isAdmin: true})}));
const save = vi.fn();
const listDrafts = vi.fn();
const publish = vi.fn();
const discard = vi.fn();
vi.mock('../editorApi', () => ({
  saveSectionDraft: (...args: unknown[]) => save(...args),
  uploadMedia: vi.fn(),
  listDrafts: (...args: unknown[]) => listDrafts(...args),
  publish: (...args: unknown[]) => publish(...args),
  discard: (...args: unknown[]) => discard(...args),
}));

const section = (id: string, headline: string) => ({
  id, slug: id, layout: 'hero' as const, status: 'active' as const,
  nameRu: headline, nameEn: headline, headlineRu: headline, sortOrder: 0,
});

function Workspace() {
  return <EditorProvider editing locale="ru">
    {['Hero', 'Sets'].map((label) => <EditableBlock key={label}
      target={{kind: 'section', id: label, label, section: section(label, label)}}
      owner={{kind: 'section', id: label}}>
      <p>{label} preview</p>
    </EditableBlock>)}
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Exercise the native anchor guard independently of Next Link navigation. */}
    <a href="/ru/shop">Shop</a>
  </EditorProvider>;
}

beforeEach(() => {
  setViewport(1280);
  save.mockReset().mockResolvedValue({});
  listDrafts.mockReset().mockResolvedValue([]);
  publish.mockReset().mockResolvedValue({});
  discard.mockReset().mockResolvedValue({});
});
afterEach(() => {cleanup(); vi.restoreAllMocks();});

describe('editor workspace', () => {
  it('reserves a permanent inspector before selection and lists the real editable regions', async () => {
    const user = userEvent.setup();
    const {container} = render(<Workspace />);
    const inspector = screen.getByRole('complementary', {name: 'Редактор сайта'});
    const preview = container.querySelector('[data-editor-preview]')!;
    const initialClass = preview.className;
    await user.click(within(inspector).getByRole('button', {name: 'Hero'}));
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('Hero');
    expect(preview.className).toBe(initialClass);
    await user.click(within(inspector).getByRole('tab', {name: 'Блоки'}));
    await user.click(within(inspector).getByRole('button', {name: 'Sets'}));
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('Sets');
  });

  it('keeps unsaved values when changing region is cancelled and blocks navigation', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const {container} = render(<Workspace />);
    fireEvent.click(screen.getByText('Hero preview'));
    await user.clear(screen.getByLabelText('Заголовок · ru'));
    await user.type(screen.getByLabelText('Заголовок · ru'), 'Unsaved');
    fireEvent.click(screen.getByText('Sets preview'));
    expect(confirm).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('Unsaved');
    expect(container.querySelectorAll('[data-editable][data-selected="true"]')).toHaveLength(1);
    const event = new MouseEvent('click', {bubbles: true, cancelable: true});
    screen.getByRole('link', {name: 'Shop'}).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not leave or change target during an in-flight save', async () => {
    const user = userEvent.setup();
    save.mockImplementation(() => new Promise(() => {}));
    render(<Workspace />);
    fireEvent.click(screen.getByText('Hero preview'));
    await user.type(screen.getByLabelText('Заголовок · ru'), ' changed');
    await user.click(screen.getByRole('button', {name: 'Сохранить в черновик'}));
    fireEvent.click(screen.getByText('Sets preview'));
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('Hero changed');
    expect(screen.getByRole('button', {name: 'Закончить правку'})).toBeDisabled();
  });

  it('selects one region when multiple regions edit the same model', () => {
    const target = {kind: 'section' as const, id: 'same', label: 'First', section: section('same', 'Shared')};
    const {container} = render(<EditorProvider editing locale="ru">
      <EditableBlock target={target} owner={{kind: 'section', id: 'same'}}><p>First content</p></EditableBlock>
      <EditableBlock target={{...target, label: 'Second'}} owner={{kind: 'section', id: 'same'}}><p>Second content</p></EditableBlock>
    </EditorProvider>);
    fireEvent.click(screen.getByText('Second content'));
    const selected = container.querySelectorAll('[data-editable][data-selected="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Second content');
  });

  it('keeps publication protected across tabs and prevents editing until it completes', async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    publish.mockReturnValue(new Promise<void>((resolve) => {finish = resolve;}));
    listDrafts.mockResolvedValue([{kind: 'section', id: 'Hero', key: 'Hero', fields: ['headlineRu']}]);
    render(<Workspace />);
    fireEvent.click(screen.getByText('Hero preview'));
    await user.click(screen.getByRole('tab', {name: 'Изменения'}));
    await user.click(await screen.findByRole('button', {name: 'Опубликовать'}));
    await user.click(screen.getByRole('tab', {name: 'Свойства'}));
    expect(screen.getByLabelText('Заголовок · ru')).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Закончить правку'})).toBeDisabled();
    await act(async () => finish());
    expect(screen.getByLabelText('Заголовок · ru')).toBeEnabled();
  });

  it('keeps local unsaved changes separate from deleting a saved server draft', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    listDrafts.mockResolvedValue([{kind: 'section', id: 'Hero', key: 'Hero', fields: ['headlineRu']}]);
    render(<Workspace />);
    fireEvent.click(screen.getByText('Hero preview'));
    await user.type(screen.getByLabelText('Заголовок · ru'), ' unsaved');
    await user.click(screen.getByRole('tab', {name: 'Изменения'}));
    expect(await screen.findByRole('button', {name: 'Удалить сохранённый черновик'})).toBeDisabled();
    await user.click(screen.getByRole('tab', {name: 'Свойства'}));
    await user.click(screen.getByRole('button', {name: 'Отменить несохранённое'}));
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('Hero');
    expect(discard).not.toHaveBeenCalled();
    await user.click(screen.getByRole('tab', {name: 'Изменения'}));
    await user.click(screen.getByRole('button', {name: 'Удалить сохранённый черновик'}));
    expect(discard).toHaveBeenCalledWith('section', 'Hero');
    await user.click(screen.getByRole('tab', {name: 'Свойства'}));
    expect(screen.queryByLabelText('Заголовок · ru')).not.toBeInTheDocument();
  });

  it.each(['preview', 'list'] as const)('guards a new entity in the same region through %s selection', async (route) => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const page = (id: string) => <EditorProvider editing locale="ru">
      <EditableBlock target={{kind: 'section', id, label: 'Shared region', section: section(id, id)}}
        owner={{kind: 'section', id}}><p>Shared content</p></EditableBlock>
    </EditorProvider>;
    const {rerender} = render(page('First'));
    fireEvent.click(screen.getByText('Shared content'));
    await user.type(screen.getByLabelText('Заголовок · ru'), ' edited');
    rerender(page('Second'));
    if (route === 'list') {
      await user.click(screen.getByRole('tab', {name: 'Блоки'}));
      await user.click(screen.getByRole('button', {name: 'Shared region'}));
    } else fireEvent.click(screen.getByText('Shared content'));
    expect(confirm).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('tab', {name: 'Свойства'}));
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('First edited');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByText('Shared content'));
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('Second');
  });

  it('preserves unsaved values on a modified click that opens a new tab', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Workspace />);
    fireEvent.click(screen.getByText('Hero preview'));
    await user.type(screen.getByLabelText('Заголовок · ru'), ' edited');
    const event = new MouseEvent('click', {bubbles: true, cancelable: true, metaKey: true});
    screen.getByRole('link', {name: 'Shop'}).dispatchEvent(event);
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('Hero edited');
  });

  it('does not reopen a deleted section draft until the refreshed preview supplies fresh data', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    listDrafts.mockResolvedValue([{kind: 'section', id: 'Hero', key: 'Hero', fields: ['headlineRu']}]);
    const page = (value: ReturnType<typeof section>) => <EditorProvider editing locale="ru">
      <EditableBlock target={{kind: 'section', id: 'Hero', label: 'Hero', section: value}}
        owner={{kind: 'section', id: 'Hero'}}><p>Hero preview</p></EditableBlock>
    </EditorProvider>;
    const old = section('Hero', 'Draft');
    const {rerender} = render(page(old));
    fireEvent.click(screen.getByText('Hero preview'));
    await user.click(screen.getByRole('tab', {name: 'Изменения'}));
    await user.click(await screen.findByRole('button', {name: 'Удалить сохранённый черновик'}));
    fireEvent.click(screen.getByText('Hero preview'));
    expect(screen.queryByLabelText('Заголовок · ru')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Обновляем предпросмотр');
    rerender(page(section('Hero', 'Published')));
    fireEvent.click(screen.getByText('Hero preview'));
    expect(screen.getByLabelText('Заголовок · ru')).toHaveValue('Published');
  });
});
