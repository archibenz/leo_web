import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import HeroShaderBackgroundClient from '../../components/HeroShaderBackgroundClient';
import BlurReveal from '../../components/BlurReveal';

import ScrollHint from '../../components/ScrollHint';
import CollectionShowcase from '../../components/CollectionShowcase';
import HomeSections from '../../components/HomeSections';
import type {Locale} from '../../i18n';

type Props = {
  params: Promise<{locale: Locale}>;
};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    // Title intentionally omitted — falls through to layout default "REINASLEO · Atelier"
    description: isRu
      ? 'Премиальная женская одежда: скульптурные силуэты, ручная работа, эксклюзивные коллекции.'
      : 'Premium womenswear with sculpted silhouettes, precision craftsmanship, and editorial storytelling.',
    alternates: {
      canonical: `/${locale}`,
      languages: {en: '/en', ru: '/ru'},
    },
  };
}

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
          <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-32 text-center lg:py-40">
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
          <ScrollHint text={t('scrollHint')} heroVh={1.5} />

          {/* Mobile: hard-cut solid brown strip at the bottom of the hero.
              Any gradient transition here showed a visible two-tone band because
              the animated shader leaks through partial opacity with different
              colors in different places. Hard cut = clean edge, no bleed. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[30vh] sm:hidden"
            style={{background: '#2B1711'}}
            aria-hidden="true"
          />
          {/* Desktop: subtle fade lets shader blend smoothly into content below */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[35vh] hidden sm:block"
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
