'use client';

import {useEffect} from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {useAuth} from '../../contexts/AuthContext';
import BrandLoader from '../BrandLoader';
import {useTranslations} from 'next-intl';

export default function AdminGuard({children}: {children: React.ReactNode}) {
  const {isAuthenticated, isLoading, isAdmin} = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const t = useTranslations('admin');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/account`);
    }
  }, [isLoading, isAuthenticated, router, locale]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <BrandLoader size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-[15px]">{t('accessDenied')}</p>
        <button
          onClick={() => router.push(`/${locale}`)}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-[13px] transition-colors hover:bg-muted"
        >
          {t('backToSite')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
