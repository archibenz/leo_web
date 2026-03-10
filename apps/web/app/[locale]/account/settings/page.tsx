'use client';

import {useEffect} from 'react';
import {useTranslations, useLocale} from 'next-intl';
import {useRouter} from 'next/navigation';
import {useAuth} from '../../../../contexts';
import HeroShaderBackgroundClient from '../../../../components/HeroShaderBackgroundClient';
import Link from 'next/link';

export default function SettingsPage() {
  const t = useTranslations('account');
  const locale = useLocale();
  const router = useRouter();
  const {isAuthenticated, isLoading, logout} = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/${locale}/account`);
    }
  }, [isAuthenticated, isLoading, locale, router]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen pt-28 pb-6">
        <HeroShaderBackgroundClient />
        <div className="relative z-10 flex min-h-[60vh] items-center justify-center px-6 lg:px-8">
          <div className="paper-card p-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-ink-soft">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="relative min-h-screen pt-28 pb-6">
      <HeroShaderBackgroundClient />
      <div className="relative z-10 flex min-h-[60vh] items-center justify-center px-6 lg:px-8">
        <div className="w-full max-w-lg space-y-6">
          <div className="text-center">
            <h1 className="font-display text-ink text-[clamp(1.5rem,3.5vw,2.25rem)]">
              {t('settings.title')}
            </h1>
          </div>

          <div className="paper-card p-6 space-y-4">
            <button
              onClick={logout}
              className="w-full rounded-full border border-ink/20 bg-transparent px-6 py-3.5 text-sm font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-ink/5 hover:border-ink/40"
            >
              {t('settings.signOut')}
            </button>
          </div>

          <div className="text-center">
            <Link
              href={`/${locale}/account`}
              className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              {t('settings.backToProfile')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
