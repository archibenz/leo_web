'use client';

import {Fragment, useEffect, useRef, useState, type CSSProperties, type Ref} from 'react';
import {useTranslations} from 'next-intl';
import {selectTickerItems} from '../../lib/catalogue/select';
import type {TickerItem} from '../../lib/catalogue/types';
import {HAIR, INK, MUTED} from './wv-palette';

// Owner-edited announcements above the hero (storefront_sections, layout=
// 'ticker'). Deliberately quiet: one line's height, the storefront's own
// palette, no gold, no highlight box — see the house-line comment further
// down the page for why a busier version of this was removed once already.
//
// Selection (language + `until`) happens in lib/catalogue/select.ts, not
// here — this component only decides HOW to show whatever it is given.

const READ_SPEED_PX_PER_SECOND = 50;
const MIN_DURATION_SECONDS = 12;

function tickerText(item: TickerItem, locale: string): string {
  return (locale === 'ru' ? item.ru : item.en) ?? '';
}

function TickerLine({item, locale, hidden}: {item: TickerItem; locale: string; hidden?: boolean}) {
  const text = tickerText(item, locale);
  // A plain internal path only (validated server-side) — no target=_blank,
  // this line never sends anyone off the site.
  return item.href ? (
    <a href={item.href} className="wv-ticker-link" tabIndex={hidden ? -1 : undefined}>
      {text}
    </a>
  ) : (
    <span className="wv-ticker-link">{text}</span>
  );
}

// One printing of the whole line-up, a quiet dot after every line (including
// the last — the loop seam then keeps the same rhythm as everywhere else).
// Two of these sit side by side once the content needs to move (see the track
// below) — `hidden` marks the second one so a screen reader reads the
// announcements once, not twice, while sighted users see the seamless loop.
// `measureRef` only ever goes on the first, visible copy: that box's natural
// width is what decides whether the track animates at all.
function TickerSegment({items, locale, hidden, measureRef}: {
  items: TickerItem[];
  locale: string;
  hidden?: boolean;
  measureRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={measureRef} className="wv-ticker-segment" aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <Fragment key={`${item.href ?? ''}-${item.until ?? ''}-${i}`}>
          <TickerLine item={item} locale={locale} hidden={hidden} />
          <span aria-hidden="true" className="wv-ticker-dot" style={{color: MUTED}}>
            ·
          </span>
        </Fragment>
      ))}
    </div>
  );
}

export default function WhiteTicker({locale, items}: {locale: string; items?: TickerItem[]}) {
  const t = useTranslations('white.ticker');
  const viewportRef = useRef<HTMLDivElement>(null);
  const segmentRef = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState<{animate: boolean; seconds: number}>({animate: false, seconds: MIN_DURATION_SECONDS});

  const visible = selectTickerItems(items, locale);
  // Cheap content fingerprint for the effect below: the array itself is a new
  // reference every render (selectTickerItems returns a fresh filter result),
  // but the effect only needs to re-measure when the actual text changes.
  const fingerprint = visible.map((i) => `${tickerText(i, locale)}#${i.href ?? ''}`).join(' ');

  // Rule from the brief: a line that already fits stays put; motion turns on
  // only once the content is wider than the bar. Measured, not guessed — the
  // font, the locale's word lengths and the viewport width all move this
  // number, so a fixed breakpoint would be wrong somewhere.
  useEffect(() => {
    const viewport = viewportRef.current;
    const segment = segmentRef.current;
    if (!viewport || !segment) return;
    const overflow = segment.scrollWidth > viewport.clientWidth;
    // reduced-motion never animates, loop-duplicate included — a duplicate
    // exists only to make the CSS loop seamless, and with no loop it would
    // just be the same text a second time under a native scrollbar. The
    // viewport's own overflow-x (see globals.css) is what keeps a still-too-
    // wide line reachable for these visitors instead.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setMotion({
      animate: overflow && !reduced,
      seconds: Math.max(MIN_DURATION_SECONDS, segment.scrollWidth / READ_SPEED_PX_PER_SECOND),
    });
  }, [fingerprint]);

  if (visible.length === 0) return null;

  const trackStyle = motion.animate ? ({'--wv-ticker-duration': `${motion.seconds}s`} as CSSProperties) : undefined;

  return (
    <div
      role="region"
      aria-label={t('regionLabel')}
      className="wv-ticker"
      style={{borderBottom: `1px solid ${HAIR}`, color: INK}}
    >
      <div ref={viewportRef} className="wv-ticker-viewport">
        <div className={`wv-ticker-track${motion.animate ? ' wv-ticker-track--animated' : ''}`} style={trackStyle}>
          <TickerSegment items={visible} locale={locale} measureRef={segmentRef} />
          {/* Только когда содержимое шире полосы: при первом клиентском рендере
              motion начинается с animate:false, и эффект выше включает второй
              экземпляр после замера, а не по догадке о длине текста. */}
          {motion.animate && <TickerSegment items={visible} locale={locale} hidden />}
        </div>
      </div>
    </div>
  );
}
