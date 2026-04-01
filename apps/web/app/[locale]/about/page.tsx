import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import Link from 'next/link';
import type {Locale} from '../../../i18n';
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

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden">
        <HeroShaderBackgroundClient />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-bg z-[5]" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <p className="capsule-tag mb-6">{t('tag')}</p>
          <h1 className="font-display mb-4 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.1] tracking-tight text-ink">
            {t('hero.title')}
          </h1>
          <p className="text-xl leading-relaxed text-ink-soft md:text-2xl">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section className="mx-auto max-w-4xl px-6 py-24 lg:px-8">
        <p className="capsule-tag mb-4">{t('philosophy.tag')}</p>
        <h2 className="font-display mb-6 text-[clamp(1.5rem,3.5vw,2.5rem)] leading-tight text-ink">
          {t('philosophy.title')}
        </h2>
        <p className="max-w-2xl text-lg leading-relaxed text-ink-soft">
          {t('philosophy.text')}
        </p>
      </section>

      <div className="ribbon-line" />

      {/* ── Concept of Looks ── */}
      <section className="mx-auto max-w-4xl px-6 py-24 lg:px-8">
        <p className="capsule-tag mb-4">{t('looks.tag')}</p>
        <h2 className="font-display mb-10 text-[clamp(1.5rem,3.5vw,2.5rem)] leading-tight text-ink">
          {t('looks.title')}
        </h2>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {t('looks.text')}
        </p>
        <div className="space-y-6">
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="flex items-start gap-5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                style={{backgroundColor: '#D4A574', color: '#1E120D'}}
              >
                {n}
              </span>
              <p className="pt-1.5 text-base leading-relaxed text-ink-soft">
                {t(`looks.point${n}`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="ribbon-line" />

      {/* ── Creation Process ── */}
      <section className="mx-auto max-w-5xl px-6 py-24 lg:px-8">
        <p className="capsule-tag mb-4">{t('process.tag')}</p>
        <h2 className="font-display mb-12 text-[clamp(1.5rem,3.5vw,2.5rem)] leading-tight text-ink">
          {t('process.title')}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="paper-card p-8 text-center">
              <span
                className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full text-base font-bold"
                style={{backgroundColor: '#D4A574', color: '#1E120D'}}
              >
                {n}
              </span>
              <h3 className="font-display mb-3 text-lg text-ink">
                {t(`process.step${n}title`)}
              </h3>
              <p className="text-sm leading-relaxed text-ink-soft">
                {t(`process.step${n}text`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="ribbon-line" />

      {/* ── Values ── */}
      <section className="mx-auto max-w-5xl px-6 py-24 lg:px-8">
        <p className="capsule-tag mb-4">{t('values.tag')}</p>
        <h2 className="font-display mb-12 text-[clamp(1.5rem,3.5vw,2.5rem)] leading-tight text-ink">
          {t('values.title')}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {(['quality', 'handcraft', 'individuality'] as const).map((key) => (
            <div key={key} className="paper-card p-8">
              <h3 className="font-display mb-3 text-lg text-ink">{t(`values.${key}`)}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{t(`values.${key}Text`)}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="ribbon-line" />

      {/* ── CTA ── */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-8">
        <Link href={`/${locale}/shop`} className="lux-btn-primary">
          {t('cta')}
        </Link>
      </section>
    </div>
  );
}
