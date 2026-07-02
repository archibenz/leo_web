import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, it, expect, vi} from 'vitest';
import ImageUpload from '../ImageUpload';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('../../../lib/api', () => ({
  API_BASE: '',
  getToken: () => null,
}));

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
