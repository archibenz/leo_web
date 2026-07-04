import type {MetadataRoute} from 'next';
import {SITE_URL} from '../lib/siteUrl';
import {WHITE_PRODUCTS} from './[locale]/white/products';

// The White variant is the site: the sitemap lists its routes (the old
// gradient paths 307-redirect there and stay out), plus the legal pages that
// still live at their original addresses.

const locales = ['en', 'ru'] as const;

const staticRoutes = [
  '/white',
  '/white/shop',
  '/white/atelier',
  '/white/lookbook',
  '/white/contact',
  '/white/delivery',
  '/white/faq',
  '/white/care',
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
        changeFrequency: route === '/white' ? 'daily' : 'weekly',
        priority: route === '/white' ? 1.0 : 0.8,
        alternates: {languages: altLanguages(route)},
      });
    }
    for (const product of WHITE_PRODUCTS) {
      const route = `/white/product?p=${product.key}`;
      entries.push({
        url: `${SITE_URL}/${locale}${route}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: {languages: altLanguages(route)},
      });
    }
  }

  return entries;
}
