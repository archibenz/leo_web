import {render, screen} from '@testing-library/react';
import {describe, it, expect, vi} from 'vitest';
import MenuOverlay from '../MenuOverlay';

const mockPathname = vi.fn(() => '/ru');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('MenuOverlay primary nav', () => {
  it('lists Home before Shop, linking to the locale root', () => {
    mockPathname.mockReturnValue('/ru');
    render(<MenuOverlay isOpen onClose={vi.fn()} locale="ru" />);

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/ru');
    expect(links[0]).toHaveTextContent('home');
    expect(links[1]).toHaveAttribute('href', '/ru/shop');
    expect(links[1]).toHaveTextContent('shop');
  });

  it('marks Home current on the home route, not on /shop', () => {
    mockPathname.mockReturnValue('/ru');
    const {rerender} = render(<MenuOverlay isOpen onClose={vi.fn()} locale="ru" />);
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('aria-current', 'page');

    mockPathname.mockReturnValue('/ru/shop');
    rerender(<MenuOverlay isOpen onClose={vi.fn()} locale="ru" />);
    expect(screen.getAllByRole('link')[0]).not.toHaveAttribute('aria-current');
    expect(screen.getAllByRole('link')[1]).toHaveAttribute('aria-current', 'page');
  });
});

describe('MenuOverlay labels', () => {
  // useTranslations is mocked to echo keys, so assertions pin the i18n keys:
  // menu.label for the dialog, header.closeMenu / header.catalog for the rest.
  it('labels close controls as closeMenu, distinct from the dialog label', () => {
    mockPathname.mockReturnValue('/ru');
    render(<MenuOverlay isOpen onClose={vi.fn()} locale="ru" />);

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'label');
    // Scrim + X button both announce closing, not "Menu".
    expect(screen.getAllByRole('button', {name: 'closeMenu'})).toHaveLength(2);
  });

  it('gives the primary nav its own label instead of duplicating the dialog', () => {
    mockPathname.mockReturnValue('/ru');
    render(<MenuOverlay isOpen onClose={vi.fn()} locale="ru" />);

    expect(screen.getByRole('navigation', {name: 'catalog'})).toBeInTheDocument();
    expect(screen.getByRole('navigation', {name: 'sections.more'})).toBeInTheDocument();
    expect(screen.queryByRole('navigation', {name: 'label'})).toBeNull();
  });
});
