import {expect, it, vi} from 'vitest';
import AdminEntryPage from '../page';

const {redirect} = vi.hoisted(() => ({redirect: vi.fn()}));
vi.mock('next/navigation', () => ({redirect}));

it('sends the legacy admin entry to the shared Analytics app without a locale prefix', () => {
  const signal = new Error('NEXT_REDIRECT');
  redirect.mockImplementation(() => {throw signal;});
  expect(() => AdminEntryPage()).toThrow(signal);
  expect(redirect).toHaveBeenCalledExactlyOnceWith('/analytics');
});
