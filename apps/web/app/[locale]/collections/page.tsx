import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import Link from 'next/link';
import type {Locale} from '../../../i18n';

type Props = {params: Promise<{locale: Locale}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Коллекции' : 'Collections',
    description: isRu
      ? 'Сезонные коллекции REINASLEO: зима, весна, лето, осень.'
      : 'REINASLEO seasonal collections: winter, spring, summer, autumn.',
    alternates: {
      canonical: `/${locale}/collections`,
      languages: {en: '/en/collections', ru: '/ru/collections'},
    },
  };
}

const seasons = ['winter', 'spring', 'summer', 'autumn'] as const;

const seasonImages = [
  'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=600&h=900&fit=crop&q=85',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=900&fit=crop&q=85',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=900&fit=crop&q=85',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=900&fit=crop&q=85',
];

export default async function CollectionsPage({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'collections'});

  return (
    <section className="mx-auto max-w-7xl px-4 pt-28 pb-16 sm:px-6 lg:px-8">
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
        {t('tag')}
      </p>
      <h1 className="text-2xl font-light tracking-tight text-[var(--ink)] sm:text-3xl">
        {t('title')}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-soft)]">
        {t('subtitle')}
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {seasons.map((season, i) => (
          <Link
            key={season}
            href={`/${locale}/shop?season=${season}`}
            className="group relative overflow-hidden rounded-xl"
          >
            <div className="aspect-[2/3] w-full bg-[var(--paper-muted)]">
              <img
                src={seasonImages[i]}
                alt={t(`seasons.${season}.name`)}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--paper-base)]/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-[16px] font-[family-name:var(--font-display)] font-semibold uppercase tracking-[0.1em] text-[var(--ink)]/90 transition-colors group-hover:text-[var(--accent)]">
                  {t(`seasons.${season}.name`)}
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink)]/50">
                  {t(`seasons.${season}.description`)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
