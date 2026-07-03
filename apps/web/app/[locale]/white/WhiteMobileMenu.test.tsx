import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent, waitFor, within, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteMobileMenu from './WhiteMobileMenu';

const mockPathname = vi.fn(() => '/ru/white');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

describe('WhiteMobileMenu drawer', () => {
  it('opens a left-drawer dialog from the hamburger and lists categories without index numbers', async () => {
    const user = userEvent.setup();
    render(<WhiteMobileMenu locale="ru" />);

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', {name: 'openMenu'}));

    const dialog = await screen.findByRole('dialog', {name: 'menu'});
    // The primary category links are large serif rows — never prefixed with a
    // "01 /02" numeral (the redesign dropped them; nav isn't a sequence).
    const links = within(dialog).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) {
      expect(a.textContent ?? '').not.toMatch(/^\s*\d/);
    }
    // Bag/Saved live in the drawer base.
    expect(within(dialog).getByRole('link', {name: 'saved'})).toBeInTheDocument();
    expect(within(dialog).getByRole('link', {name: 'bag'})).toBeInTheDocument();
  });

  it('locks body scroll while open and closes on Escape', async () => {
    const user = userEvent.setup();
    render(<WhiteMobileMenu locale="ru" />);

    await user.click(screen.getByRole('button', {name: 'openMenu'}));
    await screen.findByRole('dialog');
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(document, {key: 'Escape'});
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), {timeout: 1500});
    // The white portal owns the page lock; the drawer must not clobber it — but
    // in this standalone test nothing else set it, so it restores to ''.
    expect(document.body.style.overflow).toBe('');
  });

  it('closes when the scrim is clicked', async () => {
    const user = userEvent.setup();
    render(<WhiteMobileMenu locale="ru" />);
    await user.click(screen.getByRole('button', {name: 'openMenu'}));
    await screen.findByRole('dialog');

    // The scrim is the aria-hidden overlay sibling of the dialog.
    const scrim = document.querySelector('[aria-hidden="true"].fixed');
    expect(scrim).not.toBeNull();
    fireEvent.click(scrim!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), {timeout: 1500});
  });
});
