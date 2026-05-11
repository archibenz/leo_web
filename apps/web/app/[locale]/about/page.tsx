import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import {Hammer, Heart, Sparkles} from 'lucide-react';
import type {Locale} from '../../../i18n';
import BlurReveal from '../../../components/BlurReveal';
import HeroShaderBackgroundClient from '../../../components/HeroShaderBackgroundClient';

type Props = {params: Promise<{locale: Locale}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'О бренде' : 'About',
    description: isRu
      ? 'REINASLEO — премиальная женская одежда. Философия, мастерство, история бренда.'
      : 'REINASLEO — premium womenswear. Philosophy, craftsmanship, and brand story.',
    alternates: {
      canonical: `/${locale}/about`,
      languages: {en: '/en/about', ru: '/ru/about'},
    },
  };
}

export default async function AboutPage({params}: Props) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'about'});

  const processSteps = [
    {n: 1, image: '/images/shop/silk-shimmer.jpg', title: t('process.step1title'), text: t('process.step1text')},
    {n: 2, image: '/images/shop/knit-cozy.jpg', title: t('process.step2title'), text: t('process.step2text')},
    {n: 3, image: '/images/shop/full-figure.jpg', title: t('process.step3title'), text: t('process.step3text')},
  ];

  const editorialPhotos = [
    {src: '/images/shop/editorial-clean.jpg', span: 'md:col-span-5 md:row-span-2'},
    {src: '/images/shop/silk-camisole.jpg', span: 'md:col-span-4'},
    {src: '/images/shop/wool-coat.jpg', span: 'md:col-span-3'},
    {src: '/images/shop/column-dress.jpg', span: 'md:col-span-3'},
    {src: '/images/shop/wrap-dress.jpg', span: 'md:col-span-4'},
  ];

  return (
    <div className="min-h-screen">
      {/* ── S1: Hero — cinematic logo reveal ── */}
      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden">
        <HeroShaderBackgroundClient />
        <div
          className="absolute inset-x-0 bottom-0 z-[5] h-64"
          style={{background: 'linear-gradient(to bottom, transparent, #1E120D)'}}
        />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <p className="capsule-tag mb-8">{t('tag')}</p>
          <img
            src="/logos/logo-white.svg"
            alt={t('hero.title')}
            loading="eager"
            fetchPriority="high"
            className="brand-asset mx-auto mb-6 h-auto w-72 max-w-[85vw] drop-shadow-[0_4px_32px_rgba(0,0,0,0.5)] md:w-96 lg:w-[520px]"
          />
          <BlurReveal delay={300}>
            <p className="editorial-italic text-xl leading-relaxed text-ink-soft md:text-2xl">
              {t('hero.subtitle')}
            </p>
            <div className="ribbon-line mx-auto mt-8 w-24" />
          </BlurReveal>
        </div>
      </section>

      {/* ── S2: Philosophy — magazine two-column ── */}
      <section className="relative mx-auto max-w-6xl px-6 py-24 lg:px-8">
        <p className="capsule-tag mb-8">{t('philosophy.tag')}</p>
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
          <BlurReveal mode="scroll" className="lg:col-span-5">
            <p
              className="font-display editorial-italic text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.05] text-accent"
            >
              {t('philosophy.pullQuote')}
            </p>
          </BlurReveal>
          <BlurReveal mode="scroll" className="lg:col-span-7">
            <h2 className="font-display heading-section mb-6 text-ink">
              {t('philosophy.title')}
            </h2>
            <p className="text-lg leading-relaxed text-ink-soft first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:font-medium first-letter:leading-[0.85] first-letter:text-accent">
              {t('philosophy.text')}
            </p>
          </BlurReveal>
        </div>
      </section>

      <div className="ribbon-line" />

      {/* ── S3: Концепция образов — vertical timeline ── */}
      <section className="mx-auto max-w-4xl px-6 py-24 lg:px-8">
        <p className="capsule-tag mb-4">{t('looks.tag')}</p>
        <h2 className="font-display heading-section mb-6 text-ink">{t('looks.title')}</h2>
        <p className="mb-12 max-w-2xl text-lg leading-relaxed text-ink-soft">{t('looks.text')}</p>

        <div
          className="relative pl-16 md:pl-24"
          style={{borderLeft: '2px solid rgba(212, 165, 116, 0.3)'}}
        >
          {([1, 2, 3] as const).map((n) => (
            <BlurReveal key={n} mode="scroll" className="relative pb-16 last:pb-0">
              <span
                className="absolute top-0 -left-[2.6rem] flex h-14 w-14 items-center justify-center rounded-full bg-paper font-display text-xl text-accent md:-left-[3.6rem]"
                style={{border: '1px solid rgba(212, 165, 116, 0.4)'}}
              >
                {String(n).padStart(2, '0')}
              </span>
              <p className="pt-3 text-lg leading-relaxed text-ink-soft">
                {t(`looks.point${n}`)}
              </p>
            </BlurReveal>
          ))}
        </div>
      </section>

      <div className="ribbon-line" />

      {/* ── S4: Процесс создания — horizontal snap-scroll → desktop grid ── */}
      <section className="mx-auto max-w-6xl py-24">
        <div className="px-6 lg:px-8">
          <p className="capsule-tag mb-4">{t('process.tag')}</p>
          <h2 className="font-display heading-section mb-12 text-ink">{t('process.title')}</h2>
        </div>

        <div className="-mx-6 overflow-x-auto scrollbar-none snap-x snap-mandatory px-6 motion-reduce:snap-none lg:overflow-visible lg:px-8">
          <div className="flex gap-6 lg:grid lg:grid-cols-3">
            {processSteps.map(({n, image, title, text}) => (
              <article
                key={n}
                className="paper-card relative min-w-[78vw] snap-center overflow-hidden sm:min-w-[60vw] lg:min-w-0"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={image}
                    alt={title}
                    fill
                    sizes="(max-width:1024px) 80vw, 33vw"
                    loading="lazy"
                    className="object-cover"
                  />
                </div>
                <div className="relative p-6">
                  <span
                    className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full font-display text-base text-accent"
                    style={{border: '1px solid rgba(212, 165, 116, 0.4)'}}
                  >
                    {String(n).padStart(2, '0')}
                  </span>
                  <h3 className="font-display mb-3 text-xl text-ink">{title}</h3>
                  <p className="text-sm leading-relaxed text-ink-soft">{text}</p>
                </div>
                <img
                  src="/logos/icon-white.svg"
                  alt=""
                  aria-hidden
                  className="brand-asset pointer-events-none absolute bottom-4 right-4 w-10"
                  style={{opacity: 0.06}}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="ribbon-line" />

      {/* ── S5: Ценности — bento ── */}
      <section className="mx-auto max-w-6xl px-6 py-24 lg:px-8">
        <p className="capsule-tag mb-4">{t('values.tag')}</p>
        <h2 className="font-display heading-section mb-12 text-ink">{t('values.title')}</h2>

        <div className="grid grid-cols-1 gap-6 md:auto-rows-fr md:grid-cols-3 md:grid-rows-2">
          <BlurReveal mode="scroll" className="liquid-glass rounded-2xl p-10 md:col-span-2 md:row-span-2">
            <Sparkles className="mb-4 text-accent" size={36} strokeWidth={1.5} aria-hidden="true" />
            <h3 className="font-display mb-4 text-2xl text-ink">{t('values.quality')}</h3>
            <p className="text-base leading-relaxed text-ink-soft">{t('values.qualityText')}</p>
          </BlurReveal>
          <BlurReveal mode="scroll" className="paper-card p-7">
            <Hammer className="mb-3 text-accent" size={28} strokeWidth={1.5} aria-hidden="true" />
            <h3 className="font-display mb-2 text-lg text-ink">{t('values.handcraft')}</h3>
            <p className="text-sm leading-relaxed text-ink-soft">{t('values.handcraftText')}</p>
          </BlurReveal>
          <BlurReveal mode="scroll" className="paper-card p-7">
            <Heart className="mb-3 text-accent" size={28} strokeWidth={1.5} aria-hidden="true" />
            <h3 className="font-display mb-2 text-lg text-ink">{t('values.individuality')}</h3>
            <p className="text-sm leading-relaxed text-ink-soft">{t('values.individualityText')}</p>
          </BlurReveal>
        </div>
      </section>

      <div className="ribbon-line" />

      {/* ── S6: Editorial photo grid ── */}
      <section className="mx-auto max-w-6xl px-6 py-24 lg:px-8">
        <p className="capsule-tag mb-4 text-center">{t('editorial.tag')}</p>
        <h2 className="font-display heading-section mb-12 text-center text-ink">
          {t('editorial.title')}
        </h2>

        <BlurReveal
          mode="scroll"
          className="grid grid-cols-1 gap-3 md:grid-cols-12 md:grid-rows-[300px_300px] md:gap-4"
        >
          {editorialPhotos.map((photo, i) => (
            <div
              key={i}
              className={`collage-frame relative aspect-[4/5] overflow-hidden md:aspect-auto ${photo.span}`}
            >
              <Image
                src={photo.src}
                alt=""
                fill
                sizes="(max-width:768px) 100vw, 40vw"
                loading="lazy"
                className="object-cover"
              />
            </div>
          ))}
        </BlurReveal>
      </section>

      <div className="ribbon-line" />

      {/* ── S7: CTA — monogram watermark ── */}
      <section className="relative isolate mx-auto max-w-4xl overflow-hidden px-6 py-32 text-center lg:px-8">
        <img
          src="/logos/icon-white.svg"
          alt=""
          aria-hidden
          className="brand-asset pointer-events-none absolute inset-0 -z-10 m-auto select-none"
          style={{width: 'min(800px, 90vw)', opacity: 0.04}}
        />
        <p className="capsule-tag mb-6">{t('cta_tag')}</p>
        <div className="ribbon-line mx-auto mb-8 w-24" />
        <Link href={`/${locale}/shop`} className="lux-btn-primary">
          {t('cta')}
        </Link>
      </section>
    </div>
  );
}
