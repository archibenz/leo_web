import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PageContentReady, PageLoadingError, PageLoadingProvider, usePageLoading } from '../PageLoadingProvider';
import { useLoadingRouter } from '../useLoadingRouter';

const navigation = vi.hoisted(() => ({
  pathname: '/ru', search: '',
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => navigation.router,
}));

function Pending({ pending }: { pending: boolean }) { usePageLoading(pending); return <div>Content</div>; }
function Controls() {
  const router = useLoadingRouter();
  return <><button onClick={() => router.push('/ru/account')}>Navigate</button><button onClick={() => router.refresh()}>Refresh</button></>;
}
function View({ pending = false, version = 0, ready = true, error = false }) {
  return <PageLoadingProvider><Controls />{error ? <><PageLoadingError /><div>Could not load</div></> : ready ? <PageContentReady><Pending key={version} pending={pending} /></PageContentReady> : null}</PageLoadingProvider>;
}
const bar = () => document.querySelector('[data-page-loading]');
async function flush() { await act(async () => { await Promise.resolve(); }); }

beforeEach(() => { navigation.pathname = '/ru'; navigation.search = ''; vi.clearAllMocks(); window.history.replaceState({}, '', '/ru'); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('PageLoadingProvider', () => {
  it('preserves router argument arity and optional navigation settings', () => {
    const { result } = renderHook(() => useLoadingRouter());
    result.current.push('/ru/account');
    expect(navigation.router.push).toHaveBeenLastCalledWith('/ru/account');
    result.current.replace('/ru/account');
    expect(navigation.router.replace).toHaveBeenLastCalledWith('/ru/account');
    result.current.push('/ru/account', { scroll: false });
    expect(navigation.router.push).toHaveBeenLastCalledWith('/ru/account', { scroll: false });
    result.current.replace('/ru/account', { scroll: true });
    expect(navigation.router.replace).toHaveBeenLastCalledWith('/ru/account', { scroll: true });
    expect(result.current.prefetch).toBe(navigation.router.prefetch);
  });

  it('waits for committed content after navigation and for destination data', async () => {
    const view = render(<View />);
    fireEvent.click(screen.getByText('Navigate'));
    expect(bar()).toHaveAttribute('data-state', 'loading');
    navigation.pathname = '/ru/account';
    window.history.replaceState({}, '', '/ru/account');
    view.rerender(<View ready={false} />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'loading');
    view.rerender(<View pending />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'loading');
    view.rerender(<View pending={false} />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'complete');
  });

  it('tracks same-page fetching without requiring a provider at every call site', async () => {
    const view = render(<View pending />);
    expect(bar()).toHaveAttribute('data-state', 'loading');
    view.rerender(<View pending={false} />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'complete');
    cleanup();
    expect(() => render(<Pending pending />)).not.toThrow();
  });

  it('finishes a redirect even when the initiating component unmounts', async () => {
    function RedirectView() {
      const [destination, setDestination] = React.useState(false);
      navigation.router.push.mockImplementation(() => {
        navigation.pathname = '/ru/login';
        window.history.replaceState({}, '', '/ru/login');
        setDestination(true);
      });
      return <PageLoadingProvider>{!destination && <Controls />}<PageContentReady><div>{destination ? 'Login' : 'Home'}</div></PageContentReady></PageLoadingProvider>;
    }
    render(<RedirectView />);
    fireEvent.click(screen.getByText('Navigate'));
    await flush();
    expect(screen.getByText('Login')).toBeVisible();
    expect(bar()).toHaveAttribute('data-state', 'complete');
    navigation.router.push.mockReset();
  });

  it('does not count provider state rerenders as refreshed content', async () => {
    const view = render(<View />);
    fireEvent.click(screen.getByText('Refresh'));
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'loading');
    view.rerender(<View version={1} />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'complete');
  });

  it('handles query-only browser history transitions', async () => {
    const view = render(<View />);
    window.history.pushState({}, '', '/ru?page=2');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(bar()).toHaveAttribute('data-state', 'loading');
    navigation.search = 'page=2';
    view.rerender(<View version={2} />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'complete');
  });

  it('query URL updates do not mark unchanged server children ready', async () => {
    const staleContent = <div>Page one</div>;
    const view = render(<PageLoadingProvider><PageContentReady>{staleContent}</PageContentReady></PageLoadingProvider>);
    window.history.pushState({}, '', '/ru?page=2');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    navigation.search = 'page=2';
    view.rerender(<PageLoadingProvider><PageContentReady>{staleContent}</PageContentReady></PageLoadingProvider>);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'loading');
    view.rerender(<PageLoadingProvider><PageContentReady><div>Page two</div></PageContentReady></PageLoadingProvider>);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'complete');
  });

  it('does not start for hash-only browser history changes', () => {
    render(<View />);
    window.history.pushState({}, '', '/ru#details');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    expect(bar()).toBeNull();
  });

  it('a stalled transition expires without falsely filling to 100%', async () => {
    vi.useFakeTimers();
    render(<View />);
    fireEvent.click(screen.getByText('Navigate'));
    await act(async () => { vi.advanceTimersByTime(45_000); });
    expect(bar()).toHaveAttribute('data-state', 'aborted');
    expect(bar()).not.toHaveAttribute('data-state', 'complete');
    await act(async () => { vi.advanceTimersByTime(300); });
    expect(bar()).toBeNull();
  });

  it('explicit route error aborts without reporting successful completion', async () => {
    const view = render(<View />);
    fireEvent.click(screen.getByText('Navigate'));
    view.rerender(<View error />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'aborted');
    expect(screen.getByText('Could not load')).toBeVisible();
  });

  it('unmounting old-route data does not complete a newer destination', async () => {
    const view = render(<View pending />);
    fireEvent.click(screen.getByText('Navigate'));
    view.rerender(<View ready={false} />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'loading');
    window.history.replaceState({}, '', '/ru/account');
    navigation.pathname = '/ru/account';
    view.rerender(<View pending />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'loading');
    view.rerender(<View pending={false} />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'complete');
  });

  it('unmounting a pending lease on error cannot resurrect a completed bar', async () => {
    const view = render(<View pending />);
    view.rerender(<View error />);
    await flush();
    expect(bar()).toHaveAttribute('data-state', 'aborted');
  });
});
