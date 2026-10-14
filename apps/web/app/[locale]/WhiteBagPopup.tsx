'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useTranslations} from 'next-intl';
import {subscribeWhiteBagAdds, type WhiteBagItem} from '../../hooks/useWhiteBag';
import {INK, MUTED, HAIR} from './wv-palette';

// Confirmation that something went into the bag. The button already flips to
// "Добавлено ✓", but that is only visible if you are still looking at the button
// — from a card in the grid the whole event could pass unnoticed, and the header
// count is a single digit changing in the corner.
//
// It subscribes to the store rather than taking a prop, so it works the same
// whether the add came from the product page, a card's quick add or the sets
// page, and it is mounted once in the footer (present on every White page).
// Everything it shows travels on the bag line itself — mounted in the chrome,
// it has no catalogue to look a garment up in.

const DISMISS_MS = 5000;

export default function WhiteBagPopup({locale}: {locale: string}) {
  const t = useTranslations('white.card');
  const [item, setItem] = useState<WhiteBagItem | null>(null);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovered = useRef(false);
  const popupRef = useRef<HTMLDivElement>(null);

  const clearTimers = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    if (exitTimer.current !== null) clearTimeout(exitTimer.current);
    timer.current = null;
    exitTimer.current = null;
  }, []);

  const close = useCallback(() => {
    clearTimers();
    setLeaving(true);
    exitTimer.current = setTimeout(() => {
      setItem(null);
      hovered.current = false;
    }, 260);
  }, [clearTimers]);

  useEffect(() => subscribeWhiteBagAdds((next) => {
    clearTimers();
    setLeaving(false);
    setItem(next);
  }), [clearTimers]);

  // Restart the countdown on every add: a second garment should get its own
  // five seconds, not inherit what was left of the first.
  useEffect(() => {
    if (!item) return;
    const arm = () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (hovered.current || popupRef.current?.contains(document.activeElement)) {
          arm();
          return;
        }
        close();
      }, DISMISS_MS);
    };
    arm();
    return clearTimers;
  }, [item, close, clearTimers]);

  if (!item) return null;

  const name = locale === 'ru' ? item.ru : item.en;
  // Lines saved before the bag carried a slug have nowhere to point back to;
  // the bag itself is the honest destination for them.
  const href = item.slug ? `/${locale}/product/${item.slug}` : `/${locale}/bag`;
  const colour = locale === 'ru' ? item.colorRu : item.colorEn;

  return (
    <div
      ref={popupRef}
      // Polite, not assertive: the bag is a side effect of a deliberate tap, so
      // it should not interrupt whatever a screen reader is already saying.
      role="status"
      aria-live="polite"
      onMouseEnter={() => {
        hovered.current = true;
      }}
      onMouseLeave={() => {
        hovered.current = false;
      }}
      className={`wv-bagpop fixed inset-x-3 top-3 z-[70] mx-auto max-w-[380px] border bg-white sm:inset-x-auto sm:right-5 sm:top-5 ${leaving ? 'wv-bagpop-out' : ''}`}
      style={{borderColor: HAIR, boxShadow: '0 10px 40px rgba(28,23,20,0.10)'}}
    >
      <div className="flex items-stretch gap-3 p-3">
        {item.image && (
          <Link href={href} onClick={close} aria-label={name} className="relative h-[86px] w-[64px] shrink-0 overflow-hidden">
            <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
          </Link>
        )}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('addedTitle')}</p>
            <p className="mt-1.5 truncate text-[13px]" style={{color: INK}}>{name}</p>
            <p className="mt-0.5 text-[12px]" style={{color: MUTED}}>
              {[colour, item.size].filter(Boolean).join(' · ')}
            </p>
          </div>
          <Link
            href={`/${locale}/bag`}
            onClick={close}
            className="wv-arrow-link mt-2 inline-flex min-h-11 items-center gap-2 self-start text-[11px] uppercase tracking-[0.18em]"
            style={{color: INK}}
          >
            {t('goToBag')}
          </Link>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={t('close')}
          className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-start justify-end text-[15px] leading-none"
          style={{color: MUTED}}
        >
          ×
        </button>
      </div>
    </div>
  );
}
