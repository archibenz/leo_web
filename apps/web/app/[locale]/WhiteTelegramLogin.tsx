'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {apiFetch} from '../../lib/api';
import {whiteAdoptToken} from '../../hooks/useWhiteAuth';
import {MUTED, SIGNAL} from './wv-palette';

// Sign in through the Telegram bot: /api/auth/telegram/init hands back a
// one-time token plus a t.me deep link; the bot verifies (or registers) the
// visitor and the site polls /poll with the init token until the JWT is
// ready. The init token persists in localStorage so the flow survives the
// tab losing focus to the Telegram app — on return (mount or visibility)
// polling resumes. The bot's own site link (/auth/tg) stays as the fallback
// path for cross-device journeys.

const TG_TOKEN_KEY = 'tg_init_token';
const POLL_MS = 2500;
const MAX_ATTEMPTS = 120; // ~5 minutes

const TELEGRAM_BLUE = '#229ED9';

type TgStatus = 'idle' | 'waiting' | 'expired' | 'error';

function readSaved(): string | null {
  try {
    return localStorage.getItem(TG_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeSaved(token: string | null): void {
  try {
    if (token) localStorage.setItem(TG_TOKEN_KEY, token);
    else localStorage.removeItem(TG_TOKEN_KEY);
  } catch {
    /* storage unavailable — the in-memory flow still works */
  }
}

export default function WhiteTelegramLogin() {
  const t = useTranslations('white.account');
  const [status, setStatus] = useState<TgStatus>('idle');
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const tryPoll = useCallback(async (initToken: string): Promise<'success' | 'pending' | 'expired'> => {
    try {
      const data = await apiFetch<{status: 'pending' | 'ready'; token?: string}>(
        '/api/auth/telegram/poll',
        {headers: {Authorization: `Bearer ${initToken}`}, skipAuthHandler: true},
      );
      if (data.status === 'ready' && data.token) {
        const r = await whiteAdoptToken(data.token);
        return r.ok ? 'success' : 'pending';
      }
      return 'pending';
    } catch (err: unknown) {
      const code = (err as {status?: number}).status;
      if (code === 404 || code === 410) return 'expired';
      return 'pending';
    }
  }, []);

  const startPolling = useCallback((initToken: string) => {
    stopPolling();
    attemptsRef.current = 0;
    setStatus('waiting');
    pollRef.current = setInterval(async () => {
      attemptsRef.current += 1;
      if (attemptsRef.current > MAX_ATTEMPTS) {
        stopPolling();
        writeSaved(null);
        setStatus('expired');
        return;
      }
      const result = await tryPoll(initToken);
      if (result === 'success') {
        stopPolling();
        writeSaved(null);
        // The account page re-renders via useWhiteAuth — nothing left to show.
      } else if (result === 'expired') {
        stopPolling();
        writeSaved(null);
        setStatus('expired');
      }
    }, POLL_MS);
  }, [stopPolling, tryPoll]);

  // Resume a flow interrupted by the jump into the Telegram app.
  useEffect(() => {
    const saved = readSaved();
    if (saved) {
      tryPoll(saved).then((result) => {
        if (result === 'pending') startPolling(saved);
        else writeSaved(null);
      });
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const token = readSaved();
      if (token && !pollRef.current) startPolling(token);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      stopPolling();
    };
  }, [startPolling, stopPolling, tryPoll]);

  const begin = async () => {
    setBusy(true);
    setStatus('idle');
    try {
      const data = await apiFetch<{token: string; deepLink: string}>(
        '/api/auth/telegram/init',
        {method: 'POST', skipAuthHandler: true},
      );
      writeSaved(data.token);
      window.open(data.deepLink, '_blank', 'noopener');
      startPolling(data.token);
    } catch {
      setStatus('error');
    }
    setBusy(false);
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1" style={{background: '#e7e2db'}} />
        <span className="text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('orDivider')}</span>
        <span className="h-px flex-1" style={{background: '#e7e2db'}} />
      </div>
      <button
        type="button"
        onClick={begin}
        disabled={busy || status === 'waiting'}
        className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 border px-6 text-[12px] uppercase tracking-[0.2em] transition-colors hover:bg-[#f2f9fd] disabled:opacity-60"
        style={{borderColor: TELEGRAM_BLUE, color: TELEGRAM_BLUE}}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M21.9 4.6 18.9 19c-.2 1-.8 1.2-1.6.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-.9.5l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2L7.4 13.1 2.9 11.7c-1-.3-1-1 .2-1.4l17.5-6.8c.8-.3 1.5.2 1.3 1.1z" />
        </svg>
        {status === 'waiting' ? t('tgWaiting') : t('tgSignIn')}
      </button>
      {status === 'waiting' && (
        <p className="mt-2.5 text-[12px] leading-relaxed" style={{color: MUTED}} aria-live="polite">
          {t('tgHint')}
        </p>
      )}
      {(status === 'expired' || status === 'error') && (
        <p className="mt-2.5 text-[12px] leading-relaxed" role="alert" style={{color: SIGNAL}}>
          {status === 'expired' ? t('tgExpired') : t('tgError')}
        </p>
      )}
    </div>
  );
}
