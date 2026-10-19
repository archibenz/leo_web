'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {Button} from '../ui/button';
import {OWNER_LINK_STYLE} from '../editor/AdminPanelLink';

type Props = {userId: string | number; locale: string};
type Status = 'checking' | 'allowed' | 'denied' | 'unavailable';
type Request = {controller: AbortController; timer: number};

function AnalyticsAccess({locale}: Props) {
  const t = useTranslations('white.account.analyticsAccess');
  const [status, setStatus] = useState<Status>('checking');
  const request = useRef<Request | null>(null);
  const lastCheck = useRef(-Infinity);
  const sessionChanged = useRef(false);

  const cancel = useCallback(() => {
    if (!request.current) return;
    request.current.controller.abort();
    window.clearTimeout(request.current.timer);
    request.current = null;
  }, []);

  const check = useCallback(async (retry = false) => {
    if (sessionChanged.current || request.current || document.visibilityState === 'hidden') return;
    if (!retry && Date.now() - lastCheck.current < 3000) return;
    lastCheck.current = Date.now();
    setStatus('checking');
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (request.current?.controller !== controller) return;
      cancel();
      setStatus('unavailable');
    }, 10_000);
    const active = {controller, timer};
    request.current = active;
    try {
      const response = await fetch(`/${encodeURIComponent(locale)}/account/analytics-access`, {
        credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal,
      });
      if (controller.signal.aborted || request.current !== active) return;
      setStatus(response.status === 204 ? 'allowed' : response.status === 401 || response.status === 403 ? 'denied' : 'unavailable');
    } catch {
      if (!controller.signal.aborted && request.current === active) setStatus('unavailable');
    } finally {
      window.clearTimeout(timer);
      if (request.current === active) request.current = null;
    }
  }, [cancel, locale]);

  useEffect(() => {
    void check();
    const checkOnReturn = () => {void check();};
    const invalidate = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== 'reinasleo_token' && event.key !== 'reinasleo_logout') return;
      sessionChanged.current = true;
      cancel();
      setStatus('denied');
    };
    window.addEventListener('focus', checkOnReturn);
    document.addEventListener('visibilitychange', checkOnReturn);
    window.addEventListener('storage', invalidate);
    return () => {
      window.removeEventListener('focus', checkOnReturn);
      document.removeEventListener('visibilitychange', checkOnReturn);
      window.removeEventListener('storage', invalidate);
      cancel();
      lastCheck.current = -Infinity;
    };
  }, [cancel, check]);

  if (status === 'checking' || status === 'denied') return null;

  return (
    <section className="mt-3" aria-label={t('title')}>
      {status === 'allowed' ? (
        <Button asChild variant="owner" size="owner" className="w-full justify-between text-left" style={OWNER_LINK_STYLE}>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Analytics is a separate application served by nginx. */}
          <a href="/analytics">{t('open')}</a>
        </Button>
      ) : (
        <>
          <p role="status" className="text-[13px] leading-relaxed">{t('unavailable')}</p>
          <Button variant="owner" size="owner" className="mt-3 w-full text-left" style={OWNER_LINK_STYLE} onClick={() => {void check(true);}}>{t('retry')}</Button>
        </>
      )}
    </section>
  );
}

export default function AccountAnalyticsAccess(props: Props) {
  return <AnalyticsAccess key={`${props.userId}:${props.locale}`} {...props} />;
}
