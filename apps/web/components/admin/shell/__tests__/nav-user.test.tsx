import {act, cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {ReactNode} from 'react';
import {NavUser} from '../nav-user';

const mocks = vi.hoisted(() => ({logout: vi.fn()}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({user: {name: 'Admin fixture', email: 'admin@example.test'}, logout: mocks.logout}),
}));
vi.mock('next-intl', () => ({useTranslations: () => (key: string) => key}));
vi.mock('next/link', () => ({default: ({children, href}: {children: ReactNode; href: string}) => <a href={href}>{children}</a>}));
vi.mock('@/components/ui/dropdown-menu', () => {
  const Box = ({children}: {children: ReactNode}) => <div>{children}</div>;
  return {
    DropdownMenu: Box, DropdownMenuContent: Box, DropdownMenuGroup: Box,
    DropdownMenuSeparator: () => <hr />, DropdownMenuTrigger: Box,
    DropdownMenuItem: ({children, onSelect}: {children: ReactNode; onSelect?: () => void}) => (
      onSelect ? <button onClick={onSelect}>{children}</button> : <div>{children}</div>
    ),
  };
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); mocks.logout.mockReset(); });

describe('admin exit navigation waits for server confirmation', () => {
  it('keeps the current page while logout is pending and after a refused exit', async () => {
    let finish!: (result: {success: boolean}) => void;
    mocks.logout.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<NavUser locale="ru" />);
    const location = {href: '/ru/admin'};
    vi.stubGlobal('window', {location});
    fireEvent.click(screen.getByRole('button', {name: 'signOut'}));
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(location.href).toBe('/ru/admin');
    await act(async () => { finish({success: false}); });
    expect(location.href).toBe('/ru/admin');
  });

  it('uses a full navigation only after cookie clearing succeeds', async () => {
    mocks.logout.mockResolvedValue({success: true});
    render(<NavUser locale="en" />);
    const location = {href: '/en/admin'};
    vi.stubGlobal('window', {location});
    await act(async () => { fireEvent.click(screen.getByRole('button', {name: 'signOut'})); });
    expect(location.href).toBe('/en');
  });
});
