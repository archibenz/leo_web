'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {apiFetch} from '../../../../lib/api';
import {useAuth} from '../../../../contexts';
import LoaderSplash from '../../../../components/LoaderSplash';

type ExchangeResponse = {
  token: string;
  id: string;
  email: string | null;
  name: string;
  surname?: string;
};

function TelegramAuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth.tg.expired');
  const {loginWithToken} = useAuth();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    // Reject malformed tokens client-side: backend issues 32-char hex (UUID
    // without dashes). A crafted URL with arbitrary characters should not
    // reach the exchange endpoint or land in headers.
    if (!token || !/^[A-Za-z0-9_-]{20,128}$/.test(token)) {
      setStatus('error');
      return;
    }

    apiFetch<ExchangeResponse>(`/api/auth/telegram/exchange`, {
      headers: {Authorization: `Bearer ${token}`},
    })
      .then(async data => {
        await loginWithToken(data.token);
        router.replace(`/${locale}/account`);
      })
      .catch(() => {
        setStatus('error');
      });
  }, [searchParams, router, locale, loginWithToken]);

  if (status === 'error') {
    return (
      <div className="relative min-h-screen pt-28 pb-6 flex items-center justify-center px-6">
        <div className="paper-card p-10 text-center max-w-md w-full">
          <p className="font-display text-xl text-ink mb-4">{t('title')}</p>
          <p className="text-sm text-ink-soft mb-6">{t('description')}</p>
          <button
            onClick={() => router.push(`/${locale}/account`)}
            className="lux-btn-primary w-full"
          >
            {t('cta')}
          </button>
        </div>
      </div>
    );
  }

  return <LoaderSplash />;
}

export default function TelegramAuthPage() {
  return (
    <Suspense fallback={<LoaderSplash />}>
      <TelegramAuthContent />
    </Suspense>
  );
}
