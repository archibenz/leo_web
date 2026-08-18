'use client';

import Image from 'next/image';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {useWhiteBag, addToWhiteBag} from '../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR} from '../wv-palette';
import {WhiteArrow} from '../wv-icons';
import {WHITE_SETS, findWhiteProduct, whiteProductHref} from '../products';

// Curated sets: each look is an editorial image plus the real products it is
// made of. One button takes the whole look (size M — the bag line names the
// size); the mini cards below are display-only (photo + name + price, linking
// to the PDP) — no heart or Quick Add, the tiles are too small for controls.

export default function WhiteSetsShowcase({locale}: {locale: string}) {
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations('white.sets');
  const ru = locale === 'ru';
  const [addedSet, setAddedSet] = useState<string | null>(null);

  const addWholeLook = (setKey: string, keys: number[]) => {
    for (const k of keys) {
      const p = findWhiteProduct(k);
      if (!p) continue;
      const colour = p.colors[0]!;
      addToWhiteBag({key: p.key, en: p.en, ru: p.ru, price: p.sale ?? p.price, size: 'M', colorEn: colour.en, colorRu: colour.ru});
    }
    setAddedSet(setKey);
    window.setTimeout(() => setAddedSet((cur) => (cur === setKey ? null : cur)), 2400);
  };

  return (
    <>

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="flex-1">
        <div className="mx-auto w-full max-w-[1400px] px-6 pb-6 pt-14 sm:px-10 sm:pt-28">
          <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>
          <h1 className="wv-rise font-display text-[clamp(44px,calc(3.6vw_+_30px),72px)] font-light leading-[0.95] tracking-[-0.01em]">{t('title')}</h1>
          <p className="mt-8 max-w-xl text-[15px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>
        </div>

        {WHITE_SETS.map((set, idx) => {
          const items = set.productKeys.map((k) => findWhiteProduct(k)).filter((p): p is NonNullable<typeof p> => p != null);
          const total = items.reduce((sum, p) => sum + (p.sale ?? p.price), 0);
          return (
            <section key={set.key} className="border-t" style={{borderColor: HAIR}}>
              {/* A numbered pause between the looks keeps them from blurring together. */}
              <p className="mx-auto max-w-[1400px] px-6 pt-10 text-[11px] uppercase tracking-[0.3em] sm:px-12 lg:px-16" style={{color: MUTED}}>
                {String(idx + 1).padStart(2, '0')} — {t('eyebrow')}
              </p>
              <div className={`mx-auto grid max-w-[1400px] items-start gap-0 lg:grid-cols-[1fr_1.2fr] ${idx % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                {/* 4:5 at every width — the ratio these are photographed at, so
                    the whole figure stays in the frame. On desktop the cell used
                    to take its height from the copy column beside it, which made
                    it near-square while the photograph is portrait: object-cover
                    then ate the top and bottom, and the first look lost her head
                    entirely. It also cropped each set differently, since the
                    columns are different lengths. */}
                <div className="wv-zoom relative aspect-[4/5] w-full overflow-hidden">
                  <Image src={set.image} alt={ru ? set.ru : set.en} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                </div>
                <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 lg:py-16">
                  <h2 className="font-display text-[30px] font-light leading-[1.05] tracking-tight sm:text-[38px]">{ru ? set.ru : set.en}</h2>
                  <p className="mt-5 max-w-md text-[14px] leading-relaxed" style={{color: MUTED}}>{ru ? set.descRu : set.descEn}</p>

                  <p className="mt-10 text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('items')}</p>
                  {/* A list, one garment to a line. This was three shop cards in
                      a three-column grid, which on a phone left each of them the
                      width of a thumb: the names broke over three lines and a
                      considered look read as a cramped shelf. A row gives the
                      name the whole width whatever the screen, and the eye can
                      run down the list and total it up. */}
                  <ul className="mt-4">
                    {items.map((p) => (
                      <li key={p.key} className="border-t" style={{borderColor: HAIR}}>
                        <a
                          href={whiteProductHref(locale, p)}
                          className="group flex min-h-[72px] items-center gap-4 py-3 transition-opacity hover:opacity-70"
                        >
                          <span className="relative block h-[64px] w-[48px] shrink-0 overflow-hidden">
                            <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />
                          </span>
                          <span className="min-w-0 flex-1 text-[14px] leading-snug" style={{color: INK}}>
                            {ru ? p.ru : p.en}
                          </span>
                          <span className="shrink-0 text-[13px] tabular-nums" style={{color: MUTED}}>
                            {(p.sale ?? p.price).toLocaleString('ru-RU')} ₽
                          </span>
                          <WhiteArrow size={14} />
                        </a>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <button
                      type="button"
                      onClick={() => addWholeLook(set.key, set.productKeys)}
                      className="inline-flex min-h-12 items-center justify-center bg-[#1c1714] px-9 py-4 text-[12px] uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-85"
                    >
                      {addedSet === set.key ? '✓' : t('addAll')}
                    </button>
                    <span className="text-[13px] tabular-nums" style={{color: MUTED}}>
                      {t('wholeLook')} — <span style={{color: INK}}>{total.toLocaleString('ru-RU')} ₽</span>
                    </span>
                  </div>
                  <p aria-live="polite" className="mt-3 min-h-5 text-[12px]" style={{color: MUTED}}>
                    {addedSet === set.key ? t('addedAll') : ''}
                  </p>
                </div>
              </div>
            </section>
          );
        })}
      </main>
    </>
  );
}