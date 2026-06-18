import Link from 'next/link';
import {getTranslations} from 'next-intl/server';
import type {Locale} from '../i18n';
import FooterLanguageSelect from './FooterLanguageSelect';
import SocialIcons from './SocialIcons';

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
    <footer className="relative z-50 border-t border-accent/10 bg-[#1a0f0a]">
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
              <p className="max-w-[260px] text-[15px] leading-relaxed text-inkSoft/65">
                {t('tagline')}
              </p>
            </div>

            {/* Center: Navigation */}
            <nav className="flex flex-col items-center gap-3 pt-1">
              <span className="font-accent text-[12px] uppercase tracking-[0.2em] text-accent/40">
                {t('navigate')}
              </span>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-display text-[16px] uppercase tracking-[0.12em] text-inkSoft/60 transition-colors duration-200 hover:text-accent"
                  prefetch
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Right: Contact + social */}
            <div className="flex flex-col items-end gap-3 pt-1">
              <span className="font-accent text-[12px] uppercase tracking-[0.2em] text-accent/40">
                {t('connect')}
              </span>
              <Link
                href={`mailto:${t('email')}`}
                className="text-[16px] text-inkSoft/60 transition-colors duration-200 hover:text-accent"
              >
                {t('email')}
              </Link>

              {/* Social icons */}
              <SocialIcons />

              <FooterLanguageSelect currentLocale={locale} />
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-inkSoft/[0.06] py-5">
            <p className="text-[13px] text-inkSoft/65">{t('rights')}</p>
            <div className="flex items-center gap-5 text-[13px] text-inkSoft/65">
              <Link href={`/${locale}/delivery`} className="transition-colors hover:text-inkSoft/90" prefetch>
                {t('delivery')}
              </Link>
              <span className="text-inkSoft/30">·</span>
              <Link href={`/${locale}/offer`} className="transition-colors hover:text-inkSoft/90" prefetch>
                {t('offer')}
              </Link>
              <span className="text-inkSoft/30">·</span>
              <Link href={`/${locale}/privacy`} className="transition-colors hover:text-inkSoft/90" prefetch>
                {t('privacy')}
              </Link>
              <span className="text-inkSoft/30">·</span>
              <Link href={`/${locale}/terms`} className="transition-colors hover:text-inkSoft/90" prefetch>
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

          <p className="text-[14px] leading-relaxed text-inkSoft/65">
            {t('tagline')}
          </p>

          {/* Nav + Contact side by side */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2.5">
              <span className="font-accent text-[12px] uppercase tracking-[0.2em] text-accent/40">
                {t('navigate')}
              </span>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-[15px] text-inkSoft/55 transition hover:text-accent"
                  prefetch
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="space-y-2.5">
              <span className="font-accent text-[12px] uppercase tracking-[0.2em] text-accent/40">
                {t('connect')}
              </span>
              <Link
                href={`mailto:${t('email')}`}
                className="block text-[15px] text-inkSoft/55 transition hover:text-accent"
              >
                {t('email')}
              </Link>
              <SocialIcons className="pt-1" />
            </div>
          </div>

          {/* Language + legal */}
          <div className="flex items-center justify-between pt-2 border-t border-inkSoft/[0.06]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-inkSoft/65">
              <Link href={`/${locale}/delivery`} className="transition hover:text-inkSoft/90" prefetch>
                {t('delivery')}
              </Link>
              <span className="text-inkSoft/30">·</span>
              <Link href={`/${locale}/offer`} className="transition hover:text-inkSoft/90" prefetch>
                {t('offer')}
              </Link>
              <span className="text-inkSoft/30">·</span>
              <Link href={`/${locale}/privacy`} className="transition hover:text-inkSoft/90" prefetch>
                {t('privacy')}
              </Link>
              <span className="text-inkSoft/30">·</span>
              <Link href={`/${locale}/terms`} className="transition hover:text-inkSoft/90" prefetch>
                {t('terms')}
              </Link>
            </div>
            <FooterLanguageSelect currentLocale={locale} />
          </div>

          <p className="text-[12px] text-inkSoft/65">{t('rights')}</p>
        </div>
      </div>

    </footer>
  );
}
