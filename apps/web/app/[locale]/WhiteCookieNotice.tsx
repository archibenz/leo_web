'use client';

import {useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {INK, MUTED, HAIR} from './wv-palette';
import {COOKIE_CONSENT_KEY} from '../../lib/cookieConsent';

// A quiet cookie line: one sentence, the policy link, one button. Shown once —
// the acknowledgement lives in localStorage, and until the client mounts
// nothing renders, so the server and first paint agree.
// Read by anything else pinned to the bottom of the viewport (the PDP's mobile
// sticky add-to-bag bar) so it can reserve this much space instead of sitting
// underneath the notice — both are `fixed inset-x-0 bottom-0`, and this one
// wins the stacking order.
const HEIGHT_VAR = '--wv-cookie-h';

export default function WhiteCookieNotice({locale}: {locale: string}) {
  const t = useTranslations('white.footer');
  const [show, setShow] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(COOKIE_CONSENT_KEY)) setShow(true);
    } catch {
      /* storage unavailable — stay quiet */
    }
  }, []);

  // Broadcasts the notice's live height onto <html> while it is up, and
  // releases it the moment it isn't. Measured, not hardcoded: the message
  // wraps onto a different number of lines in en/ru and at different widths,
  // so a constant would drift from whatever actually painted.
  useEffect(() => {
    if (!show) {
      document.documentElement.style.removeProperty(HEIGHT_VAR);
      return;
    }
    const el = noticeRef.current;
    if (!el) return;
    const setHeight = () => document.documentElement.style.setProperty(HEIGHT_VAR, `${el.offsetHeight}px`);
    setHeight();
    // The Jost UI font loads after first paint; once it applies the notice's
    // two lines can reflow to one (or back), same reason WhiteShopShowcase
    // re-measures its own edge-fade after fonts settle.
    if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(setHeight);
    // jsdom (unit tests) has no ResizeObserver — the measurements above are
    // still correct there, they just aren't live.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(setHeight) : undefined;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      document.documentElement.style.removeProperty(HEIGHT_VAR);
    };
  }, [show]);

  if (!show) return null;

  const accept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, '1');
    } catch {
      /* storage unavailable — dismiss for the session anyway */
    }
    // Cleared here, synchronously, rather than left to the effect's cleanup:
    // whatever reserved this space should let go of it the instant the notice
    // is dismissed, not whenever the next passive-effect flush happens to run.
    document.documentElement.style.removeProperty(HEIGHT_VAR);
    setShow(false);
  };

  return (
    <div
      ref={noticeRef}
      role="region"
      aria-label={t('cookieText')}
      className="fixed inset-x-0 bottom-0 z-[1100] border-t bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6"
      style={{borderColor: HAIR, color: INK}}
    >
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="text-[12px] leading-relaxed" style={{color: MUTED}}>
          {t('cookieText')}{' '}
          {/* wv-tap, not a 44px inline-flex: this link sits inside a sentence,
              and a tall flex box takes its baseline from its centred contents,
              which lifts the word off the line it belongs to. */}
          <a href={`/${locale}/privacy`} className="wv-link wv-tap relative" style={{color: INK}}>
            <span className="wv-link-ink">{t('cookieMore')}</span>
          </a>
        </p>
        <button
          type="button"
          onClick={accept}
          // 44px: every visitor taps this once before they can read anything
          // behind it, and min-h-9 measured 36px on a phone — under the floor
          // the rest of the storefront holds itself to.
          className="wv-btn min-h-11 shrink-0 px-6 py-2 text-[11px] uppercase tracking-[0.18em]"
        >
          {t('cookieOk')}
        </button>
      </div>
    </div>
  );
}
