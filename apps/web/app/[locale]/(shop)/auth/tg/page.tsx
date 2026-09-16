'use client';

import {Suspense, useEffect, useState} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {apiFetch} from '../../../../../lib/api';
import {whiteAdoptToken} from '../../../../../hooks/useWhiteAuth';
import {Button} from '../../../../../components/ui/button';
import {INK, MUTED, HAIR} from '../../../wv-palette';

type ExchangeResponse = {
  token: string;
  id: string;
  email: string | null;
  name: string;
  surname?: string;
};

// The moment between "bot handed us a token" and "exchange answered" — a plain
// ring in the vitrine's own ink reads as "working".
//
// Раньше здесь стояла оговорка «золотая вспышка принадлежит LoaderSplash, он
// остаётся градиентному админу». С 17.09 это неправда дважды: свечения у
// LoaderSplash нет вовсе, и админ давно не градиентный. Запись поправлена, а
// не удалена: следующий увидит, что выбор кольца — не про отсутствие вспышки,
// а про то, что на этих маршрутах свой загрузчик не нужен. animate-spin bows out under prefers-reduced-motion,
// same as every other spinner on the White routes. #wv-main is the skip-link
// target WhiteHeader always points at (WhiteHeader.tsx).
function TgWaitingSign() {
  const t = useTranslations('common');
  return (
    <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <span
        role="status"
        aria-label={t('loading')}
        className="h-9 w-9 animate-spin rounded-full border-2 motion-reduce:animate-none"
        style={{borderColor: HAIR, borderTopColor: INK}}
      />
    </main>
  );
}

function TelegramAuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth.tg.expired');
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
        // Same adoption WhiteTelegramLogin's poll loop uses: sets the token
        // and resolves /api/auth/me itself, no AuthProvider required. A false
        // `ok` means the exchange answered but the account didn't come back —
        // landing on /account signed-out would look like a login that
        // worked when it didn't, so that counts as failure too.
        const {ok} = await whiteAdoptToken(data.token);
        if (!ok) {
          setStatus('error');
          return;
        }
        router.replace(`/${locale}/account`);
      })
      .catch(() => {
        setStatus('error');
      });
  }, [searchParams, router, locale]);

  if (status === 'error') {
    return (
      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
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
      </main>
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
