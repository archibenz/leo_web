import React, { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoadingLink from '../LoadingLink';
import { PageLoadingProvider } from '../PageLoadingProvider';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

vi.mock('next/link', async () => {
  const React = await import('react');
  // The adapter receives Next's accepted-navigation event, not a raw browser click.
  return { useLinkStatus: () => ({ pending: false }), default: React.forwardRef<HTMLAnchorElement, Record<string, any>>(
    function Link({ onNavigate, onClick, children, href, ...props }, ref) {
      return <a {...props} ref={ref} href={typeof href === 'string' ? href : href.pathname} onClick={(event) => {
        onClick?.(event);
        const canceled = event.defaultPrevented;
        event.preventDefault();
        if (!canceled && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !event.currentTarget.hasAttribute('download') && (!props.target || props.target === '_self')) {
          onNavigate?.({ preventDefault() {} });
        }
      }}>{children}</a>;
    },
  ) };
});

const bar = () => document.querySelector('[data-page-loading]');
beforeEach(() => window.history.replaceState({}, '', '/ru'));
afterEach(cleanup);

describe('LoadingLink', () => {
  it('preserves ref, href, onClick and onNavigate and starts an accepted internal transition', async () => {
    const ref = createRef<HTMLAnchorElement>();
    const click = vi.fn();
    const navigate = vi.fn();
    render(<PageLoadingProvider><LoadingLink href="/ru/account" ref={ref} onClick={click} onNavigate={navigate}>Account</LoadingLink></PageLoadingProvider>);
    expect(ref.current).toBe(screen.getByRole('link'));
    expect(ref.current).toHaveAttribute('href', '/ru/account');
    fireEvent.click(ref.current!);
    expect(click).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledOnce();
    expect(bar()).toHaveAttribute('data-state', 'loading');
    await act(async () => { await Promise.resolve(); });
    expect(bar()).toHaveAttribute('data-state', 'loading');
  });

  it('honors onNavigate cancellation without starting progress', () => {
    render(<PageLoadingProvider><LoadingLink href="/ru/account" onNavigate={(event) => event.preventDefault()}>Account</LoadingLink></PageLoadingProvider>);
    fireEvent.click(screen.getByRole('link'));
    expect(bar()).toBeNull();
  });

  it.each(['/ru#details', '/ru', 'https://example.com/account', 'mailto:owner@example.com'])('does not track non-page href %s', (href) => {
    render(<PageLoadingProvider><LoadingLink href={href}>Destination</LoadingLink></PageLoadingProvider>);
    fireEvent.click(screen.getByRole('link'));
    expect(bar()).toBeNull();
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }])('does not turn modified clicks into navigations %j', (modifiers) => {
    render(<PageLoadingProvider><LoadingLink href="/ru/account">Account</LoadingLink></PageLoadingProvider>);
    fireEvent.click(screen.getByRole('link'), modifiers);
    expect(bar()).toBeNull();
  });

  it('preserves caller click cancellation and download behavior', () => {
    const view = render(<PageLoadingProvider><LoadingLink href="/ru/account" onClick={(event) => event.preventDefault()}>Account</LoadingLink></PageLoadingProvider>);
    fireEvent.click(screen.getByRole('link'));
    expect(bar()).toBeNull();
    view.rerender(<PageLoadingProvider><LoadingLink href="/ru/file" download>Download</LoadingLink></PageLoadingProvider>);
    fireEvent.click(screen.getByRole('link'));
    expect(screen.getByRole('link')).toHaveAttribute('download');
    expect(bar()).toBeNull();
  });
});
