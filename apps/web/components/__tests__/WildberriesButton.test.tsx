import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, it, expect, vi} from 'vitest';
import WildberriesButton from '../WildberriesButton';

function mockMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({matches: reducedMotion}),
  );
}

describe('WildberriesButton', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders an external link with its children', () => {
    render(<WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>);

    const link = screen.getByRole('link', {name: 'Buy on WB'});
    expect(link).toHaveAttribute('href', 'https://wb.example/item');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('runs the ripple animation only while hovered (WCAG 2.2.2)', async () => {
    const user = userEvent.setup();
    const {container} = render(
      <WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>,
    );
    const link = screen.getByRole('link');
    const fill = container.querySelector<HTMLElement>('.wb-fill');
    expect(fill).not.toBeNull();

    // At rest nothing animates — no perpetual compositor work from mount.
    expect(container.querySelector('.wb-wave-front')).toBeNull();
    expect(container.querySelector('.wb-wave-back')).toBeNull();
    expect(fill?.style.transform).toContain('translateY(101%)');

    await user.hover(link);
    expect(container.querySelector('.wb-wave-front')).not.toBeNull();
    expect(container.querySelector('.wb-wave-back')).not.toBeNull();
    expect(fill?.style.transform).toContain('translateY(0%)');

    // Pointer leave (fires for lifted touch pointers too — no tap latch)
    // releases the state, so the ripple cannot run indefinitely.
    await user.unhover(link);
    expect(container.querySelector('.wb-wave-front')).toBeNull();
    expect(container.querySelector('.wb-wave-back')).toBeNull();
    expect(fill?.style.transform).toContain('translateY(101%)');
  });

  it('floods on touch tap, then opens WB after the fast fill', () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    // Mirrors real window.open without 'noopener' in features: a Window
    // object whose opener the component must sever manually.
    const wbTab = {opener: window} as unknown as Window;
    const open = vi.spyOn(window, 'open').mockReturnValue(wbTab);
    const assign = vi.fn();
    vi.stubGlobal('location', {...window.location, assign});
    const {container} = render(
      <WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>,
    );
    const link = screen.getByRole('link');
    const fill = container.querySelector<HTMLElement>('.wb-fill');

    fireEvent.pointerDown(link, {pointerType: 'touch'});
    const notPrevented = fireEvent.click(link);

    // Navigation is deferred: the fast flood plays first.
    expect(notPrevented).toBe(false);
    expect(open).not.toHaveBeenCalled();
    expect(fill?.classList.contains('wb-fill-fast')).toBe(true);
    expect(fill?.style.transform).toContain('translateY(0%)');
    expect(container.querySelector('.wb-wave-front')).not.toBeNull();

    act(() => vi.advanceTimersByTime(400));
    expect(open).toHaveBeenCalledWith('https://wb.example/item', '_blank');
    expect(wbTab.opener).toBeNull();
    // Success path must NOT also navigate the current tab (double-nav guard).
    expect(assign).not.toHaveBeenCalled();
    // The fill releases so the resting state greets the user returning
    // from the WB tab (WCAG 2.2.2 — no perpetual ripple).
    expect(fill?.style.transform).toContain('translateY(101%)');
  });

  it('re-tap during the flood does not open WB twice', () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValue({} as unknown as Window);
    render(<WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>);
    const link = screen.getByRole('link');

    fireEvent.pointerDown(link, {pointerType: 'touch'});
    fireEvent.click(link);
    fireEvent.pointerDown(link, {pointerType: 'touch'});
    expect(fireEvent.click(link)).toBe(false);

    act(() => vi.advanceTimersByTime(400));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it('falls back to same-tab navigation when the popup is blocked', () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const assign = vi.fn();
    vi.stubGlobal('location', {...window.location, assign});
    render(<WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>);
    const link = screen.getByRole('link');

    fireEvent.pointerDown(link, {pointerType: 'touch'});
    fireEvent.click(link);
    act(() => vi.advanceTimersByTime(400));

    expect(open).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('https://wb.example/item');
  });

  it('does not delay navigation for reduced-motion users', () => {
    mockMatchMedia(true);
    const open = vi.spyOn(window, 'open');
    render(<WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>);
    const link = screen.getByRole('link');

    fireEvent.pointerDown(link, {pointerType: 'touch'});
    // Default (native) navigation proceeds untouched.
    expect(fireEvent.click(link)).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it('does not intercept mouse or keyboard activation', () => {
    mockMatchMedia(false);
    const open = vi.spyOn(window, 'open');
    render(<WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>);
    const link = screen.getByRole('link');

    fireEvent.pointerDown(link, {pointerType: 'mouse'});
    expect(fireEvent.click(link)).toBe(true);

    // Keyboard activation emits click without a preceding pointerdown type.
    expect(fireEvent.click(link)).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it('forgets an aborted touch (pointercancel) so keyboard stays native', () => {
    mockMatchMedia(false);
    const open = vi.spyOn(window, 'open');
    render(<WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>);
    const link = screen.getByRole('link');

    // Tap turns into a scroll — no click follows; a later keyboard
    // activation must not inherit the stale 'touch' pointer type.
    fireEvent.pointerDown(link, {pointerType: 'touch'});
    fireEvent.pointerCancel(link, {pointerType: 'touch'});
    expect(fireEvent.click(link)).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it('clears the pending flood timer on unmount', () => {
    vi.useFakeTimers();
    mockMatchMedia(false);
    const open = vi.spyOn(window, 'open');
    const {unmount} = render(
      <WildberriesButton href="https://wb.example/item">Buy on WB</WildberriesButton>,
    );
    const link = screen.getByRole('link');

    fireEvent.pointerDown(link, {pointerType: 'touch'});
    fireEvent.click(link);
    unmount();
    act(() => vi.advanceTimersByTime(400));
    expect(open).not.toHaveBeenCalled();
  });
});
