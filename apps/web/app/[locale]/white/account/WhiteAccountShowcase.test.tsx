import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, within, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteAccountShowcase from './WhiteAccountShowcase';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../../messages/en.json';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/white/account',
  useSearchParams: () => new URLSearchParams(),
}));

// No token in storage → the hook resolves to signed-out immediately.
const lsStore = new Map<string, string>();
const mockLocalStorage = {
  clear: () => lsStore.clear(),
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => {
    lsStore.set(k, String(v));
  },
  removeItem: (k: string) => {
    lsStore.delete(k);
  },
  key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
  get length() {
    return lsStore.size;
  },
};
Object.defineProperty(globalThis, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const renderPage = () =>
  render(
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      <WhiteAccountShowcase locale="en" />
    </NextIntlClientProvider>,
  );

describe('WhiteAccountShowcase', () => {
  it('shows the sign-in form by default when signed out', async () => {
    renderPage();
    expect(await screen.findByRole('heading', {level: 1, name: /account/i})).toBeInTheDocument();
    expect(screen.getByRole('tab', {name: /sign in/i})).toHaveAttribute('aria-selected', 'true');
    const main = screen.getByRole('main');
    expect(within(main).getByLabelText(/email/i)).toBeInTheDocument();
    expect(within(main).getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('switches to the sign-up tab with the code step gated', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('tab', {name: /sign up/i}));
    expect(screen.getByRole('button', {name: /send the code/i})).toBeInTheDocument();
    // Name/password arrive only after the code is sent.
    expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument();
  });
});
