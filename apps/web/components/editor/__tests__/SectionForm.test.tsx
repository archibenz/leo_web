import {describe, it, expect, afterEach, beforeEach, vi} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const calls: {path: string; init?: {method?: string; body?: unknown}}[] = [];
vi.mock('../editorApi', () => ({
  saveSectionDraft: (id: string, patch: Record<string, unknown>) => {
    calls.push({path: `/api/admin/storefront/sections/${id}`, init: {method: 'PUT', body: JSON.stringify(patch)}});
    return Promise.resolve({});
  },
  uploadMedia: (...args: unknown[]) => uploadMedia(...args),
}));
const uploadMedia = vi.fn();

import SectionForm from '../SectionForm';

const SECTION = {
  id: 'sec-1',
  slug: 'aw26-hero',
  layout: 'hero' as const,
  status: 'active' as const,
  nameRu: 'Герой',
  nameEn: 'Hero',
  headlineRu: 'Точный крой',
  headlineEn: 'Precise tailoring',
  videoUrl: '/videos/white/hero-m.mp4',
  videoDesktopUrl: '/videos/white/hero-d.mp4',
  posterUrl: '/images/white/hero-m.jpg',
  posterDesktopUrl: '/images/white/hero-d.jpg',
  sortOrder: 0,
};

beforeEach(() => {
  calls.length = 0;
  uploadMedia.mockReset();
});
afterEach(cleanup);

// Требование задачи: у блока видна пара «телефон / компьютер», подписанная,
// а не два поля без объяснения — и адрес файла больше не единственное, что
// показано (см. task-admin-media-brief.md, пункт 5 и «Миниатюры вместо адресов»).

describe('SectionForm — пара телефон/десктоп', () => {
  it('ролик и кадр показывают ОБЕ версии рядом, картинками, с подписями «Телефон»/«Десктоп»', () => {
    render(<SectionForm section={SECTION} onSaved={() => {}} />);

    // Ролик — <video>, у него нет ARIA-роли "img"; миниатюра узнаётся по
    // подписи-обёртке (title у MediaThumb — тот самый «адрес мелко под кадром»).
    expect(screen.getByTitle('/videos/white/hero-m.mp4')).toBeInTheDocument();
    expect(screen.getByTitle('/videos/white/hero-d.mp4')).toBeInTheDocument();

    // Кадр — обычная картинка, доступна и по роли, и по подписи «Телефон/Десктоп».
    expect(screen.getByRole('img', {name: 'Телефон'})).toHaveAttribute('src', '/images/white/hero-m.jpg');
    expect(screen.getByRole('img', {name: 'Десктоп'})).toHaveAttribute('src', '/images/white/hero-d.jpg');
  });

  it('правка десктопной версии не трогает телефонную — патч содержит только тронутое поле', async () => {
    uploadMedia.mockResolvedValue('/images/white/hero-d2.jpg');
    const user = userEvent.setup();
    render(<SectionForm section={SECTION} onSaved={() => {}} />);

    // getAllByLabelText('Десктоп') ловит и file-input, и превью-<video> пары
    // «Ролик» — у него тоже aria-label="Десктоп" (см. MediaThumb). Файловых
    // input'ов из них двое: первый — у «Ролика», второй — у «Кадра».
    const desktopFileInputs = screen.getAllByLabelText('Десктоп').filter((el) => el.tagName === 'INPUT');
    expect(desktopFileInputs).toHaveLength(2);
    await user.upload(desktopFileInputs[1]!, new File(['x'], 'd2.jpg', {type: 'image/jpeg'}));

    // Загрузка идёт через await внутри MediaField.pick — ждём, чтобы «грязность»
    // формы успела долететь до кнопки, прежде чем на неё нажать.
    const save = screen.getByRole('button', {name: /Сохранить в черновик/i});
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(JSON.parse(String(calls[0]!.init?.body))).toEqual({posterDesktopUrl: '/images/white/hero-d2.jpg'});
  });
});
