'use client';

import {Suspense, useEffect, useRef, useState} from 'react';
import {useSearchParams, useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {apiFetch} from '../../../../../lib/api';
import {authRetryDelay} from '../../../../../lib/authSession';
import {useWhiteAuth, whiteAdoptToken, whiteRetryAuth} from '../../../../../hooks/useWhiteAuth';
import {Button} from '../../../../../components/ui/button';
import {INK, MUTED, HAIR} from '../../../wv-palette';

type ExchangeResponse = {
  token: string;
  id: string;
  email: string | null;
  name: string;
  surname?: string;
};

type ExchangeResult = {status: 'exchanged'; userId: string} | {status: 'expired'} | {status: 'unavailable'; retryAt?: number};
type CallbackAttempt = {token: string; retryCount: number; outcome: ExchangeResult | null; result: Promise<ExchangeResult>};
const MAX_EXCHANGE_RETRIES = 1;

// Keep only the latest attempt in memory: remounts must not consume its link twice.
// Completed results contain no JWT, so reopening after logout cannot adopt it again.
let callbackAttempt: CallbackAttempt | null = null;
let callbackOwner: symbol | null = null;

function exchangeOnce(token: string, requestedRetry: number): CallbackAttempt {
  const previous = callbackAttempt?.token === token ? callbackAttempt : null;
  if (previous && (requestedRetry <= previous.retryCount || previous.retryCount >= MAX_EXCHANGE_RETRIES
    || previous.outcome?.status !== 'unavailable' || previous.outcome.retryAt === undefined
    || previous.outcome.retryAt > Date.now())) return previous;
  const attempt: CallbackAttempt = {
    token,
    retryCount: previous ? previous.retryCount + 1 : 0,
    outcome: null,
    result: apiFetch<ExchangeResponse>('/api/auth/telegram/exchange', {
      headers: {Authorization: 'Bearer ' + token},
      cache: 'no-store',
      skipAuthHandler: true,
    }).then(async (data): Promise<ExchangeResult> => {
      if (callbackAttempt === attempt && callbackOwner !== null) {
        // A temporary /me failure preserves the session; its store owns retries.
        await whiteAdoptToken(data.token).catch(() => {});
      }
      return {status: 'exchanged', userId: String(data.id)};
    }).catch((error: unknown): ExchangeResult => {
      const status = (error as {status?: number} | null)?.status;
      if (status === 400 || status === 404 || status === 410) return {status: 'expired'};
      const retryable = status === 429 || status === 502 || error instanceof TypeError;
      const delay = authRetryDelay(error, attempt.retryCount);
      return {
        status: 'unavailable',
        retryAt: retryable && attempt.retryCount < MAX_EXCHANGE_RETRIES && Number.isFinite(delay)
          ? Date.now() + delay : undefined,
      };
    }).then(result => {
      attempt.outcome = result;
      return result;
    }),
  };
  callbackAttempt = attempt;
  return attempt;
}

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
  const token = useSearchParams().get('token');
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth.tg');
  const auth = useWhiteAuth();
  const redirected = useRef<string | null>(null);
  const [state, setState] = useState<{token: string | null; result: ExchangeResult} | null>(null);
  const [requestedRetry, setRequestedRetry] = useState(0);
  const [retryReady, setRetryReady] = useState(false);

  useEffect(() => {
    const owner = Symbol();
    callbackOwner = owner;
    setRequestedRetry(0);
    if (!token || !/^[A-Za-z0-9_-]{20,128}$/.test(token)) {
      callbackAttempt = null;
      setState({token, result: {status: 'expired'}});
    } else {
      setState(null);
    }
    return () => {
      if (callbackOwner === owner) callbackOwner = null;
    };
  }, [token]);

  useEffect(() => {
    if (!token || !/^[A-Za-z0-9_-]{20,128}$/.test(token) || !auth.ready || auth.isLoggingOut || auth.logoutError) return;
    // Finish the initial cookie check before exchange captures its auth generation.
    let active = true;
    const attempt = exchangeOnce(token, requestedRetry);
    void attempt.result.then(result => {
      if (active && callbackAttempt === attempt) setState({token, result});
    });
    return () => {active = false;};
  }, [token, requestedRetry, auth.ready, auth.isLoggingOut, auth.logoutError]);

  const result = state?.token === token ? state.result : null;
  const retryAt = result?.status === 'unavailable' ? result.retryAt : undefined;
  useEffect(() => {
    setRetryReady(retryAt !== undefined && retryAt <= Date.now());
    if (retryAt === undefined || retryAt <= Date.now()) return;
    const timer = setTimeout(() => setRetryReady(true), retryAt - Date.now());
    return () => clearTimeout(timer);
  }, [retryAt]);

  useEffect(() => {
    if (result?.status !== 'exchanged' || !auth.ready || auth.authError || auth.logoutError || auth.isLoggingOut) return;
    if (!auth.user || String(auth.user.id) !== result.userId || redirected.current === token) return;
    redirected.current = token;
    router.replace('/' + locale + '/account');
  }, [result, token, auth.ready, auth.authError, auth.logoutError, auth.isLoggingOut, auth.user, router, locale]);

  if (!result || (result.status === 'exchanged' && !auth.ready)) return <TgWaitingSign />;

  const kind = result.status === 'expired' ? 'expired' : 'unavailable';
  return (
    <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <div className="w-full max-w-md border p-10 text-center" style={{borderColor: HAIR}}>
        <p className="font-display text-xl" style={{color: INK}}>{t(kind + '.title')}</p>
        <p className="mt-4 text-sm leading-relaxed" style={{color: MUTED}}>{t(kind + '.description')}</p>
        {result.status === 'exchanged' && (
          <Button
            type="button"
            onClick={() => {void whiteRetryAuth().catch(() => {});}}
            disabled={!auth.ready || auth.logoutError || auth.isLoggingOut}
            variant="white"
            size="white"
            className="mt-7 w-full"
          >
            {t('unavailable.retry')}
          </Button>
        )}
        {retryAt !== undefined && (
          <Button
            type="button"
            onClick={() => {
              if (!retryReady || !auth.ready || auth.logoutError || auth.isLoggingOut) return;
              setState(null);
              setRequestedRetry(count => Math.min(count + 1, MAX_EXCHANGE_RETRIES));
            }}
            disabled={!retryReady || !auth.ready || auth.logoutError || auth.isLoggingOut}
            variant="white"
            size="white"
            className="mt-7 w-full"
          >
            {t('unavailable.retryExchange')}
          </Button>
        )}
        <Button
          type="button"
          onClick={() => router.push('/' + locale + '/account')}
          variant="white"
          size="white"
          className="mt-7 w-full"
        >
          {t(kind + '.cta')}
        </Button>
      </div>
    </main>
  );
}

export default function TelegramAuthPage() {
  return (
    <Suspense fallback={<TgWaitingSign />}>
      <TelegramAuthContent />
    </Suspense>
  );
}
