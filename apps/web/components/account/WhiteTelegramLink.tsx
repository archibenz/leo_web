'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {AlertCircle, Check, LoaderCircle, Send} from 'lucide-react';
import {Button} from '../ui/button';
import {usePageLoading} from '@/components/loading/PageLoadingProvider';
import {getTelegramLinkStatus, issueTelegramLink, telegramLinkFailure, telegramLinkRetryAt,
  type TelegramLinkChallenge, type TelegramLinkFailure} from '../../lib/telegramLink';

type Props = {userId: string | number; role?: string; onSignInAgain: () => void; onVerified: () => void};
type Status = TelegramLinkFailure | 'loading' | 'idle' | 'starting' | 'pending' | 'verified' | 'refresh' | 'expired';
type Action = 'status' | 'issue';
type View = {status: Status; challenge: TelegramLinkChallenge | null; verifiedUntil: number | null; retryAt: number | null; retryAction: Action};
type Request = {controller: AbortController; timer: number};

const passiveStates = new Set<Status>(['loading', 'idle', 'pending', 'verified', 'refresh', 'expired']);
const emptyView = (status: Status): View => ({status, challenge: null, verifiedUntil: null, retryAt: null, retryAction: 'status'});

function TelegramLinkControls({userId, onSignInAgain, onVerified}: Props) {
  const t = useTranslations('white.account.telegramLink');
  const [view, setView] = useState<View>(() => emptyView('loading'));
  usePageLoading(view.status === 'loading');
  const current = useRef(view);
  const request = useRef<Request | null>(null);
  const blankWindow = useRef<Window | null>(null);
  const lastCheck = useRef(-Infinity);
  const awaitingVerification = useRef(false);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;

  const update = useCallback((next: View) => {
    current.current = next;
    setView(next);
  }, []);

  const acceptVerification = useCallback((verifiedUntil: number | null) => {
    const confirmedNow = awaitingVerification.current;
    awaitingVerification.current = false;
    update({...emptyView('verified'), verifiedUntil});
    if (confirmedNow) onVerifiedRef.current();
  }, [update]);

  const closeBlank = useCallback(() => {
    blankWindow.current?.close();
    blankWindow.current = null;
  }, []);

  const cancelRequest = useCallback(() => {
    if (!request.current) return;
    request.current.controller.abort();
    window.clearTimeout(request.current.timer);
    request.current = null;
  }, []);

  const expireChallenge = useCallback(() => {
    if (!current.current.challenge) return;
    cancelRequest();
    closeBlank();
    lastCheck.current = -Infinity;
    awaitingVerification.current = true;
    update(emptyView('expired'));
  }, [cancelRequest, closeBlank, update]);

  const beginRequest = useCallback((retryAction: Action): Request | null => {
    if (request.current) return null;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (request.current?.controller !== controller) return;
      cancelRequest();
      closeBlank();
      update({...emptyView('unavailable'), retryAction});
    }, 15_000);
    request.current = {controller, timer};
    return request.current;
  }, [cancelRequest, closeBlank, update]);

  const finishRequest = useCallback((active: Request) => {
    window.clearTimeout(active.timer);
    if (request.current === active) request.current = null;
  }, []);

  const showFailure = useCallback((error: unknown, retryAction: Action) => {
    const status = telegramLinkFailure(error);
    update({...emptyView(status), retryAction, retryAt: status === 'rateLimited' ? telegramLinkRetryAt(error) : null});
  }, [update]);

  const checkStatus = useCallback(async (retry = false) => {
    if (document.visibilityState === 'hidden') return;
    if (current.current.challenge && current.current.challenge.expiresAt <= Date.now()) expireChallenge();
    const previous = current.current;
    if (request.current || (previous.retryAt && previous.retryAt > Date.now())) return;
    if (!retry && (!passiveStates.has(previous.status) || Date.now() - lastCheck.current < 3000)) return;
    const active = beginRequest('status');
    if (!active) return;
    lastCheck.current = Date.now();
    if (retry) update(emptyView('loading'));
    try {
      const result = await getTelegramLinkStatus(userId, active.controller.signal);
      if (active.controller.signal.aborted) return;
      const challenge = current.current.challenge;
      if (challenge && challenge.expiresAt <= Date.now()) {
        expireChallenge();
        return;
      }
      if (result.linked && result.verified) {
        acceptVerification(result.verifiedUntil);
      } else {
        awaitingVerification.current = true;
        update({...emptyView(challenge ? 'pending' : result.linked ? 'refresh' : previous.status === 'expired' ? 'expired' : 'idle'), challenge});
      }
    } catch (error) {
      if (!active.controller.signal.aborted) showFailure(error, 'status');
    } finally {
      finishRequest(active);
    }
  }, [acceptVerification, beginRequest, expireChallenge, finishRequest, showFailure, update, userId]);

  useEffect(() => {
    void checkStatus();
    const checkOnReturn = () => {void checkStatus();};
    const clearOnSessionChange = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== 'reinasleo_token' && event.key !== 'reinasleo_logout') return;
      cancelRequest();
      closeBlank();
      update(emptyView('sessionExpired'));
    };
    window.addEventListener('focus', checkOnReturn);
    document.addEventListener('visibilitychange', checkOnReturn);
    window.addEventListener('storage', clearOnSessionChange);
    return () => {
      window.removeEventListener('focus', checkOnReturn);
      document.removeEventListener('visibilitychange', checkOnReturn);
      window.removeEventListener('storage', clearOnSessionChange);
      cancelRequest();
      closeBlank();
      lastCheck.current = -Infinity;
    };
  }, [cancelRequest, checkStatus, closeBlank, update]);

  useEffect(() => {
    if (!view.challenge) return;
    const challenge = view.challenge;
    const expiry = window.setTimeout(() => {
      if (current.current.challenge === challenge) expireChallenge();
    }, Math.max(0, challenge.expiresAt - Date.now()));
    const poll = window.setInterval(() => {void checkStatus();}, 15_000);
    return () => {
      window.clearTimeout(expiry);
      window.clearInterval(poll);
    };
  }, [checkStatus, expireChallenge, view.challenge]);

  useEffect(() => {
    const verifiedUntil = view.verifiedUntil;
    if (!verifiedUntil) return;
    let timer: number;
    const checkExpiry = () => {
      const remaining = verifiedUntil - Date.now();
      if (remaining <= 0) {
        awaitingVerification.current = true;
        update(emptyView('refresh'));
      }
      else timer = window.setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
    };
    checkExpiry();
    return () => window.clearTimeout(timer);
  }, [update, view.verifiedUntil]);

  useEffect(() => {
    if (!view.retryAt || !Number.isFinite(view.retryAt)) return;
    const timer = window.setTimeout(() => update({...current.current, retryAt: null}), Math.max(0, view.retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [update, view.retryAt]);

  async function connect() {
    if (current.current.status === 'loading' || current.current.status === 'starting'
      || (current.current.retryAt && current.current.retryAt > Date.now())) return;
    let checkingExpired = current.current.status === 'expired';
    cancelRequest();
    closeBlank();
    try {
      blankWindow.current = window.open('about:blank', '_blank');
      // Keep the user gesture for browsers that block windows opened after await.
      if (blankWindow.current) blankWindow.current.opener = null;
    } catch {
      closeBlank();
    }
    const active = beginRequest(checkingExpired ? 'status' : 'issue');
    if (!active) {closeBlank(); return;}
    update(emptyView('starting'));
    try {
      if (checkingExpired) {
        lastCheck.current = Date.now();
        const result = await getTelegramLinkStatus(userId, active.controller.signal);
        if (active.controller.signal.aborted) return;
        if (result.linked && result.verified) {
          closeBlank();
          acceptVerification(result.verifiedUntil);
          return;
        }
        checkingExpired = false;
      }
      const challenge = await issueTelegramLink(active.controller.signal);
      if (active.controller.signal.aborted) return;
      awaitingVerification.current = true;
      update({...emptyView('pending'), challenge});
      if (blankWindow.current && !blankWindow.current.closed) {
        try {
          blankWindow.current.location.replace(challenge.deepLink);
          blankWindow.current = null;
        } catch {
          closeBlank();
        }
      } else {
        blankWindow.current = null;
      }
    } catch (error) {
      if (!active.controller.signal.aborted) {
        closeBlank();
        showFailure(error, checkingExpired ? 'status' : 'issue');
      }
    } finally {
      finishRequest(active);
    }
  }

  const busy = view.status === 'loading' || view.status === 'starting';
  const linked = view.status === 'verified';
  const signIn = view.status === 'sessionExpired' || view.status === 'accessRequired';
  const failed = view.status === 'conflict' || view.status === 'unavailable' || view.status === 'rateLimited';
  const Icon = busy ? LoaderCircle : linked ? Check : failed || signIn || view.status === 'expired' ? AlertCircle : Send;

  return (
    <section className="wv-telegram-card" data-state={view.status} aria-label={t('title')}>
      <div className="wv-telegram-heading">
        <span className="wv-telegram-icon"><Icon aria-hidden="true" size={20} className={busy ? 'wv-telegram-progress' : undefined} /></span>
        <h2>{t('title')}</h2>
      </div>
      {!linked && view.status !== 'refresh' && <p className="wv-telegram-copy">{t('description')}</p>}
      <p key={view.status} className="wv-telegram-state" data-status={view.status} role="status" aria-live="polite" aria-atomic="true">{t(view.status)}</p>
      {signIn ? (
        <Button variant="white" size="white" className="wv-telegram-action" onClick={onSignInAgain}>{t('signInAgain')}</Button>
      ) : view.challenge ? (
        <>
          <a href={view.challenge.deepLink} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            className="wv-telegram-open wv-telegram-action"
            onClick={(event) => {
              if (view.challenge!.expiresAt <= Date.now()) {
                event.preventDefault();
                expireChallenge();
              }
            }}>
            {t('openTelegram')}
          </a>
          <details className="wv-telegram-hint">
            <summary>{t('helpTitle')}</summary>
            <p>{t('help')}</p>
          </details>
        </>
      ) : !linked && (
        <Button variant="white" size="white" className="wv-telegram-action" disabled={busy || view.retryAt !== null}
          onClick={() => failed && view.retryAction === 'status' ? void checkStatus(true) : void connect()}>
          {t(busy ? 'working' : view.retryAt ? 'wait' : failed ? 'retry' : view.status === 'refresh' ? 'refreshAction' : 'connect')}
        </Button>
      )}
    </section>
  );
}

export default function WhiteTelegramLink(props: Props) {
  return <TelegramLinkControls key={String(props.userId)} {...props} />;
}
