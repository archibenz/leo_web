import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {render, screen, cleanup} from '@testing-library/react';
import type {ReactNode} from 'react';
import {setViewport} from '../../../editor/__tests__/viewport';
import {NavEditMode} from '../nav-edit-mode';

// Пункт «Режим правки» в боковой панели админки — второй выключатель рядом с
// тем, что на странице аккаунта. Правка витрины — только на компьютере
// (решение владельца 24.09, editor/useIsDesktop.ts), и прятать надо оба.

vi.mock('next-intl', () => ({useTranslations: () => (key: string) => key}));

const editMode = {isAdmin: true, on: true, toggle: vi.fn()};
vi.mock('@/components/editor/useEditMode', () => ({useEditMode: () => editMode}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenu: ({children}: {children: ReactNode}) => <ul>{children}</ul>,
  SidebarMenuItem: ({children}: {children: ReactNode}) => <li>{children}</li>,
}));
vi.mock('../app-shared', () => ({
  CustomMenuButton: ({children, ...rest}: {children: ReactNode}) => (
    <button type="button" {...rest}>
      {children}
    </button>
  ),
}));

beforeEach(() => {
  editMode.isAdmin = true;
  editMode.on = true;
});

afterEach(cleanup);

describe('пункт режима правки в панели админки', () => {
  it('390 px: пункта нет, даже когда режим уже включён', () => {
    setViewport(390);
    render(<NavEditMode />);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('1280 px: пункт на месте, как раньше', () => {
    setViewport(1280);
    render(<NavEditMode />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('1280 px, но не владелец — пункта нет', () => {
    setViewport(1280);
    editMode.isAdmin = false;
    render(<NavEditMode />);
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
