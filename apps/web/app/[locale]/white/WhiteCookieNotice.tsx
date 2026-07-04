'use client';

import {useEffect, useState} from 'react';
import {useTranslations} from 'next-intl';
import {INK, MUTED, HAIR} from './wv-palette';

// A quiet cookie line: one sentence, the policy link, one button. Shown once —
// the acknowledgement lives in localStorage, and until the client mounts
// nothing renders, so the server and first paint agree.

const KEY = 'wv-cookie-ok';

export default function WhiteCookieNotice({locale}: {locale: string}) {
  const t = useTranslations('white.footer');
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage unavailable — stay quiet */
    }
  }, []);

  if (!show) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* storage unavailable — dismiss for the session anyway */
    }
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label={t('cookieText')}
      className="fixed inset-x-0 bottom-0 z-[1100] border-t bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6"
      style={{borderColor: HAIR, color: INK}}
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[12px] leading-relaxed" style={{color: MUTED}}>
          {t('cookieText')}{' '}
          <a href={`/${locale}/privacy`} className="wv-link" style={{color: INK}}>
            {t('cookieMore')}
          </a>
        </p>
        <button
          type="button"
          onClick={accept}
          className="wv-btn min-h-9 shrink-0 px-6 py-2 text-[11px] uppercase tracking-[0.18em]"
        >
          {t('cookieOk')}
        </button>
      </div>
    </div>
  );
}
