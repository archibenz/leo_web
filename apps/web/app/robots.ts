import type {MetadataRoute} from 'next';
import {SITE_URL} from '../lib/siteUrl';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // Routes are locale-prefixed (localePrefix: 'always'), so the real
          // paths are /<locale>/admin etc. — a bare `/admin/` matches from root
          // and never blocks `/ru/admin/`. Use the `/*/` locale wildcard.
          '/*/admin/',
          '/*/auth/',
          '/*/account/',
          '/*/cart/',
          '/*/favorites/',
          '/*/splash-preview',
          '/*/loader-preview',
          '/*/v1/',
          // API routes are NOT locale-prefixed.
          '/api/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
