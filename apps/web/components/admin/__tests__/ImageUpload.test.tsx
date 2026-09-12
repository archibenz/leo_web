import {render, screen, waitFor, fireEvent} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import ImageUpload from '../ImageUpload';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('../../../lib/api', () => ({
  API_BASE: '',
  getToken: () => null,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('ImageUpload accessibility', () => {
  it('gives the per-image remove button a 44px hit area, an accessible name, and keyboard reachability', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ImageUpload
        images={[{src: '/uploads/a.jpg', alt: 'Product front'}]}
        onChange={onChange}
      />,
    );

    const removeButton = screen.getByRole('button', {name: 'removeImage'});
    expect(removeButton).toHaveClass('h-11', 'w-11');
    // No hover-only opacity gating — must be visible/reachable without a mouse.
    expect(removeButton.className).not.toMatch(/opacity-0/);

    await user.tab();
    expect(removeButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('exposes the drop-zone file input via a real <label> so Tab reaches it and it is not display:none', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ImageUpload images={[]} onChange={onChange} />);

    // getByLabelText only resolves if the input has a genuine <label> (or
    // aria) association in the DOM — this fails on the old unlabeled,
    // className="hidden" input/onClick-div pair.
    const input = screen.getByLabelText(/dropzone/i) as HTMLInputElement;
    expect(input).toBeInstanceOf(HTMLInputElement);
    expect(input.type).toBe('file');
    expect(input).not.toHaveAttribute('hidden');
    expect(input.className).not.toMatch(/(^|\s)hidden(\s|$)/);

    await user.tab();
    expect(input).toHaveFocus();
  });

  it('opens the file picker when the visible drop-zone text is clicked (native label delegation)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ImageUpload images={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/dropzone/i) as HTMLInputElement;
    const inputClickHandler = vi.fn();
    input.addEventListener('click', inputClickHandler);

    await user.click(screen.getByText('dropzone'));

    expect(inputClickHandler).toHaveBeenCalled();
  });
});

describe('ImageUpload error handling', () => {
  it('shows the server message when the upload is refused, instead of failing silently', async () => {
    // Раньше `if (res.ok)` без ветки else молча глотал отказ — владелец жал
    // и не видел ничего. Текст должен дойти так же, как это делает editorApi.ts.
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({message: 'WebP не принимаем — сохраните картинку в JPEG или PNG и загрузите снова.'}),
    });
    const onChange = vi.fn();
    render(<ImageUpload images={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/dropzone/i) as HTMLInputElement;
    const file = new File(['fake'], 'photo.webp', {type: 'image/webp'});
    fireEvent.change(input, {target: {files: [file]}});

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/JPEG или PNG/));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
