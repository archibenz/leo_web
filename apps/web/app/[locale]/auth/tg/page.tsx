'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {useLocale} from 'next-intl';
import {apiFetch} from '../../../../lib/api';
import {useAuth} from '../../../../contexts';

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
  const {loginWithToken} = useAuth();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      return;
    }

    apiFetch<ExchangeResponse>(`/api/auth/telegram/exchange?token=${encodeURIComponent(token)}`)
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
          <p className="font-display text-xl text-ink mb-4">Ссылка устарела</p>
          <p className="text-sm text-ink-soft mb-6">
            Эта ссылка для входа уже не действует. Вернитесь на страницу входа и попробуйте снова.
          </p>
          <button
            onClick={() => router.push(`/${locale}/account`)}
            className="lux-btn-primary w-full"
          >
            Вернуться
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-28 pb-6 flex items-center justify-center px-6">
      <div className="paper-card p-10 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="mt-4 text-ink-soft">Выполняем вход...</p>
      </div>
    </div>
  );
}

export default function TelegramAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen pt-28 pb-6 flex items-center justify-center px-6">
          <div className="paper-card p-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        </div>
      }
    >
      <TelegramAuthContent />
    </Suspense>
  );
}
