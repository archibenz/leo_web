import {render, screen} from '@testing-library/react';
import {describe, it, expect, vi, beforeAll, beforeEach} from 'vitest';
import {createElement, type ImgHTMLAttributes} from 'react';
import HeaderNavbar from '../HeaderNavbar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({push: vi.fn()}),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props),
}));

vi.mock('../ui/navbar-menu', () => ({
  Menu: () => null,
  MenuItem: () => null,
  CategoryCard: () => null,
}));

vi.mock('../ui/search-bar', () => ({
  SearchBar: () => null,
}));

vi.mock('../MenuOverlay', () => ({
  default: () => null,
}));

type AuthLike = {
  user: {name: string; email?: string} | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  logout: () => void;
};

const mockAuth = vi.fn<() => AuthLike>();

vi.mock('../../contexts', () => ({
  useAuth: () => mockAuth(),
  useCart: () => ({count: 0}),
  useFavorites: () => ({count: 0}),
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  mockAuth.mockReturnValue({user: null, isAuthenticated: false, isAdmin: false, logout: vi.fn()});
});

// jsdom does no real layout, so these tests lock the flex-shrink chain at the
// class level; the width arithmetic proving 320px fits lives in lw-qal0.
describe('HeaderNavbar pill shrink chain (lw-qal0)', () => {
  it('logged out: left block rigid, right block shrinkable, 44px targets intact', () => {
    render(<HeaderNavbar locale="ru" />);

    const hamburger = screen.getByRole('button', {name: 'openMenu'});
    const leftBlock = hamburger.parentElement!;
    expect(leftBlock.className).toContain('flex-shrink-0');
    expect(leftBlock.className).not.toContain('min-w-0');

    const heartBtn = screen.getByRole('button', {name: 'favoritesWithCount'});
    const rightBlock = heartBtn.parentElement!;
    expect(rightBlock.className).toContain('ml-auto');
    expect(rightBlock.className).not.toContain('flex-shrink-0');
    // min-width:auto on the flex item itself would floor the block at its
    // content width and defeat every min-w-0 below it.
    expect(rightBlock.className).toContain('min-w-0');

    for (const name of ['favoritesWithCount', 'cartWithCount', 'profile']) {
      const btn = screen.getByRole('button', {name});
      expect(btn.className).toContain('h-11');
      expect(btn.className).toContain('w-11');
      expect(btn.className).toContain('flex-shrink-0');
    }
    expect(hamburger.className).toContain('h-11');
    expect(hamburger.className).toContain('w-11');

    const wordmark = screen.getByAltText('REINASLEO');
    expect(wordmark.className).toContain('max-[359px]:hidden');
    expect(wordmark.className).not.toContain('max-[429px]:hidden');
  });

  it('signed in: name chip can truncate instead of pushing the account control off-screen', () => {
    mockAuth.mockReturnValue({
      user: {name: 'Александра', email: 'a@example.com'},
      isAuthenticated: true,
      isAdmin: false,
      logout: vi.fn(),
    });
    render(<HeaderNavbar locale="ru" />);

    const chipName = screen
      .getAllByText('Александра')
      .find((el) => el.classList.contains('sm:hidden'))!;
    expect(chipName).toBeDefined();

    const truncateSpan = chipName.parentElement!;
    expect(truncateSpan.className).toContain('truncate');
    expect(truncateSpan.className).toContain('min-w-0');
    expect(truncateSpan.className).toContain('max-w-[120px]');

    const chipInner = truncateSpan.parentElement!;
    expect(chipInner.className).toContain('min-w-0');

    const chipButton = chipInner.parentElement!;
    expect(chipButton.className).toContain('h-11');

    const dropdownWrapper = chipButton.parentElement!;
    expect(dropdownWrapper.className).toContain('min-w-11');

    const rightBlock = dropdownWrapper.parentElement!;
    expect(rightBlock.className).not.toContain('flex-shrink-0');
    expect(rightBlock.className).toContain('min-w-0');

    const wordmark = screen.getByAltText('REINASLEO');
    expect(wordmark.className).toContain('max-[429px]:hidden');
  });
});
