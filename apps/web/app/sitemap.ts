import type {MetadataRoute} from 'next';
import {SITE_URL} from '../lib/siteUrl';
import {WHITE_PRODUCTS} from './[locale]/products';

// The White storefront lives at the locale root: the sitemap lists its routes
// (the retired /white and gradient paths 308-redirect there and stay out),
// plus the legal pages that still live at their original addresses.

const locales = ['en', 'ru'] as const;

const staticRoutes = [
  '',
  '/shop',
  '/sets',
  '/lookbook',
  '/contact',
  '/delivery',
  '/faq',
  '/care',
  '/offer',
  '/privacy',
  '/terms',
];

// hreflang cluster for a route — declares the en/ru equivalents so Google
// serves the right language and treats them as alternates, not duplicates.
const altLanguages = (route: string) => ({
  en: `${SITE_URL}/en${route}`,
  ru: `${SITE_URL}/ru${route}`,
});

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  const now = new Date();

  for (const locale of locales) {
    for (const route of staticRoutes) {
      entries.push({
        url: `${SITE_URL}/${locale}${route}`,
        lastModified: now,
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
        alternates: {languages: altLanguages(route)},
      });
    }
    for (const product of WHITE_PRODUCTS) {
      const route = `/product/${product.slug}`;
      // Every frame the garment owns, colour albums included — image search
      // indexes the whole shoot instead of just the opening shot.
      const images = [
        product.image,
        ...(product.gallery ?? []),
        ...product.colors.flatMap((c) => [c.image, ...(c.gallery ?? [])]),
      ].filter((src): src is string => Boolean(src));
      entries.push({
        url: `${SITE_URL}/${locale}${route}`,
        lastModified: now,
        changeFrequency: 'weekly',
        // Garments are what people search for — rank them above the static
        // pages, below the storefront root.
        priority: 0.9,
        alternates: {languages: altLanguages(route)},
        images: [...new Set(images)].map((src) => `${SITE_URL}${src}`),
      });
    }
  }

  return entries;
}
