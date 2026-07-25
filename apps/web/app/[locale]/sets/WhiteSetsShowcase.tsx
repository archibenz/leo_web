'use client';

import Image from 'next/image';
import {useState} from 'react';
import {useTranslations} from 'next-intl';
import {useWhiteBag, addToWhiteBag} from '../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import WhiteProductCard from '../WhiteProductCard';
import {INK, MUTED, HAIR} from '../wv-palette';
import {WHITE_SETS, findWhiteProduct} from '../products';

// Curated sets: each look is an editorial image plus the real products it is
// made of. One button takes the whole look (size M — the bag line names the
// size, and every piece can be re-added individually in another one); the
// product cards below carry their own Quick Add for piece-by-piece sizes.

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
              <div className={`mx-auto grid max-w-[1400px] gap-0 lg:grid-cols-[1fr_1.2fr] ${idx % 2 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div className="wv-zoom relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/10] lg:aspect-auto lg:min-h-[560px]">
                  <Image src={set.image} alt="" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
                </div>
                <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 lg:py-16">
                  <h2 className="font-display text-[30px] font-light leading-[1.05] tracking-tight sm:text-[38px]">{ru ? set.ru : set.en}</h2>
                  <p className="mt-5 max-w-md text-[14px] leading-relaxed" style={{color: MUTED}}>{ru ? set.descRu : set.descEn}</p>

                  <p className="mt-10 text-[11px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{t('items')}</p>
                  <div className="mt-5 grid grid-cols-3 gap-4 sm:gap-5">
                    {items.map((p, i) => (
                      <WhiteProductCard key={p.key} locale={locale} product={p} index={i} quickAdd hideFav />
                    ))}
                  </div>

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