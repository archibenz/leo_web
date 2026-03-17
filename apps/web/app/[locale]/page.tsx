import {getTranslations} from 'next-intl/server';
import HeroShaderBackgroundClient from '../../components/HeroShaderBackgroundClient';
import BlurReveal from '../../components/BlurReveal';

import CollectionShowcase from '../../components/CollectionShowcase';
import HomeSections from '../../components/HomeSections';
import type {Locale} from '../../i18n';

type Props = {
  params: Promise<{locale: Locale}>;
};

export default async function HomePage({params}: Props) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'home'});

  const showcaseItems = t.raw('showcase.items') as {slug: string; label: string; description: string}[];
  const heroSeason = t('showcase.heroSeason');
  const categories = t.raw('categories.items') as {key: string; label: string; description: string}[];
  const popularItems = t.raw('popular.items') as {slug: string; label: string; description: string}[];

  return (
    <div className="relative">
      {/* FIXED FULL-VIEWPORT SHADER BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <HeroShaderBackgroundClient />
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="relative z-10">
        {/* HERO SECTION — transparent, shader visible behind */}
        <section className="relative" style={{minHeight: '150vh'}}>
          {/* Screen 1: Centered brand */}
          <div className="flex min-h-screen flex-col items-center justify-center px-6 py-32 text-center lg:py-40">
            <BlurReveal delay={200} duration={1200} blur={16} translateY={0}>
              <img
                src="/logos/logo-white.svg"
                alt="REINASLEO"
                className="brand-asset h-auto w-72 max-w-[85vw] md:w-96 lg:w-[480px] drop-shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
                draggable="false"
              />
            </BlurReveal>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[2]">
            <BlurReveal delay={2000} duration={1000} blur={8} translateY={12}>
              <div className="flex flex-col items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  {t('scrollHint')}
                </span>
                <svg className="h-4 w-4 text-white/30 animate-scroll-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </BlurReveal>
          </div>

          {/* Transition fade: transparent → semi-transparent overlay */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[35vh]"
            style={{
              background:
                'linear-gradient(to bottom, transparent 0%, rgba(43,23,17,0.3) 40%, rgba(43,23,17,0.6) 70%, rgba(43,23,17,0.85) 100%)'
            }}
            aria-hidden="true"
          />
        </section>

        {/* NEW ARRIVALS — full-bleed hero + item grid */}
        <CollectionShowcase
          locale={locale}
          heroTitle={t('showcase.heroTitle')}
          heroSubtitle={t('showcase.heroSubtitle')}
          heroSeason={heroSeason}
          items={showcaseItems}
        />

        {/* SHOP HERO + CATEGORIES + POPULAR */}
        <HomeSections
          locale={locale}
          shopHeroTitle={t('shopHero.title')}
          shopHeroSubtitle={t('shopHero.subtitle')}
          categoriesTitle={t('categories.title')}
          categories={categories}
          popularTitle={t('popular.title')}
          popularItems={popularItems}
        />
      </div>
    </div>
  );
}
