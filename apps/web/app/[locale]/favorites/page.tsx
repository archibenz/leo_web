'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useFavorites, useCart} from '../../../contexts';
import HeroShaderBackgroundClient from '../../../components/HeroShaderBackgroundClient';
import Spinner from '../../../components/ui/Spinner';

type Props = {
  params: Promise<{locale: string}>;
};

export default function FavoritesPage({params}: Props) {
  const t = useTranslations('favorites');
  const {items, isLoading, removeItem, clearFavorites} = useFavorites();
  const {addItem: addToCart} = useCart();

  /* ── Extract locale from pathname ── */
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';

  if (isLoading) {
    return (
      <div className="relative min-h-screen pt-28 pb-6">
        <HeroShaderBackgroundClient />
        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <Spinner size="lg" />
              <p className="mt-4 text-ink-soft">{t('loading')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pt-28 pb-6">
      <HeroShaderBackgroundClient />
      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div className="space-y-3">
            <p className="capsule-tag">{t('tag')}</p>
            <h1 className="font-display text-ink text-[clamp(1.75rem,4vw,2.75rem)]">
              {t('title')}
              {items.length > 0 && (
                <span className="ml-3 text-3xl text-ink-soft">({items.length})</span>
              )}
            </h1>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearFavorites}
              className="text-sm uppercase tracking-wider text-ink-soft transition hover:text-ink"
            >
              {t('clearAll')}
            </button>
          )}
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="paper-card max-w-md space-y-6 p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ink/5">
                <svg viewBox="0 0 24 24" className="h-10 w-10 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M12 21C12 21 4 14.5 4 9c0-3 2.5-5 5.5-5 1.5 0 3 .8 4.5 2.5C15.5 4.8 17 4 18.5 4 21.5 4 24 6 24 9c0 5.5-8 12-12 12z" transform="translate(-2, 0) scale(0.95)" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="space-y-2">
                <p className="font-display text-2xl text-ink">{t('empty.title')}</p>
                <p className="text-sm text-ink-soft">{t('empty.subtitle')}</p>
              </div>
              <Link
                href={`/${locale}/shop`}
                className="inline-block w-full rounded-full bg-button px-8 py-4 text-base font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-button/85 hover:shadow-lg hover:shadow-button/25"
              >
                {t('empty.cta')}
              </Link>
            </div>
          </div>
        ) : (
          /* Product grid */
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="group relative"
              >
                {/* Image container */}
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-paperMuted">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-paperMuted to-paper">
                      <svg viewBox="0 0 24 24" className="h-16 w-16 text-ink/10" fill="none" stroke="currentColor" strokeWidth="0.8">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}

                  {/* Clickable overlay — navigates to product detail; buttons above use z-20 */}
                  <Link
                    href={`/${locale}/product/${item.id}`}
                    aria-label={item.title}
                    className="absolute inset-0 z-10"
                  />

                  {/* Remove button - top right */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-paper/80 text-ink-soft backdrop-blur-sm transition-all hover:bg-paper hover:text-ink"
                    aria-label={t('remove')}
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                      <path d="M12 21C12 21 4 14.5 4 9c0-3 2.5-5 5.5-5 1.5 0 3 .8 4.5 2.5C15.5 4.8 17 4 18.5 4 21.5 4 24 6 24 9c0 5.5-8 12-12 12z" transform="translate(-2, 0) scale(0.95)" />
                    </svg>
                  </button>

                  {/* Hover overlay with action */}
                  <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="bg-gradient-to-t from-paper/95 via-paper/80 to-transparent px-4 pb-4 pt-10">
                      <button
                        onClick={() => addToCart({id: item.id, title: item.title, image: item.image})}
                        className="w-full rounded-full bg-button py-3 text-xs font-medium uppercase tracking-wider text-ink transition hover:bg-button/90"
                      >
                        {t('addToBag')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Product info — clickable (duplicate link, hidden from a11y to avoid double tab stop) */}
                <Link
                  href={`/${locale}/product/${item.id}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  className="mt-4 block space-y-1 px-1"
                >
                  <h3 className="font-medium text-ink truncate">{item.title}</h3>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
