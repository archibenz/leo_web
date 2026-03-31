import type {MetadataRoute} from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://reinasleo.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/auth/', '/account/', '/api/', '/cart/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
