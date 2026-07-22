import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import AccountPage from './page';

// The logout confirmation modal was ported off framer-motion to CSS transitions
// (lw-1dxx), and gained a real focus trap + ESC handler in the process. This
// exercises that modal through the actual authenticated account page.
const {mockLogout} = vi.hoisted(() => ({mockLogout: vi.fn()}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({push: vi.fn()}),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('../../../contexts', () => ({
  useAuth: () => ({
    user: {name: 'Test User', email: 'test@example.com', createdAt: '2024-01-01T00:00:00Z', hasPassword: true},
    isAuthenticated: true,
    isLoading: false,
    isAdmin: false,
    login: vi.fn(),
    sendCode: vi.fn(),
    register: vi.fn(),
    initTelegramAuth: vi.fn(),
    loginWithToken: vi.fn(),
    logout: mockLogout,
    validateEmail: vi.fn(),
    linkEmail: vi.fn(),
    updateNewsletterPreferences: vi.fn(),
    deleteAccount: vi.fn(),
    requestDeleteChallenge: vi.fn(),
  }),
  useFavorites: () => ({items: [], removeItem: vi.fn(), isLoading: false}),
}));

vi.mock('../../../hooks/useRecentlyViewed', () => ({
  useRecentlyViewed: () => ({items: []}),
}));

vi.mock('../../../components/HeroShaderBackgroundClient', () => ({
  default: () => null,
}));

const openLogoutModal = () => {
  render(<AccountPage />);
  fireEvent.click(screen.getByRole('button', {name: 'profile.logOut'}));
  return screen.getByRole('dialog');
};

describe('AccountPage logout confirmation modal', () => {
  beforeEach(() => {
    // jsdom here ships no localStorage; the page's Telegram-poll effect reads it.
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
    Object.defineProperty(globalThis, 'localStorage', {value: storage, configurable: true, writable: true});
    Object.defineProperty(window, 'localStorage', {value: storage, configurable: true, writable: true});
    mockLogout.mockClear();
  });

  it('opens a labelled dialog and traps focus onto Cancel', () => {
    const dialog = openLogoutModal();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'logout-confirm-title');
    // Focus trap engages on open — first focusable is the Cancel button.
    expect(document.activeElement).toBe(screen.getByRole('button', {name: 'Cancel'}));
  });

  it('closes on Escape without logging out', async () => {
    openLogoutModal();

    fireEvent.keyDown(document, {key: 'Escape'});

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click', async () => {
    const dialog = openLogoutModal();
    const backdrop = dialog.previousElementSibling as HTMLElement;

    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    fireEvent.click(backdrop);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('logs out when Sign out is confirmed', () => {
    openLogoutModal();

    fireEvent.click(screen.getByRole('button', {name: 'Sign out'}));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
