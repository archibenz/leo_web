import type {MetadataRoute} from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
const locales = ['en', 'ru'] as const;

const staticRoutes = [
  '',
  '/shop',
  '/about',
  '/contact',
  '/collections',
  '/privacy',
  '/terms',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of staticRoutes) {
      entries.push({
        url: `${siteUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
      });
    }
  }

  try {
    const res = await fetch(`${apiBase}/api/catalog/products?page=0&size=1000`, {
      next: {revalidate: 3600},
    });
    if (res.ok) {
      const data = await res.json();
      const products = data.content ?? data ?? [];
      for (const product of products) {
        for (const locale of locales) {
          entries.push({
            url: `${siteUrl}/${locale}/product/${product.id}`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }
    }
  } catch {
    // API unavailable during build — static routes only
  }

  return entries;
}
