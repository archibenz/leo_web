import type {MetadataRoute} from 'next';
import {API_BASE} from '../lib/api';
import {SITE_URL} from '../lib/siteUrl';

const locales = ['en', 'ru'] as const;

const staticRoutes = [
  '',
  '/shop',
  '/about',
  '/contact',
  '/care',
  '/delivery',
  '/collections',
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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
  }

  try {
    const res = await fetch(`${API_BASE}/api/catalog/products?page=0&size=1000`, {
      next: {revalidate: 3600},
    });
    if (res.ok) {
      const data = await res.json();
      const products = data.content ?? data ?? [];
      for (const product of products) {
        const route = `/product/${product.id}`;
        for (const locale of locales) {
          entries.push({
            url: `${SITE_URL}/${locale}${route}`,
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.6,
            alternates: {languages: altLanguages(route)},
          });
        }
      }
    }
  } catch {
    // API unavailable during build — static routes only
  }

  return entries;
}
