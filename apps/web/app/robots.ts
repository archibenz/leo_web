import type {MetadataRoute} from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/auth/',
          '/account/',
          '/api/',
          '/cart/',
          '/*/splash-preview',
          '/*/loader-preview',
          '/*/v1/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
