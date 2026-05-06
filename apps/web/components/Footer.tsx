import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import type {ReactNode} from 'react';
import type {Locale} from '../i18n';
import FooterAccordion from './FooterAccordion';
import FooterLanguageSelect from './FooterLanguageSelect';
import FooterNewsletter from './FooterNewsletter';

interface FooterProps {
  locale: Locale;
  // compact = true → используется внутри FooterSlide на mobile-shop, чтобы
  // длинное brand-эссе не съело "thank you"-панель.
  compact?: boolean;
}

interface FooterLink {
  key: string;
  href: string;
}

export default async function Footer({locale, compact = false}: FooterProps) {
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
            <p className="max-w-[460px] text-[13px] leading-relaxed text-[#F2E6D8]/45">
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
              <p className="mt-5 font-accent text-[10px] uppercase tracking-[0.25em] text-[#F2E6D8]/35">
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
              <p className="mt-3 text-[11px] leading-relaxed text-[#F2E6D8]/30">
                {t('newsletter.disclaimer')}{' '}
                <Link
                  href={`/${locale}/privacy`}
                  className="text-[#F2E6D8]/45 underline-offset-4 hover:underline"
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
            <p className="mt-3 font-accent text-[10px] uppercase tracking-[0.25em] text-[#F2E6D8]/35">
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
            <div className="flex flex-col gap-1 text-[#F2E6D8]/35 lg:flex-row lg:items-center lg:gap-3">
              <p className="text-[12px]">{t('rights')}</p>
              <span className="hidden text-[#F2E6D8]/15 lg:inline">·</span>
              <p className="text-[11px] text-[#F2E6D8]/25">{t('legalEntity')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-accent text-[10px] uppercase tracking-[0.25em] text-[#F2E6D8]/35">
                {t('payments.title')}
              </span>
              <span className="text-[11px] text-[#F2E6D8]/40">
                {t('payments.methods')}
              </span>
              <span className="text-[#F2E6D8]/15">·</span>
              <Link
                href={`/${locale}/privacy`}
                className="text-[12px] text-[#F2E6D8]/35 transition-colors hover:text-[#F2E6D8]/60"
                prefetch
              >
                {t('privacy')}
              </Link>
              <span className="text-[#F2E6D8]/15">·</span>
              <Link
                href={`/${locale}/terms`}
                className="text-[12px] text-[#F2E6D8]/35 transition-colors hover:text-[#F2E6D8]/60"
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
    <span className="block font-accent text-[11px] uppercase tracking-[0.3em] text-[#D4A574]/65">
      {children}
    </span>
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

function SocialIcons() {
  return (
    <div className="flex items-center gap-3">
      <a
        href="https://www.instagram.com/reinasleo"
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
        className="text-[#F2E6D8]/40 transition-colors duration-200 hover:text-[#D4A574]"
      >
        <svg
          className="h-[18px] w-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      </a>
      <a
        href="https://t.me/reinasleo_store"
        target="_blank"
        rel="noreferrer"
        aria-label="Telegram"
        className="text-[#F2E6D8]/40 transition-colors duration-200 hover:text-[#D4A574]"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      </a>
      <a
        href="https://vk.com/reinasleo"
        target="_blank"
        rel="noreferrer"
        aria-label="VKontakte"
        className="text-[#F2E6D8]/40 transition-colors duration-200 hover:text-[#D4A574]"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
        </svg>
      </a>
    </div>
  );
}
