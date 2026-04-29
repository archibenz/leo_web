import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import HomeContent from '../../components/HomeContent';
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
  const categories = t.raw('categories.items') as {key: string; label: string; description: string}[];
  const popularItems = t.raw('popular.items') as {slug: string; label: string; description: string}[];

  return (
    <HomeContent
      locale={locale}
      scrollHint={t('scrollHint')}
      showcaseHeroTitle={t('showcase.heroTitle')}
      showcaseHeroSubtitle={t('showcase.heroSubtitle')}
      showcaseHeroSeason={t('showcase.heroSeason')}
      showcaseItems={showcaseItems}
      shopHeroTitle={t('shopHero.title')}
      shopHeroSubtitle={t('shopHero.subtitle')}
      categoriesTitle={t('categories.title')}
      categories={categories}
      popularTitle={t('popular.title')}
      popularItems={popularItems}
    />
  );
}
