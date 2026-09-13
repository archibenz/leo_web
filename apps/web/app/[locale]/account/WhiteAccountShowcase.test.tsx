import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, within, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteAccountShowcase from './WhiteAccountShowcase';
import {NextIntlClientProvider} from 'next-intl';
import {whiteLogout} from '../../../hooks/useWhiteAuth';
import enMessages from '../../../messages/en.json';

const trackSiteEvent = vi.fn();
vi.mock('../../../lib/siteEvents', () => ({trackSiteEvent: (...args: unknown[]) => trackSiteEvent(...args)}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/account',
  useSearchParams: () => new URLSearchParams(),
  // EditModeSwitch (owner-only, self-gating) calls useRouter() unconditionally
  // — React's rules of hooks mean it runs even for the anonymous visitors most
  // of this file's tests render as.
  useRouter: () => ({refresh: vi.fn()}),
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
  // The auth store is module state, so a test that signs a user in leaves the
  // next one looking at the signed-in page instead of the form.
  whiteLogout();
  trackSiteEvent.mockClear();
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
    // user_id is never sent by the client (see SiteEventTypes.REQUIRES_USER on
    // the backend) — the server resolves it from the session the register
    // response just established.
    expect(trackSiteEvent).toHaveBeenCalledWith('signup');
  });
});

// Contract of the auth-5 rebuild. Three of the four guard what the page must
// never lose (fields, the error line, the absence of third-party sign-in); the
// fourth pins the new decorative panel down — it may be seen and never touched.
describe('WhiteAccountShowcase — auth-5 contract', () => {
  it('renders the e-mail and password fields on the sign-in tab', async () => {
    renderPage();
    const main = screen.getByRole('main');
    const email = within(main).getByLabelText(/email/i);
    const password = within(main).getByLabelText(/password/i);
    expect(email).toHaveAttribute('type', 'email');
    expect(password).toHaveAttribute('type', 'password');
    expect(await screen.findByRole('button', {name: /^sign in$/i})).toBeInTheDocument();
  });

  it('shows an error when the credentials are rejected', async () => {
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      if (String(url).includes('/api/auth/login')) {
        return {ok: false, status: 401, json: async () => ({message: 'bad'})} as unknown as Response;
      }
      return {ok: false, status: 404, json: async () => ({})} as unknown as Response;
    }) as unknown as typeof fetch;

    const user = userEvent.setup();
    renderPage();
    const main = screen.getByRole('main');
    await user.type(within(main).getByLabelText(/email/i), 'anna@test.dev');
    await user.type(within(main).getByLabelText(/password/i), 'wrong-one');
    await user.click(screen.getByRole('button', {name: /^sign in$/i}));

    expect(await screen.findByText(/wrong email or password/i)).toBeInTheDocument();
  });

  it('keeps the decorative panel out of the tab order and out of the a11y tree', async () => {
    const user = userEvent.setup();
    const {container} = renderPage();

    // Exactly one, and it is the side panel: the owner asked for the moving
    // lines on the wide screen only. jsdom applies no CSS, so which screens it
    // shows on is asserted through the classes it carries; that it really is
    // invisible on a phone is proven in e2e/tests/01-account-auth.spec.ts.
    const decor = Array.from(container.querySelectorAll('[data-wv-decor]'));
    expect(decor).toHaveLength(1);
    expect(decor[0]).toHaveAttribute('aria-hidden', 'true');
    expect(decor[0]).toHaveClass('hidden', 'lg:flex');
    expect(decor[0].querySelectorAll('a, button, input, [tabindex]:not([tabindex="-1"])')).toHaveLength(0);

    // The form keeps its own tab order: e-mail hands focus to password, and a
    // tab switch leaves focus on the control that was pressed rather than
    // dropping it back to the body.
    const main = screen.getByRole('main');
    const email = within(main).getByLabelText(/email/i);
    email.focus();
    await user.tab();
    expect(document.activeElement).toBe(within(main).getByLabelText(/password/i));

    const signUp = screen.getByRole('tab', {name: /sign up/i});
    await user.click(signUp);
    expect(document.activeElement).toBe(signUp);
  });

  it('offers no Apple, GitHub or Google sign-in', async () => {
    renderPage();
    await screen.findByRole('heading', {level: 1, name: /account/i});
    expect(screen.queryByRole('button', {name: /apple/i})).toBeNull();
    expect(screen.queryByRole('button', {name: /github/i})).toBeNull();
    expect(screen.queryByRole('button', {name: /google/i})).toBeNull();
    expect(screen.queryByRole('link', {name: /apple|github|google/i})).toBeNull();
  });
});
