'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '../ui/button';
import {issueTelegramLink, verifyTelegramLink, telegramLinkFailure, type TelegramLinkChallenge, type TelegramLinkFailure} from '../../lib/telegramLink';

type Props = {userId: string | number; role?: string; onSignInAgain: () => void};
type Status = TelegramLinkFailure | 'idle' | 'verified' | 'expired' | 'checkAgain';

function TelegramLinkControls({userId, onSignInAgain}: Omit<Props, 'role'>) {
  const t = useTranslations('white.account.telegramLink');
  const [challenge, setChallenge] = useState<TelegramLinkChallenge | null>(null);
  const [verifiedUntil, setVerifiedUntil] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const expireChallenge = useCallback(() => {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setChallenge(null);
    setVerifiedUntil(null);
    setStatus('expired');
  }, []);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!challenge) return;
    const timer = window.setTimeout(expireChallenge, Math.max(0, challenge.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [challenge, expireChallenge]);
  useEffect(() => {
    if (!verifiedUntil) return;
    const timer = window.setTimeout(() => {
      setVerifiedUntil(null);
      setStatus('checkAgain');
    }, Math.max(0, verifiedUntil - Date.now()));
    return () => window.clearTimeout(timer);
  }, [verifiedUntil]);

  async function run(action: 'issue' | 'verify') {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setVerifiedUntil(null);
    setStatus('idle');
    if (action === 'issue') setChallenge(null);
    try {
      if (action === 'issue') {
        const next = await issueTelegramLink(controller.signal);
        if (controller.signal.aborted) return;
        setChallenge(next);
        setStatus('pending');
      } else {
        const expiresAt = await verifyTelegramLink(userId, controller.signal);
        if (controller.signal.aborted) return;
        setChallenge(null);
        setVerifiedUntil(expiresAt);
        setStatus('verified');
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const failure = telegramLinkFailure(error);
      if (failure === 'sessionExpired' || failure === 'accessRequired' || failure === 'conflict') setChallenge(null);
      setStatus(failure);
    } finally {
      if (!controller.signal.aborted) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <section className="mt-10" aria-label={t('title')}>
      <h2 className="text-[11px] uppercase tracking-[0.2em] opacity-60">{t('title')}</h2>
      <p className="mt-3 text-[13px] leading-relaxed">{t('description')}</p>
      <p className="mt-3 text-[13px] leading-relaxed" role="status" aria-live="polite">{t(status)}</p>
      {status === 'sessionExpired' || status === 'accessRequired' ? (
        <Button variant="white" size="white" className="mt-4 w-full" onClick={onSignInAgain}>{t('signInAgain')}</Button>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <Button variant="white" size="white" className="w-full text-[12px] uppercase tracking-[0.16em]" disabled={busy} onClick={() => run('issue')}>
            {t(verifiedUntil ? 'confirmAgain' : 'confirm')}
          </Button>
          {challenge && (
            <a href={challenge.deepLink} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
              className="wv-link inline-flex min-h-11 items-center justify-center text-[13px]"
              onClick={(event) => {
                if (challenge.expiresAt <= Date.now()) {
                  event.preventDefault();
                  expireChallenge();
                }
              }}>
              <span className="wv-link-ink">{t('openTelegram')}</span>
            </a>
          )}
          <button type="button" disabled={busy} onClick={() => run('verify')}
            className="wv-link inline-flex min-h-11 items-center justify-center text-[13px] disabled:opacity-50">
            <span className="wv-link-ink">{t('check')}</span>
          </button>
        </div>
      )}
    </section>
  );
}

export default function WhiteTelegramLink({userId, role, onSignInAgain}: Props) {
  return role === 'admin' ? <TelegramLinkControls key={String(userId)} userId={userId} onSignInAgain={onSignInAgain} /> : null;
}
