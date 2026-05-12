'use client';

import {useEffect} from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {useAuth} from '../../contexts/AuthContext';
import BrandLoader from '../BrandLoader';
import {useTranslations} from 'next-intl';

export default function AdminGuard({children}: {children: React.ReactNode}) {
  const {user, isAuthenticated, isLoading, isAdmin} = useAuth();
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
        <p className="text-lg text-[var(--ink-soft)]">{t('accessDenied')}</p>
        <button
          onClick={() => router.push(`/${locale}`)}
          className="lux-btn-secondary"
        >
          {t('backToSite')}
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
