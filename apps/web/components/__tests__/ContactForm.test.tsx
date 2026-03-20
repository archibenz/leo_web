import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ContactForm from '../ContactForm';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('namePlaceholder'), 'John');
  await user.type(screen.getByPlaceholderText('emailPlaceholder'), 'john@test.com');
  await user.type(screen.getByPlaceholderText('messagePlaceholder'), 'Hello');
  await user.click(screen.getByRole('checkbox'));
}

describe('ContactForm', () => {
  it('renders all form fields', () => {
    render(<ContactForm />);

    expect(screen.getByPlaceholderText('namePlaceholder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('emailPlaceholder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('messagePlaceholder')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument();
  });

  it('disables submit button while submitting', async () => {
    let resolveResponse!: (value: Response) => void;
    mockFetch.mockReturnValue(new Promise((resolve) => { resolveResponse = resolve; }));

    const user = userEvent.setup();
    render(<ContactForm />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'submit' }));

    expect(screen.getByRole('button')).toBeDisabled();

    resolveResponse(new Response(JSON.stringify({}), { status: 200 }));
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
  });

  it('shows success message after successful submit', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));

    const user = userEvent.setup();
    render(<ContactForm />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByText('success')).toBeInTheDocument();
    });
  });

  it('shows error message on failed submit', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Server error' }), { status: 500 })
    );

    const user = userEvent.setup();
    render(<ContactForm />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'submit' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Server error');
    });
  });
});
