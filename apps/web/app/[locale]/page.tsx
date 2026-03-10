import {getTranslations} from 'next-intl/server';
import HeroShaderBackgroundClient from '../../components/HeroShaderBackgroundClient';
import BlurReveal from '../../components/BlurReveal';
import PhilosophyContent from '../../components/PhilosophyContent';
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
        <section className="relative" style={{minHeight: '200vh'}}>
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

          {/* Screen 2: Editorial Philosophy — scroll-driven title split */}
          <PhilosophyContent
            locale={locale}
            eyebrow={t('philosophy.eyebrow')}
            title={t('philosophy.title')}
            statements={t.raw('philosophy.statements') as string[]}
            editorialCard={{
              quote: t('philosophy.editorialCard.quote'),
              label: t('philosophy.editorialCard.label'),
              title: t('philosophy.editorialCard.title'),
              description: t('philosophy.editorialCard.description'),
              cta: t('philosophy.editorialCard.cta'),
            }}
            qualityMarks={t.raw('qualityMarks') as string[]}
          />

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
