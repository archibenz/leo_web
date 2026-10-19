'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { browserRoute, navigationTarget, useLoadingNavigation } from './PageLoadingProvider';

export function useLoadingRouter() {
  const router = useRouter();
  const run = useLoadingNavigation();

  return useMemo(() => {
    const navigate = (action: () => void, target: string | null, track: boolean) => {
      if (track && run) run(action, target);
      else action();
    };
    return {
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        const target = navigationTarget(args[0]);
        navigate(() => router.push(...args), target, target !== null);
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        const target = navigationTarget(args[0]);
        navigate(() => router.replace(...args), target, target !== null);
      },
      back: () => navigate(() => router.back(), null, true),
      forward: () => navigate(() => router.forward(), null, true),
      refresh: () => navigate(() => router.refresh(), browserRoute(), true),
    };
  }, [router, run]);
}
