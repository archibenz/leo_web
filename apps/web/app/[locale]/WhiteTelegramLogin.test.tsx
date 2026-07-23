import {render, screen, act, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import WhiteTelegramLogin from './WhiteTelegramLogin';

vi.mock('next-intl', () => ({
  useTranslations: () => Object.assign((key: string) => key, {rich: (key: string) => key}),
}));

const lsStore = new Map<string, string>();
const mockLocalStorage = {
  clear: () => lsStore.clear(),
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => void lsStore.set(k, String(v)),
  removeItem: (k: string) => void lsStore.delete(k),
  key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
  get length() {
    return lsStore.size;
  },
};
Object.defineProperty(window, 'localStorage', {value: mockLocalStorage, configurable: true, writable: true});

function mockFetchRoutes(pollResponses: Array<{status: string; token?: string}>) {
  let pollCall = 0;
  global.fetch = vi.fn(async (url: RequestInfo | URL) => {
    const u = String(url);
    const ok = (body: unknown) => ({ok: true, status: 200, json: async () => body}) as unknown as Response;
    if (u.includes('/api/auth/telegram/init')) return ok({token: 'init123', deepLink: 'https://t.me/reinasleo_bot?start=auth_init123'});
    if (u.includes('/api/auth/telegram/poll')) {
      const r = pollResponses[Math.min(pollCall++, pollResponses.length - 1)];
      return ok(r);
    }
    if (u.includes('/api/auth/me')) return ok({id: 7, email: 'tg@test.dev', name: 'Tg'});
    return {ok: false, status: 404, json: async () => ({})} as unknown as Response;
  }) as unknown as typeof fetch;
}

describe('WhiteTelegramLogin', () => {
  beforeEach(() => {
    lsStore.clear();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('opens the bot deep link and stores the init token', async () => {
    mockFetchRoutes([{status: 'pending'}]);
    const user = userEvent.setup();
    render(<WhiteTelegramLogin />);
    await user.click(screen.getByRole('button', {name: /tgSignIn/}));
    expect(window.open).toHaveBeenCalledWith('https://t.me/reinasleo_bot?start=auth_init123', '_blank', 'noopener');
    expect(lsStore.get('tg_init_token')).toBe('init123');
    expect(screen.getByRole('button', {name: /tgWaiting/})).toBeDisabled();
  });

  it('resumes polling from a saved init token on mount', async () => {
    lsStore.set('tg_init_token', 'saved456');
    mockFetchRoutes([{status: 'ready', token: 'jwt-resume'}]);
    render(<WhiteTelegramLogin />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(lsStore.get('reinasleo_token')).toBe('jwt-resume');
    expect(lsStore.has('tg_init_token')).toBe(false);
  });
});
