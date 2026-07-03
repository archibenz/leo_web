import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import DeleteAccountModal from '../DeleteAccountModal';

// DeleteAccountModal was ported off framer-motion to CSS transitions (lw-1dxx).
// Only its presentation layer changed — these cover the a11y contract that must
// survive that port: dialog semantics, focus trap, ESC + backdrop dismissal.
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const setup = (overrides: Partial<React.ComponentProps<typeof DeleteAccountModal>> = {}) => {
  const props = {
    open: true,
    onClose: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue({success: true}),
    hasPassword: true,
    ...overrides,
  };
  render(<DeleteAccountModal {...props} />);
  return props;
};

describe('DeleteAccountModal', () => {
  it('renders as a labelled modal dialog when open', () => {
    setup();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'delete-account-title');
    // The confirmation field ("type DELETE") is present.
    expect(screen.getByPlaceholderText('DELETE')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    setup({open: false});

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('traps focus onto the first field when it opens', () => {
    setup();

    // useFocusTrap moves focus to the first focusable — the credential input.
    expect(document.activeElement).toBe(screen.getByLabelText('passwordLabel'));
  });

  it('closes on Escape', () => {
    const {onClose} = setup();

    fireEvent.keyDown(document, {key: 'Escape'});

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a backdrop click', () => {
    const {onClose} = setup();

    const backdrop = screen.getByRole('dialog').previousElementSibling as HTMLElement;
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not submit until DELETE + a credential are provided', async () => {
    const onConfirm = vi.fn().mockResolvedValue({success: true});
    setup({onConfirm});

    // Submit button is disabled with empty fields.
    const submit = screen.getByRole('button', {name: 'confirmDelete'});
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText('passwordLabel'), {target: {value: 'hunter2'}});
    fireEvent.change(screen.getByLabelText('confirmationLabel'), {target: {value: 'DELETE'}});
    expect(submit).toBeEnabled();

    fireEvent.click(submit);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('hunter2', 'DELETE'));
  });
});
