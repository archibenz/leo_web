import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import type {Locale} from '../i18n';
import FooterLanguageSelect from './FooterLanguageSelect';

type FooterProps = {
  locale: Locale;
};

export default async function Footer({locale}: FooterProps) {
  const t = await getTranslations({locale, namespace: 'footer'});
  const nav = await getTranslations({locale, namespace: 'nav'});

  const navItems = [
    {label: nav('about'), href: `/${locale}/about`},
    {label: nav('shop'), href: `/${locale}/shop`},
    {label: nav('contact'), href: `/${locale}/contact`},
  ];

  return (
    <footer className="relative z-30 border-t border-[#D4A574]/10 bg-[#1a0f0a]">
      {/* ── Desktop ── */}
      <div className="hidden sm:block">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          {/* Main row: 3 columns */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-8 py-10 lg:py-14">
            {/* Left: Brand + tagline */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logos/icon-white.svg"
                  alt=""
                  aria-hidden="true"
                  className="brand-asset h-8 w-8"
                  draggable="false"
                />
                <img
                  src="/logos/name-white.svg"
                  alt="REINASLEO"
                  className="brand-asset h-3.5"
                  draggable="false"
                />
              </div>
              <p className="max-w-[260px] text-[15px] leading-relaxed text-[#F2E6D8]/40">
                {t('tagline')}
              </p>
              <p className="text-[14px] leading-relaxed text-[#F2E6D8]/25">
                {t('studio')}
              </p>
            </div>

            {/* Center: Navigation */}
            <nav className="flex flex-col items-center gap-3 pt-1">
              <span className="font-accent text-[12px] uppercase tracking-[0.2em] text-[#D4A574]/40">
                {locale === 'ru' ? 'Навигация' : 'Navigate'}
              </span>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-display text-[16px] uppercase tracking-[0.12em] text-[#F2E6D8]/60 transition-colors duration-200 hover:text-[#D4A574]"
                  prefetch
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: Contact + social */}
            <div className="flex flex-col items-end gap-3 pt-1">
              <span className="font-accent text-[12px] uppercase tracking-[0.2em] text-[#D4A574]/40">
                {locale === 'ru' ? 'Связь' : 'Connect'}
              </span>
              <Link
                href={`mailto:${t('email')}`}
                className="text-[16px] text-[#F2E6D8]/60 transition-colors duration-200 hover:text-[#D4A574]"
              >
                {t('email')}
              </Link>

              {/* Social icons */}
              <div className="flex items-center gap-3">
                <Link
                  href="https://www.instagram.com/reinasleo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#F2E6D8]/40 transition-colors duration-200 hover:text-[#D4A574]"
                  aria-label="Instagram"
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </Link>
                <Link
                  href="https://t.me/reinasleo_store"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#F2E6D8]/40 transition-colors duration-200 hover:text-[#D4A574]"
                  aria-label="Telegram"
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </Link>
                <Link
                  href="https://vk.com/reinasleo"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#F2E6D8]/40 transition-colors duration-200 hover:text-[#D4A574]"
                  aria-label="VKontakte"
                >
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/>
                  </svg>
                </Link>
              </div>

              <FooterLanguageSelect currentLocale={locale} />
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-[#F2E6D8]/[0.06] py-5">
            <p className="text-[13px] text-[#F2E6D8]/25">{t('rights')}</p>
            <div className="flex items-center gap-5 text-[13px] text-[#F2E6D8]/25">
              <Link href={`/${locale}/privacy`} className="transition-colors hover:text-[#F2E6D8]/50" prefetch>
                {t('privacy')}
              </Link>
              <span className="text-[#F2E6D8]/10">·</span>
              <Link href={`/${locale}/terms`} className="transition-colors hover:text-[#F2E6D8]/50" prefetch>
                {t('terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile ── */}
      <div className="sm:hidden">
        <div className="px-5 py-8 space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img
              src="/logos/icon-white.svg"
              alt=""
              aria-hidden="true"
              className="brand-asset h-6 w-6"
              draggable="false"
            />
            <img
              src="/logos/name-white.svg"
              alt="REINASLEO"
              className="brand-asset h-2.5"
              draggable="false"
            />
          </div>

          <p className="text-[14px] leading-relaxed text-[#F2E6D8]/35">
            {t('tagline')}
          </p>

          {/* Nav + Contact side by side */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <span className="font-accent text-[12px] uppercase tracking-[0.2em] text-[#D4A574]/40">
                {locale === 'ru' ? 'Навигация' : 'Navigate'}
              </span>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-[15px] text-[#F2E6D8]/55 transition hover:text-[#D4A574]"
                  prefetch
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="space-y-2.5">
              <span className="font-accent text-[12px] uppercase tracking-[0.2em] text-[#D4A574]/40">
                {locale === 'ru' ? 'Связь' : 'Connect'}
              </span>
              <Link
                href={`mailto:${t('email')}`}
                className="block text-[15px] text-[#F2E6D8]/55 transition hover:text-[#D4A574]"
              >
                {t('email')}
              </Link>
              <div className="flex items-center gap-3 pt-1">
                <Link href="https://www.instagram.com/reinasleo" target="_blank" rel="noreferrer" className="text-[#F2E6D8]/40 transition hover:text-[#D4A574]" aria-label="Instagram">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
                </Link>
                <Link href="https://t.me/reinasleo_store" target="_blank" rel="noreferrer" className="text-[#F2E6D8]/40 transition hover:text-[#D4A574]" aria-label="Telegram">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                </Link>
                <Link href="https://vk.com/reinasleo" target="_blank" rel="noreferrer" className="text-[#F2E6D8]/40 transition hover:text-[#D4A574]" aria-label="VKontakte">
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.27-1.422 2.18-3.61 2.18-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/></svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Language + legal */}
          <div className="flex items-center justify-between pt-2 border-t border-[#F2E6D8]/[0.06]">
            <div className="flex items-center gap-3 text-[12px] text-[#F2E6D8]/25">
              <Link href={`/${locale}/privacy`} className="transition hover:text-[#F2E6D8]/50" prefetch>
                {t('privacy')}
              </Link>
              <span className="text-[#F2E6D8]/10">·</span>
              <Link href={`/${locale}/terms`} className="transition hover:text-[#F2E6D8]/50" prefetch>
                {t('terms')}
              </Link>
            </div>
            <FooterLanguageSelect currentLocale={locale} />
          </div>

          <p className="text-[12px] text-[#F2E6D8]/20">{t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
