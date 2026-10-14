import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {DraftSummary} from '../editorApi';

const api = vi.hoisted(() => ({
  uploadMedia: vi.fn(),
  saveSectionDraft: vi.fn(),
  listDrafts: vi.fn(),
  publish: vi.fn(),
  discard: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('../editorApi', () => api);
vi.mock('../EditorProvider', () => ({useEditor: () => ({refresh: api.refresh, brokenDrafts: []})}));

import {EditorButton} from '../EditorFields';
import GalleryField from '../GalleryField';
import PublishList from '../PublishList';
import SectionForm from '../SectionForm';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

const SECTION = {
  id: 'hero', slug: 'hero', layout: 'hero' as const, status: 'active' as const,
  nameRu: 'Герой', nameEn: 'Hero', headlineRu: 'Крой', sortOrder: 0,
};
const DRAFT: DraftSummary = {id: 'hero', kind: 'section', key: 'hero', fields: ['headlineRu']};

beforeEach(() => {
  vi.resetAllMocks();
  api.saveSectionDraft.mockResolvedValue({});
  api.publish.mockResolvedValue({});
  api.discard.mockResolvedValue({});
});
afterEach(cleanup);

describe('GalleryField file target', () => {
  it('lets the keyboard reach the native file chooser', async () => {
    const user = userEvent.setup();
    render(<><style>{'.hidden {display: none}'}</style><GalleryField image="" gallery={[]} onChange={() => {}} /></>);

    await user.tab();

    expect(screen.getByLabelText('Добавить кадры')).toHaveFocus();
  });

  it('shows the file drag cue only for files and clears it after leaving', () => {
    render(<GalleryField image="" gallery={[]} onChange={() => {}} />);
    const target = screen.getByLabelText('Добавить кадры').closest('label')!;

    fireEvent.dragEnter(target, {dataTransfer: {types: ['text/plain']}});
    expect(target).not.toHaveAttribute('data-dragging', 'true');
    fireEvent.dragEnter(target, {dataTransfer: {types: ['Files']}});
    expect(target).toHaveAttribute('data-dragging', 'true');
    fireEvent.dragLeave(target, {relatedTarget: null});
    expect(target).not.toHaveAttribute('data-dragging', 'true');
  });
});

describe('SectionForm upload lifecycle', () => {
  it('blocks saving a text edit until both concurrent media uploads finish', async () => {
    const video = deferred<string>();
    const poster = deferred<string>();
    api.uploadMedia.mockImplementation((_file: File, kind: string) => kind === 'video' ? video.promise : poster.promise);
    const user = userEvent.setup();
    render(<SectionForm section={SECTION} onSaved={() => {}} />);
    await user.type(screen.getByLabelText('Заголовок · ru'), ' новый');
    const save = screen.getByRole('button', {name: 'Сохранить в черновик'});
    expect(save).toBeEnabled();
    const inputs = screen.getAllByLabelText('Телефон').filter((element) => element.tagName === 'INPUT');
    await user.upload(inputs[0], new File(['video'], 'hero.mp4', {type: 'video/mp4'}));
    await user.upload(inputs[1], new File(['image'], 'hero.jpg', {type: 'image/jpeg'}));
    expect(save).toBeDisabled();
    await user.click(save);
    expect(api.saveSectionDraft).not.toHaveBeenCalled();

    await act(async () => video.resolve('/uploads/hero.mp4'));
    expect(save).toBeDisabled();
    await act(async () => poster.resolve('/uploads/hero.jpg'));
    expect(save).toBeEnabled();
    await user.click(save);
    expect(api.saveSectionDraft).toHaveBeenCalledWith('hero', {
      headlineRu: 'Крой новый', videoUrl: '/uploads/hero.mp4', posterUrl: '/uploads/hero.jpg',
    });
  });

  it('releases save after a failed upload and preserves the server error', async () => {
    const upload = deferred<string>();
    api.uploadMedia.mockReturnValue(upload.promise);
    const user = userEvent.setup();
    render(<SectionForm section={SECTION} onSaved={() => {}} />);
    await user.type(screen.getByLabelText('Заголовок · ru'), ' новый');
    const input = screen.getAllByLabelText('Телефон').find((element) => element.tagName === 'INPUT')!;
    await user.upload(input, new File(['video'], 'hero.mp4', {type: 'video/mp4'}));
    const save = screen.getByRole('button', {name: 'Сохранить в черновик'});
    expect(save).toBeDisabled();

    await act(async () => upload.reject(new Error('Пришлите исходник в телеграм')));

    expect(screen.getByRole('alert')).toHaveTextContent('Пришлите исходник в телеграм');
    expect(save).toBeEnabled();
  });
});

describe('EditorButton pending state', () => {
  it('uses actual busy state for a primary action and keeps its text-only label', () => {
    const {rerender} = render(<EditorButton tone="solid">сохраняю…</EditorButton>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('button')).toBeEnabled();

    rerender(<EditorButton tone="solid" busy>сохраняю…</EditorButton>);

    const button = screen.getByRole('button', {name: 'сохраняю…'});
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(button.querySelector('svg')).toBeNull();
  });
});

describe('PublishList refresh lifecycle', () => {
  it.each(['publish', 'discard'] as const)('keeps %s pending until the updated drafts arrive', async (action) => {
    const reload = deferred<DraftSummary[]>();
    api.listDrafts.mockResolvedValueOnce([DRAFT]).mockReturnValueOnce(reload.promise);
    const user = userEvent.setup();
    render(<PublishList reloadKey={0} />);
    const actionName = action === 'publish' ? 'Опубликовать' : 'Отменить черновик';
    await user.click(await screen.findByRole('button', {name: actionName}));
    await waitFor(() => expect(api.listDrafts).toHaveBeenCalledTimes(2));

    const pending = screen.getByRole('button', {name: action === 'publish' ? 'публикую…' : 'отменяю…'});
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true);

    await act(async () => reload.resolve([]));
    expect(screen.getByText('Неопубликованных правок нет.')).toBeInTheDocument();
    expect(api.refresh).toHaveBeenCalledTimes(1);
  });

  it('shows a failed refresh even when the previous draft list was empty', async () => {
    api.listDrafts.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Нет связи с сервером'));
    const {rerender} = render(<PublishList reloadKey={0} />);
    await screen.findByText('Неопубликованных правок нет.');

    rerender(<PublishList reloadKey={1} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Нет связи с сервером');
  });
});
