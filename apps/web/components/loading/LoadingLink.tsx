'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef, useCallback, useRef, type ComponentProps } from 'react';
import { navigationTarget, useLoadingNavigation } from './PageLoadingProvider';

const TrackedLoadingLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function TrackedLoadingLink(
  { children, onNavigate, ...props }, forwardedRef,
) {
  const navigate = useLoadingNavigation();
  const router = useRouter();
  const anchor = useRef<HTMLAnchorElement | null>(null);
  const ref = useCallback((element: HTMLAnchorElement | null) => {
    anchor.current = element;
    if (typeof forwardedRef === 'function') return forwardedRef(element);
    if (forwardedRef) forwardedRef.current = element;
  }, [forwardedRef]);
  return <Link {...props} ref={ref} onNavigate={(event) => {
    let canceled = false;
    onNavigate?.({ preventDefault() { canceled = true; event.preventDefault(); } });
    if (canceled || !navigate || !anchor.current) return;
    const href = anchor.current.href;
    const target = navigationTarget(href);
    if (!target) return;
    event.preventDefault();
    navigate(() => router[props.replace ? 'replace' : 'push'](href, { scroll: props.scroll }), target);
  }}>{children}</Link>;
});

const LoadingLink = forwardRef<HTMLAnchorElement, ComponentProps<typeof Link>>(function LoadingLink(props, ref) {
  const navigate = useLoadingNavigation();
  return navigate ? <TrackedLoadingLink {...props} ref={ref} /> : <Link {...props} ref={ref} />;
});

export default LoadingLink;
