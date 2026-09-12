import {afterEach, describe, it, expect, vi} from 'vitest';
import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import WhiteFooter from './WhiteFooter';

// The footer's locale switch reads the router — give jsdom a stub.
vi.mock('next/navigation', () => ({
  usePathname: () => '/en',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-intl', () => ({
  // The consent line renders via t.rich — the mock needs it alongside plain t().
  useTranslations: () => Object.assign((key: string) => key, {
    rich: (key: string) => key,
  }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// What the footer owes the storefront no matter how it is laid out. The Efferd
// block it is drawn from carries none of this — it has no form, its links go to
// "#" and its copy is baked into the file — so these are the lines that decide
// whether a redesign stayed a redesign.
describe('WhiteFooter contract', () => {
  it('subscribes through /newsletter from a real email field', () => {
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetchMock);

    render(<WhiteFooter locale="ru" />);
    const input = screen.getByLabelText('emailLabel') as HTMLInputElement;

    expect(input).toHaveAttribute('type', 'email');
    fireEvent.change(input, {target: {value: 'shopper@example.com'}});
    fireEvent.submit(input.closest('form')!);
    expect(fetchMock).toHaveBeenCalledWith('/newsletter', expect.objectContaining({method: 'POST'}));
  });

  it('points the three legal links at their exact addresses', () => {
    render(<WhiteFooter locale="ru" />);

    expect(screen.getByRole('link', {name: 'privacy'})).toHaveAttribute('href', '/ru/privacy');
    expect(screen.getByRole('link', {name: 'offer'})).toHaveAttribute('href', '/ru/offer');
    expect(screen.getByRole('link', {name: 'terms'})).toHaveAttribute('href', '/ru/terms');
  });

  it('reads its copy from the dictionaries, not from the markup', () => {
    render(<WhiteFooter locale="ru" />);

    // The mocked t() echoes the key, so a hardcoded caption would read as itself.
    for (const key of ['tagline', 'shop', 'brand', 'service', 'newsletter']) {
      expect(screen.getByText(key)).toBeInTheDocument();
    }
    // Seller identity comes from the shared `footer` dictionary.
    expect(screen.getByText('legalEntity')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`© ${new Date().getFullYear()} REINASLEO`))).toBeInTheDocument();
  });

  it('sends the two brand channels where the structured data says they are', () => {
    render(<WhiteFooter locale="ru" />);

    const instagram = screen.getByRole('link', {name: 'Instagram'});
    const telegram = screen.getByRole('link', {name: 'Telegram'});

    // Same addresses as the Organization sameAs in layout.tsx — engines compare them.
    expect(instagram).toHaveAttribute('href', 'https://instagram.com/reinasleo');
    expect(telegram).toHaveAttribute('href', 'https://t.me/reinasleo');
    expect(instagram).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(telegram).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
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
    expect(fetchMock).toHaveBeenCalledWith('/newsletter', expect.objectContaining({method: 'POST'}));
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
