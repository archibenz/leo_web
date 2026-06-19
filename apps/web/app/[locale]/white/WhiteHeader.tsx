'use client';

import type {ReactNode} from 'react';
import {INK, HAIR} from './wv-palette';

// Variant 2 "White" — shared sticky header. Owns the chrome (blur, hairline,
// padding) and the flex-1 left/right slots that keep the REINASLEO wordmark
// dead-centre on every page; each page passes its own left/right content.

export default function WhiteHeader({locale, left, right}: {locale: string; left: ReactNode; right: ReactNode}) {
  return (
    <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-md" style={{borderBottom: `1px solid ${HAIR}`}}>
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex flex-1 items-center justify-start">{left}</div>
        <a href={`/${locale}/white`} className="font-display text-[22px] font-medium tracking-[0.42em] sm:text-[26px]" style={{color: INK}}>
          REINASLEO
        </a>
        <div className="flex flex-1 items-center justify-end">{right}</div>
      </div>
    </header>
  );
}
