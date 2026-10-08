'use client';

import {useEffect, useRef} from 'react';
import {useRouter, usePathname} from 'next/navigation';
import {useAuth} from '../../contexts/AuthContext';
import BrandLoader from '../BrandLoader';
import {useTranslations} from 'next-intl';

export default function AdminGuard({children}: {children: React.ReactNode}) {
  const {isAuthenticated, isLoading, isAdmin, authError, retryAuth, logoutError, isLoggingOut, logout} = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';
  const t = useTranslations('admin');
  const auth = useTranslations('auth');
  const logoutRetryRequested = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !authError && !logoutError && !isLoggingOut && !logoutRetryRequested.current) {
      router.push(`/${locale}/account`);
    }
  }, [isLoading, isAuthenticated, authError, logoutError, isLoggingOut, router, locale]);

  if (isLoading || isLoggingOut) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <BrandLoader size={32} />
      </div>
    );
  }

  if (authError || logoutError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p role="alert" className="text-muted-foreground text-[15px]">
          {auth(logoutError ? 'errors.logoutFailed' : 'errors.verificationUnavailable')}
        </p>
        <button
          type="button"
          onClick={() => {
            if (logoutError) {
              logoutRetryRequested.current = true;
              void logout().then(({success}) => {
                // Leave the document so the White account's module cache is reset.
                if (success) window.location.href = `/${locale}/account`;
                else logoutRetryRequested.current = false;
              });
            } else void retryAuth();
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-[13px] transition-colors hover:bg-muted"
        >
          {auth(logoutError ? 'retryLogout' : 'retryVerification')}
        </button>
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
