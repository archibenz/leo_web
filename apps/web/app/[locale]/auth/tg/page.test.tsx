import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import TelegramAuthPage from './page';

// `negodnyy` is 8 chars — under the 20-char floor the page checks client-side,
// so it never reaches the network. That is also why the e2e spec
// (e2e/tests/11-tg-landing.spec.ts) can use the same literal token without a
// backend running.
const BAD_TOKEN = 'negodnyy';
const GOOD_TOKEN = 'a'.repeat(32);

const push = vi.fn();
const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({push, replace}),
  useSearchParams: () => searchParams,
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'ru',
  useTranslations: () => Object.assign((key: string) => key, {rich: (key: string) => key}),
}));

// The page adopts its token the same way WhiteTelegramLogin does — no
// AuthProvider in its tree, so the module-level function is what's mocked,
// not a hook.
const whiteAdoptToken = vi.fn(async (_token: string) => ({ok: true}));
vi.mock('../../../../hooks/useWhiteAuth', () => ({
  whiteAdoptToken: (token: string) => whiteAdoptToken(token),
}));

function mockExchange(token = 'jwt-xyz') {
  global.fetch = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({token, id: '1', email: null, name: 'A'}),
  })) as unknown as typeof fetch;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  push.mockClear();
  replace.mockClear();
  whiteAdoptToken.mockClear();
  whiteAdoptToken.mockImplementation(async () => ({ok: true}));
  searchParams = new URLSearchParams();
});

describe('TelegramAuthPage — error state', () => {
  it('renders the white error card in the White DNA, not the old gradient one', async () => {
    searchParams = new URLSearchParams({token: BAD_TOKEN});
    const {container} = render(<TelegramAuthPage />);

    expect(await screen.findByText('title')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'cta'})).toBeInTheDocument();

    // The proof this task exists for: the old gradient-only classes must be
    // gone from this route's markup.
    expect(container.querySelector('.paper-card')).toBeNull();
    expect(container.querySelector('.lux-btn-primary')).toBeNull();
    expect(container.querySelector('.text-ink-soft')).toBeNull();
  });

  it('sends the cta to the account page, same as before', async () => {
    searchParams = new URLSearchParams({token: BAD_TOKEN});
    const user = userEvent.setup();
    render(<TelegramAuthPage />);

    await user.click(await screen.findByRole('button', {name: 'cta'}));
    expect(push).toHaveBeenCalledWith('/ru/account');
  });
});

describe('TelegramAuthPage — successful exchange', () => {
  it('adopts the token via whiteAdoptToken and redirects to the account page', async () => {
    searchParams = new URLSearchParams({token: GOOD_TOKEN});
    mockExchange('jwt-xyz');

    render(<TelegramAuthPage />);

    await waitFor(() => expect(whiteAdoptToken).toHaveBeenCalledWith('jwt-xyz'));
    expect(replace).toHaveBeenCalledWith('/ru/account');
  });
});

describe('TelegramAuthPage — exchange answers but the account never resolves', () => {
  it('stays on the error card and never redirects — a quiet false "ok" would look like a login that worked', async () => {
    searchParams = new URLSearchParams({token: GOOD_TOKEN});
    mockExchange('jwt-orphan');
    whiteAdoptToken.mockImplementation(async () => ({ok: false}));

    render(<TelegramAuthPage />);

    expect(await screen.findByText('title')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'cta'})).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
