import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import type {ReactNode} from 'react';
import type {Locale} from '../i18n';
import FooterAccordion from './FooterAccordion';
import FooterLanguageSelect from './FooterLanguageSelect';
import FooterNewsletter from './FooterNewsletter';
import SocialIcons from './SocialIcons';

interface FooterEditorialProps {
  locale: Locale;
  // compact = true → используется внутри FooterSlide на mobile-shop, чтобы
  // длинное brand-эссе не съело "thank you"-панель.
  compact?: boolean;
}

interface FooterLink {
  key: string;
  href: string;
}

// Editorial 5-col footer used ONLY on the shop pages (inside FooterSlide).
// Every other route renders the lean 3-col `Footer` from the global layout.
export default async function FooterEditorial({
  locale,
  compact = false,
}: FooterEditorialProps) {
  const t = await getTranslations({locale, namespace: 'footer'});

  const shopLinks: FooterLink[] = [
    {key: 'all', href: `/${locale}/shop`},
    {key: 'dresses', href: `/${locale}/shop?category=dresses`},
    {key: 'outerwear', href: `/${locale}/shop?category=outerwear`},
    {key: 'knitwear', href: `/${locale}/shop?category=knitwear`},
    {key: 'blouses', href: `/${locale}/shop?category=blouses`},
    {key: 'skirts', href: `/${locale}/shop?category=skirts`},
    {key: 'trousers', href: `/${locale}/shop?category=trousers`},
    {key: 'blazers', href: `/${locale}/shop?category=tailoring`},
    {key: 'accessories', href: `/${locale}/shop?category=accessories`},
    {key: 'madeToOrder', href: `/${locale}/about#atelier`},
  ];

  const collectionLinks: FooterLink[] = [
    {key: 'spring26', href: `/${locale}/collections#spring`},
    {key: 'resort', href: `/${locale}/collections#summer`},
    {key: 'archive', href: `/${locale}/collections`},
    {key: 'lookbook', href: `/${locale}/lookbook`},
  ];

  const careLinks: FooterLink[] = [
    {key: 'shipping', href: `/${locale}/care#shipping`},
    {key: 'returns', href: `/${locale}/care#returns`},
    {key: 'sizeGuide', href: `/${locale}/care#size-guide`},
    {key: 'garmentCare', href: `/${locale}/care`},
    {key: 'contact', href: `/${locale}/contact`},
    {key: 'faq', href: `/${locale}/care#faq`},
  ];

  return (
    <footer className="relative z-30 border-t border-[#D4A574]/10 bg-[#1a0f0a]">
      <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
        {/* ─────────── Brand band ─────────── */}
        <div className="border-b border-[#F2E6D8]/[0.06] py-8 lg:py-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex items-center gap-2.5">
              <img
                src="/logos/icon-white.svg"
                alt=""
                aria-hidden="true"
                className="brand-asset h-7 w-7"
                draggable="false"
              />
              <img
                src="/logos/name-white.svg"
                alt="REINASLEO"
                className="brand-asset h-3"
                draggable="false"
              />
            </div>
            <p className="max-w-[460px] text-[13px] leading-relaxed text-[#F2E6D8]/65">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* ─────────── Desktop: 5 columns on grid-cols-12 ─────────── */}
        <div className="hidden py-12 lg:block lg:py-14">
          <div className="grid grid-cols-12 gap-x-8 gap-y-10">
            {/* Atelier — 3/12 */}
            <div className="col-span-3">
              <FooterColTitle>{t('brand.title')}</FooterColTitle>
              {!compact && (
                <p className="mt-4 text-[13px] leading-[1.7] text-[#F2E6D8]/55">
                  {t('brand.essay')}
                </p>
              )}
              <p className="mt-5 font-accent text-[10px] uppercase tracking-[0.25em] text-[#F2E6D8]/65">
                {t('brand.tag')}
              </p>
              <Link
                href={`/${locale}/about`}
                className="mt-3 inline-flex items-center gap-1.5 font-accent text-[11px] uppercase tracking-[0.25em] text-[#D4A574] transition-colors duration-200 hover:text-[#F2E6D8]"
                prefetch
              >
                {t('brand.cta')}
                <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Shop — 2/12 */}
            <div className="col-span-2">
              <FooterColTitle>{t('columns.shop')}</FooterColTitle>
              <FooterLinkList items={shopLinks} translateKey="shopLinks" t={t} />
            </div>

            {/* Collections — 2/12 */}
            <div className="col-span-2">
              <FooterColTitle>{t('columns.collections')}</FooterColTitle>
              <FooterLinkList
                items={collectionLinks}
                translateKey="collectionLinks"
                t={t}
              />
            </div>

            {/* Care — 2/12 */}
            <div className="col-span-2">
              <FooterColTitle>{t('columns.care')}</FooterColTitle>
              <FooterLinkList items={careLinks} translateKey="care" t={t} />
            </div>

            {/* Newsletter — 3/12 */}
            <div className="col-span-3">
              <FooterColTitle>{t('columns.newsletter')}</FooterColTitle>
              <p className="mt-4 text-[13px] leading-[1.6] text-[#F2E6D8]/55">
                {t('newsletter.description')}
              </p>
              <div className="mt-5">
                <FooterNewsletter locale={locale} />
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-[#F2E6D8]/55">
                {t('newsletter.disclaimer')}{' '}
                <Link
                  href={`/${locale}/privacy`}
                  className="text-[#F2E6D8]/65 underline-offset-4 hover:underline"
                  prefetch
                >
                  {t('newsletter.privacyLink')}
                </Link>
                .
              </p>
              <div className="mt-6 flex items-center gap-4">
                <SocialIcons />
                <span className="ml-auto" />
                <FooterLanguageSelect currentLocale={locale} />
              </div>
            </div>
          </div>
        </div>

        {/* ─────────── Mobile: stacked + accordions ─────────── */}
        <div className="space-y-4 py-6 lg:hidden">
          {/* Atelier — always visible */}
          <div className="border-b border-[#F2E6D8]/[0.06] pb-5">
            <FooterColTitle>{t('brand.title')}</FooterColTitle>
            {!compact && (
              <p className="mt-3 text-[13px] leading-[1.7] text-[#F2E6D8]/55">
                {t('brand.essay')}
              </p>
            )}
            <p className="mt-3 font-accent text-[10px] uppercase tracking-[0.25em] text-[#F2E6D8]/65">
              {t('brand.tag')}
            </p>
            <Link
              href={`/${locale}/about`}
              className="mt-3 inline-flex items-center gap-1.5 font-accent text-[11px] uppercase tracking-[0.25em] text-[#D4A574]"
              prefetch
            >
              {t('brand.cta')} <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Newsletter — always expanded on mobile (главный CTA) */}
          <div className="border-b border-[#F2E6D8]/[0.06] pb-5">
            <FooterColTitle>{t('columns.newsletter')}</FooterColTitle>
            <p className="mt-3 text-[13px] leading-[1.6] text-[#F2E6D8]/55">
              {t('newsletter.description')}
            </p>
            <div className="mt-4">
              <FooterNewsletter locale={locale} />
            </div>
          </div>

          <FooterAccordion title={t('columns.shop')}>
            <FooterLinkList items={shopLinks} translateKey="shopLinks" t={t} />
          </FooterAccordion>

          <FooterAccordion title={t('columns.collections')}>
            <FooterLinkList
              items={collectionLinks}
              translateKey="collectionLinks"
              t={t}
            />
          </FooterAccordion>

          <FooterAccordion title={t('columns.care')}>
            <FooterLinkList items={careLinks} translateKey="care" t={t} />
          </FooterAccordion>

          <div className="flex items-center justify-between pt-3">
            <SocialIcons />
            <FooterLanguageSelect currentLocale={locale} />
          </div>
        </div>

        {/* ─────────── Bottom band ─────────── */}
        <div className="border-t border-[#F2E6D8]/[0.06] py-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-1 text-[#F2E6D8]/65 lg:flex-row lg:items-center lg:gap-3">
              <p className="text-[12px]">{t('rights')}</p>
              <span className="hidden text-[#F2E6D8]/15 lg:inline">·</span>
              <p className="text-[11px] text-[#F2E6D8]/55">{t('legalEntity')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-accent text-[10px] uppercase tracking-[0.25em] text-[#F2E6D8]/65">
                {t('payments.title')}
              </span>
              <span className="text-[11px] text-[#F2E6D8]/70">
                {t('payments.methods')}
              </span>
              <span className="text-[#F2E6D8]/15">·</span>
              <Link
                href={`/${locale}/privacy`}
                className="text-[12px] text-[#F2E6D8]/65 transition-colors hover:text-[#F2E6D8]/80"
                prefetch
              >
                {t('privacy')}
              </Link>
              <span className="text-[#F2E6D8]/15">·</span>
              <Link
                href={`/${locale}/terms`}
                className="text-[12px] text-[#F2E6D8]/65 transition-colors hover:text-[#F2E6D8]/80"
                prefetch
              >
                {t('terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────── helpers ─────────── */

function FooterColTitle({children}: {children: ReactNode}) {
  return (
    <h3 className="block font-accent text-[11px] uppercase tracking-[0.3em] text-[#D4A574]">
      {children}
    </h3>
  );
}

interface FooterLinkListProps {
  items: FooterLink[];
  translateKey: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}

function FooterLinkList({items, translateKey, t}: FooterLinkListProps) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map(({key, href}) => (
        <li key={key}>
          <Link
            href={href}
            className="block text-[13px] text-[#F2E6D8]/55 transition-colors duration-200 hover:text-[#D4A574]"
            prefetch
          >
            {t(`${translateKey}.${key}`)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

