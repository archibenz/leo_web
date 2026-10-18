'use client';

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from 'react';
import { PageLoadingController } from './page-loading-controller';
import './page-loading.css';

const LoadingContext = createContext<PageLoadingController | null>(null);
const NavigationContext = createContext<((action: () => void, target: string | null) => void) | null>(null);
export const useLoadingController = () => useContext(LoadingContext);
export const useLoadingNavigation = () => useContext(NavigationContext);

export function browserRoute() {
  const search = new URLSearchParams(window.location.search).toString();
  return `${window.location.pathname}${search ? `?${search}` : ''}`;
}

export function navigationTarget(href: string) {
  const destination = new URL(href, window.location.href);
  if (destination.origin !== window.location.origin || !['http:', 'https:'].includes(destination.protocol)) return null;
  const search = destination.searchParams.toString();
  const route = `${destination.pathname}${search ? `?${search}` : ''}`;
  return route === browserRoute() ? null : route;
}

function LoadingIndicator({ controller }: { controller: PageLoadingController }) {
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => {
    if (snapshot.phase === 'idle') return;
    const timer = window.setTimeout(() => {
      if (snapshot.phase === 'loading') controller.abort(snapshot.id);
      else controller.reset(snapshot.id);
    }, snapshot.phase === 'loading' ? 45_000 : 250);
    return () => window.clearTimeout(timer);
  }, [controller, snapshot.id, snapshot.phase]);

  if (snapshot.phase === 'idle') return null;
  return <div key={snapshot.id} data-page-loading="" data-state={snapshot.phase} aria-hidden="true" className="page-loading"><span className="page-loading__line" /></div>;
}

export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [controller] = useState(() => new PageLoadingController());
  const [pending, startTransition] = useTransition();
  const operation = useRef<number | null>(null);
  const navigate = useCallback((action: () => void, target: string | null) => {
    const id = controller.begin(browserRoute(), target);
    operation.current = id;
    startTransition(() => {
      try { action(); }
      catch (error) { controller.abort(id); throw error; }
    });
  }, [controller]);
  useEffect(() => {
    if (!pending && operation.current !== null) controller.transitionSettled(operation.current);
  }, [controller, pending]);
  useEffect(() => {
    let lastRoute = browserRoute();
    const onPopState = () => {
      const target = browserRoute();
      if (lastRoute !== target) controller.begin(lastRoute, target);
      lastRoute = target;
    };
    const updateRoute = () => { lastRoute = browserRoute(); };
    const unsubscribe = controller.subscribe(updateRoute);
    window.addEventListener('popstate', onPopState);
    return () => { unsubscribe(); window.removeEventListener('popstate', onPopState); };
  }, [controller]);
  return <LoadingContext.Provider value={controller}><NavigationContext.Provider value={navigate}><LoadingIndicator controller={controller} />{children}</NavigationContext.Provider></LoadingContext.Provider>;
}

export function PageContentReady({ children }: { children?: ReactNode }) {
  const controller = useLoadingController();
  const operation = controller?.getSnapshot().id;
  useLayoutEffect(() => {
    if (controller && operation !== undefined) controller.commit(operation, browserRoute());
    // A URL-only update can still contain the old server children.
  }, [controller, children]); // eslint-disable-line react-hooks/exhaustive-deps
  return children;
}

export function usePageLoading(pending: boolean) {
  const controller = useLoadingController();
  useLayoutEffect(() => {
    if (pending && controller) return controller.block(browserRoute());
  });
}

export function PageLoadingError() {
  const controller = useLoadingController();
  useLayoutEffect(() => { if (controller) controller.abort(controller.getSnapshot().id); }, [controller]);
  return null;
}
