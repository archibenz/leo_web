'use client';

import {useState, useEffect, useCallback} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {useCart} from '../../../contexts/CartContext';
import {useAuth} from '../../../contexts/AuthContext';
import HeroShaderBackgroundClient from '../../../components/HeroShaderBackgroundClient';

/* ── Recently-viewed item shape ── */
interface RecentItem {
  id: string;
  title: string;
  image?: string;
}

/* ── LocalStorage key ── */
const RECENT_KEY = 'reinasleo_recently_viewed';
const MAX_RECENT = 8;

/* ── Placeholder items shown when localStorage is empty ── */
const PLACEHOLDER_RECENT: RecentItem[] = [
  {id: 'ph-1', title: 'Silk Evening Gown'},
  {id: 'ph-2', title: 'Sculptured Wool Coat'},
  {id: 'ph-3', title: 'Tailored Wide-Leg Trousers'},
  {id: 'ph-4', title: 'Cashmere Draped Cardigan'},
];

function loadRecent(): RecentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

/* ── Hook: useRecentlyViewed ── */
function useRecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const stored = loadRecent();
    setItems(stored.length > 0 ? stored : PLACEHOLDER_RECENT);
  }, []);

  const add = useCallback((item: RecentItem) => {
    setItems(prev => {
      const next = [item, ...prev.filter(i => i.id !== item.id)].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, []);

  return {items, add};
}

export default function CartPage() {
  const t = useTranslations('cart');
  const {items, count, total, isLoading, removeItem, updateQuantity, clearCart} = useCart();
  const {user} = useAuth();
  const {items: recentItems} = useRecentlyViewed();

  /* ── Extract locale from pathname ── */
  const pathname = usePathname() || '/';
  const locale = pathname.split('/')[1] || 'ru';

  const cartEmpty = items.length === 0;
  const subtotal = total;
  const hasTestItems = items.some(item => item.isTest);
  const allTest = items.length > 0 && items.every(item => item.isTest);
  const realTotal = items.filter(i => !i.isTest).reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="relative min-h-screen pt-28 pb-6">
        <HeroShaderBackgroundClient />
        <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
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

        {/* ── Page header ── */}
        <div className="mb-10 flex items-end justify-between">
          <div className="space-y-3">
            <p className="capsule-tag">{t('tag')}</p>
            <h1 className="font-display text-ink text-[clamp(1.75rem,4vw,2.75rem)]">
              {t('title')}
              {count > 0 && (
                <span className="ml-3 text-3xl text-ink-soft">({count})</span>
              )}
            </h1>
          </div>
          {!cartEmpty && (
            <button
              onClick={clearCart}
              className="text-sm uppercase tracking-wider text-ink-soft transition hover:text-ink"
              aria-label={t('clearAll')}
            >
              {t('clearAll')}
            </button>
          )}
        </div>

        {/* ── Cart content ── */}
        {cartEmpty ? (
          /* Empty state — centred within content area */
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="paper-card max-w-md space-y-6 p-10 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-ink/5">
                <svg viewBox="0 0 24 24" className="h-10 w-10 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M6 6h12l1.5 12a1 1 0 0 1-1 1H7.5a1 1 0 0 1-1-1L6 6z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 6V5a3 3 0 0 1 6 0v1" strokeLinecap="round" strokeLinejoin="round" />
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
          /* Cart items + summary */
          <>
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
              {/* ── Left column: cart items ── */}
              <div className="space-y-3">
                {hasTestItems && (
                  <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-4">
                    <p className="text-sm text-[var(--accent)]">
                      {t('testProductWarning')}
                    </p>
                  </div>
                )}
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="paper-card flex items-center gap-4 p-4 sm:p-5"
                  >
                    {item.image ? (
                      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-paperMuted">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-paperMuted to-paper">
                        <svg viewBox="0 0 24 24" className="h-8 w-8 text-ink/10" fill="none" stroke="currentColor" strokeWidth="0.8">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink truncate">{item.title}</p>
                        {item.isTest && (
                          <span className="flex-shrink-0 rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                            Demo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {item.size && (
                          <span className="text-sm text-ink-soft">{item.size}</span>
                        )}
                        {item.price !== undefined && (
                          <p className="text-sm text-ink-soft">&euro;{item.price.toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/12 text-ink-soft transition hover:border-ink hover:text-ink"
                          aria-label={t('decrease')}
                        >
                          &minus;
                        </button>
                        <span className="w-7 text-center text-sm font-medium text-ink tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/12 text-ink-soft transition hover:border-ink hover:text-ink"
                          aria-label={t('increase')}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-ink/5 hover:text-ink"
                        aria-label={t('remove')}
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Right column: sticky summary (desktop) ── */}
              <div className="hidden lg:block">
                <div className="sticky top-32">
                  <div className="paper-card space-y-6 p-7">
                    <h2 className="font-display text-xl text-ink">{t('summary')}</h2>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">{t('subtotal')}</span>
                      <span className="text-ink">&euro;{subtotal.toFixed(2)}</span>
                    </div>

                    <div className="h-px bg-ink/12" />

                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-ink">{t('total')}</span>
                      <span className="font-display text-2xl text-ink">&euro;{subtotal.toFixed(2)}</span>
                    </div>

                    <Link
                      href="/"
                      className="block w-full rounded-full bg-button py-4 text-center text-base font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-button/85 hover:shadow-lg hover:shadow-button/25"
                    >
                      {t('checkout')}
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Summary on mobile ── */}
            <div className="paper-card mt-8 space-y-5 p-6 lg:hidden">
              <h2 className="font-display text-lg text-ink">{t('summary')}</h2>

              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{t('subtotal')}</span>
                <span className="text-ink">&euro;{subtotal.toFixed(2)}</span>
              </div>

              <div className="h-px bg-ink/12" />

              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-ink">{t('total')}</span>
                <span className="font-display text-2xl text-ink">&euro;{subtotal.toFixed(2)}</span>
              </div>

              <Link
                href="/"
                className="block w-full rounded-full bg-button py-4 text-center text-base font-medium uppercase tracking-wider text-ink transition-all duration-300 hover:bg-button/85 hover:shadow-lg hover:shadow-button/25"
              >
                {t('checkout')}
              </Link>
            </div>
          </>
        )}

        {/* ── Recently viewed — only for logged-in users ── */}
        {user && (
          <section className="mt-16 mb-8 space-y-5">
            <h2 className="font-display text-xl text-ink">{t('recentlyViewed')}</h2>

            <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-none">
              {recentItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/shop`}
                  className="group flex-shrink-0 w-40 space-y-3"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-paperMuted to-paper transition-transform duration-300 group-hover:scale-[1.02]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg viewBox="0 0 24 24" className="h-10 w-10 text-ink/10" fill="none" stroke="currentColor" strokeWidth="0.8">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-ink truncate">{item.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
