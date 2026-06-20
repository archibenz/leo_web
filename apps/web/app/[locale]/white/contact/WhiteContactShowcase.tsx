'use client';

import {createPortal} from 'react-dom';
import {useTranslations} from 'next-intl';
import {useWhitePortal} from '../../../../hooks/useWhitePortal';
import {useWhiteBag} from '../../../../hooks/useWhiteBag';
import {useWhiteFavourites} from '../../../../hooks/useWhiteFavourites';
import WhiteHeader from '../WhiteHeader';
import WhiteHeaderActions from '../WhiteHeaderActions';
import WhiteFooter from '../WhiteFooter';
import {INK, MUTED, HAIR, SIGNAL} from '../wv-palette';

// Variant 2 "White" — Contact. Direct channels (the real ones the gradient
// /contact uses) in the White DNA: a large statement, a response-time note, and
// clean hairline rows that go straight to email / Telegram / VK. No form — the
// prototype points at real inboxes rather than posting to a stub. CSS-only
// reveal (wv-rise, reduced-motion-safe).

const CHANNELS = [
  {key: 'email', label: 'Email', value: 'reinasleo@gmail.com', href: 'mailto:reinasleo@gmail.com'},
  {key: 'telegram', label: 'Telegram', value: '@reinasleo', href: 'https://t.me/reinasleo'},
  {key: 'vk', label: 'VK', value: 'vk.com/reinasleo', href: 'https://vk.com/reinasleo'},
];

export default function WhiteContactShowcase({locale}: {locale: string}) {
  const mounted = useWhitePortal();
  const {count} = useWhiteBag();
  const {count: favCount} = useWhiteFavourites();
  const t = useTranslations('white.contact');

  if (!mounted) return null;

  return createPortal(
    <div className="wv-root fixed inset-0 z-[1000] flex min-h-full flex-col overflow-y-auto bg-white font-sans antialiased" style={{color: INK}}>
      <WhiteHeader
        locale={locale}
        left={
          <a href={`/${locale}/white`} className="text-[12px] uppercase tracking-[0.18em] transition-opacity hover:opacity-60" style={{color: MUTED}}>
            ← {t('back')}
          </a>
        }
        right={<WhiteHeaderActions locale={locale} favCount={favCount} count={count} />}
      />

      <main id="wv-main" tabIndex={-1} style={{outline: 'none'}} className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-20 sm:px-10 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
          <div className="wv-rise">
            <p className="mb-7 text-[11px] uppercase tracking-[0.32em]" style={{color: MUTED}}>{t('eyebrow')}</p>
            <h1 className="font-display text-[clamp(44px,calc(3.6vw_+_30px),72px)] font-light leading-[0.95] tracking-[-0.01em]">{t('title')}</h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed" style={{color: MUTED}}>{t('intro')}</p>
            <p className="mt-4 max-w-md text-[13px] leading-relaxed" style={{color: MUTED}}>{t('responseTime')}</p>
          </div>

          <div className="wv-rise wv-delay-1 border-t" style={{borderColor: HAIR}}>
            {CHANNELS.map((c) => (
              <a
                key={c.key}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-baseline justify-between border-b py-5 transition-colors"
                style={{borderColor: HAIR}}
              >
                <span className="text-[12px] uppercase tracking-[0.2em]" style={{color: MUTED}}>{c.label}</span>
                <span
                  className="font-display text-[20px] font-light tracking-tight transition-colors group-hover:opacity-70 sm:text-[24px]"
                  style={{color: INK}}
                >
                  {c.value}
                </span>
              </a>
            ))}
            <p className="mt-7 text-[11px] uppercase tracking-[0.16em]" style={{color: SIGNAL}}>
              REINASLEO · {t('eyebrow')}
            </p>
          </div>
        </div>
      </main>

      <WhiteFooter locale={locale} />
    </div>,
    document.body,
  );
}
