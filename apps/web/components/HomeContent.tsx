'use client';

import {type ReactNode} from 'react';
import Image from 'next/image';
import HeroShaderBackgroundClient from './HeroShaderBackgroundClient';
import BlurReveal from './BlurReveal';
import ScrollHint from './ScrollHint';
import CollectionShowcase from './CollectionShowcase';
import HomeSections from './HomeSections';
import type {Locale} from '../i18n';

interface ShowcaseItem { slug: string; label: string; description: string; }
interface CategoryItem { key: string; label: string; description: string; }
interface PopularItem { slug: string; label: string; description: string; }

interface HomeContentProps {
  locale: Locale;
  scrollHint: string;
  showcaseHeroTitle: string;
  showcaseHeroSubtitle: string;
  showcaseHeroSeason: string;
  showcaseItems: ShowcaseItem[];
  shopHeroTitle: string;
  shopHeroSubtitle: string;
  categoriesTitle: string;
  categories: CategoryItem[];
  popularTitle: string;
  popularItems: PopularItem[];
}

const BANNER_BG = '#1a0f0b';
// Mobile base trimmed from desktop-scale values (pt-32/pb-28 etc. left a ~240px
// dead gap between sections at 375px, padding > content). sm:/lg: keep the
// original generous desktop rhythm untouched.
const SECTION_PADDING = 'pt-20 pb-16 sm:pt-40 sm:pb-32 lg:pt-48 lg:pb-40';
const CAROUSEL_PADDING = 'py-16 sm:py-36 lg:py-44';
const BANNER_OUTER_PADDING = 'py-12 sm:py-28 lg:py-36';

// Banner sits on a solid #1a0f0b island so the fixed shader behind doesn't
// bleed through the photo edges. Outer padding gives generous breathing room
// where the shader is visible — the "interruption" the brand reads as a chapter
// break between the hero, banner, and product rows.
function wrapBanner(banner: ReactNode) {
  return (
    <div className={`relative ${BANNER_OUTER_PADDING}`}>
      <div className="relative" style={{background: BANNER_BG}}>
        {banner}
      </div>
    </div>
  );
}

export default function HomeContent({
  locale,
  scrollHint,
  showcaseHeroTitle,
  showcaseHeroSubtitle,
  showcaseHeroSeason,
  showcaseItems,
  shopHeroTitle,
  shopHeroSubtitle,
  categoriesTitle,
  categories,
  popularTitle,
  popularItems,
}: HomeContentProps) {
  return (
    <div className="relative">
      <div className="fixed inset-0 z-0 ios-safari-dvh">
        <HeroShaderBackgroundClient />
      </div>

      <div className="relative z-10">
        <section className="relative" style={{minHeight: '150vh'}}>
          <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-32 text-center lg:py-40">
            {/* Page h1 — the brand hero is an image, so the document's main
                heading lives here for screen readers + SEO (visually hidden). */}
            <h1 className="sr-only">{locale === 'ru' ? 'REINASLEO — премиальная женская одежда' : 'REINASLEO — premium womenswear'}</h1>
            <BlurReveal delay={200} duration={1200} blur={16} translateY={0}>
              {/* next/image with priority emits a <link rel="preload"> ahead of
                  render — beats a raw <img fetchpriority="high"> which only the
                  browser scanner picks up. LCP candidate on the home page. */}
              <Image
                src="/logos/logo-white.svg"
                alt="REINASLEO"
                width={480}
                height={120}
                priority
                unoptimized
                className="brand-asset h-auto w-72 max-w-[85vw] md:w-96 lg:w-[480px] drop-shadow-[0_4px_32px_rgba(0,0,0,0.5)]"
                draggable={false}
              />
            </BlurReveal>
          </div>
          <ScrollHint text={scrollHint} heroVh={1.5} />
        </section>

        <CollectionShowcase
          locale={locale}
          heroTitle={showcaseHeroTitle}
          heroSubtitle={showcaseHeroSubtitle}
          heroSeason={showcaseHeroSeason}
          items={showcaseItems}
          bgMode="transparent"
          carouselClassName={`relative w-full ${CAROUSEL_PADDING}`}
          bannerWrapper={wrapBanner}
        />

        <HomeSections
          locale={locale}
          shopHeroTitle={shopHeroTitle}
          shopHeroSubtitle={shopHeroSubtitle}
          categoriesTitle={categoriesTitle}
          categories={categories}
          popularTitle={popularTitle}
          popularItems={popularItems}
          bgMode="transparent"
          categoriesSectionClassName={`px-6 sm:px-10 lg:px-16 ${SECTION_PADDING}`}
          popularSectionClassName={`px-6 sm:px-10 lg:px-16 ${SECTION_PADDING}`}
          shopBannerWrapper={wrapBanner}
        />
      </div>
    </div>
  );
}
