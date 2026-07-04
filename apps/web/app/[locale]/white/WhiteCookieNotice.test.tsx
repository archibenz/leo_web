import {afterEach, describe, it, expect} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiteCookieNotice from './WhiteCookieNotice';
import {NextIntlClientProvider} from 'next-intl';
import enMessages from '../../../messages/en.json';

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

const renderNotice = () =>
  render(
    <NextIntlClientProvider locale="en" messages={enMessages as never}>
      <WhiteCookieNotice locale="en" />
    </NextIntlClientProvider>,
  );

describe('WhiteCookieNotice', () => {
  it('shows once and remembers the acknowledgement', async () => {
    const user = userEvent.setup();
    renderNotice();
    const ok = await screen.findByRole('button', {name: /okay/i});
    await user.click(ok);
    expect(screen.queryByRole('button', {name: /okay/i})).not.toBeInTheDocument();
    expect(localStorage.getItem('wv-cookie-ok')).toBe('1');
  });

  it('stays hidden when already acknowledged', () => {
    localStorage.setItem('wv-cookie-ok', '1');
    renderNotice();
    expect(screen.queryByRole('button', {name: /okay/i})).not.toBeInTheDocument();
  });
});
