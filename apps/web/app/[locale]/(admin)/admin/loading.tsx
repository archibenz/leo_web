'use client';

import {usePathname} from 'next/navigation';
import {PageLoadingFallback, getPageSkeletonKind} from '@/components/loading/PageSkeleton';

export default function Loading() {
  const pathname = usePathname();
  return <PageLoadingFallback kind={getPageSkeletonKind(pathname ?? '/admin')} />;
}
