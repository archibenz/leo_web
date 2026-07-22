import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, within, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteAccountShowcase from './WhiteAccountShowcase';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../messages/en.json';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/account',
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

  it('sign-up gates on a required consent checkbox and sends privacyAccepted', async () => {
    const calls: {url: string; body: Record<string, unknown> | null}[] = [];
    global.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      calls.push({url: u, body: init?.body ? JSON.parse(String(init.body)) : null});
      const ok = (body: unknown) => ({ok: true, status: 200, json: async () => body});
      if (u.includes('/api/auth/send-code')) return ok({message: 'sent'}) as unknown as Response;
      if (u.includes('/api/auth/register')) return ok({token: 'tok'}) as unknown as Response;
      if (u.includes('/api/auth/me')) return ok({id: 1, email: 'anna@test.dev', name: 'Anna'}) as unknown as Response;
      return {ok: false, status: 404, json: async () => ({})} as unknown as Response;
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('tab', {name: /sign up/i}));
    await user.type(screen.getByLabelText(/email/i), 'anna@test.dev');
    await user.click(screen.getByRole('button', {name: /send the code/i}));

    // The consent checkbox is part of the final step and must be required —
    // 152-ФЗ needs a recorded consent action, not just a line of text.
    const consent = await screen.findByRole('checkbox');
    expect(consent).toBeRequired();

    await user.type(screen.getByLabelText(/code from the email/i), '123456');
    await user.type(screen.getByLabelText(/first name/i), 'Anna');
    await user.type(screen.getByLabelText(/password/i), 'Passw0rd123');
    await user.click(consent);
    await user.click(screen.getByRole('button', {name: /create account/i}));

    const register = calls.find((c) => c.url.includes('/api/auth/register'));
    expect(register).toBeDefined();
    expect(register!.body).toMatchObject({privacyAccepted: true});
  });
});
