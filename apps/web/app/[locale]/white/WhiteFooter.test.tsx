import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import WhiteFooter from './WhiteFooter';

// The footer's locale switch reads the router — give jsdom a stub.
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/white',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('WhiteFooter newsletter double-submit guard', () => {
  it('fires only one POST when the form is submitted twice before the first resolves', () => {
    // A never-resolving fetch keeps the first submit in flight so the second
    // lands during the same in-flight window (the touch double-tap race).
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);

    render(<WhiteFooter locale="ru" />);

    const input = screen.getByLabelText('emailLabel') as HTMLInputElement;
    fireEvent.change(input, {target: {value: 'shopper@example.com'}});

    const form = input.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/newsletter/subscribe', expect.objectContaining({method: 'POST'}));
  });

  it('does not POST an invalid email', () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);

    render(<WhiteFooter locale="ru" />);
    const input = screen.getByLabelText('emailLabel') as HTMLInputElement;
    fireEvent.change(input, {target: {value: 'not-an-email'}});
    fireEvent.submit(input.closest('form')!);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
