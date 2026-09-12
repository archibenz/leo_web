'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {apiFetch} from '../../../../lib/api';
import {useAuth} from '../../../../contexts';
import {Button} from '../../../../components/ui/button';
import {INK, MUTED, HAIR} from '../../wv-palette';

type ExchangeResponse = {
  token: string;
  id: string;
  email: string | null;
  name: string;
  surname?: string;
};

// The moment between "bot handed us a token" and "exchange answered" — the
// White DNA has no golden-glow splash of its own (that belongs to LoaderSplash,
// which stays put for the gradient admin, see components/LoaderSplash.tsx).
// A plain ring in the vitrine's own ink reads as "working" without borrowing
// the old brand's loader. animate-spin bows out under prefers-reduced-motion,
// same as every other spinner on the White routes.
function TgWaitingSign() {
  const t = useTranslations('common');
  return (
    <div className="relative min-h-screen bg-white pt-28 pb-6 flex items-center justify-center px-6">
      <span
        role="status"
        aria-label={t('loading')}
        className="h-9 w-9 animate-spin rounded-full border-2 motion-reduce:animate-none"
        style={{borderColor: HAIR, borderTopColor: INK}}
      />
    </div>
  );
}

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
      <div className="relative min-h-screen bg-white pt-28 pb-6 flex items-center justify-center px-6">
        <div className="w-full max-w-md border p-10 text-center" style={{borderColor: HAIR}}>
          <p className="font-display text-xl" style={{color: INK}}>{t('title')}</p>
          <p className="mt-4 text-sm leading-relaxed" style={{color: MUTED}}>{t('description')}</p>
          <Button
            type="button"
            onClick={() => router.push(`/${locale}/account`)}
            variant="white"
            size="white"
            className="mt-7 w-full"
          >
            {t('cta')}
          </Button>
        </div>
      </div>
    );
  }

  return <TgWaitingSign />;
}

export default function TelegramAuthPage() {
  return (
    <Suspense fallback={<TgWaitingSign />}>
      <TelegramAuthContent />
    </Suspense>
  );
}
