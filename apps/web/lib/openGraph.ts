import type {Metadata} from 'next';
import {SITE_URL} from './siteUrl';

// Maps the app locale to the Open Graph locale code (og:locale).
export const OG_LOCALE: Record<string, string> = {en: 'en_US', ru: 'ru_RU'};

export function ogLocale(locale: string): string {
  return OG_LOCALE[locale] ?? OG_LOCALE.en;
}

// Absolute URL of the localised 1200x630 brand share-card rendered by
// app/[locale]/opengraph-image.tsx. Used as og:image on every non-product page
// and as the product fallback when a garment has no photo. A raster PNG, not the
// SVG logo — Telegram/WhatsApp/VK scrapers reject SVG og:image.
export function brandCardUrl(locale: string): string {
  return `${SITE_URL}/${locale}/opengraph-image`;
}

type BrandMetaInput = {
  locale: string;
  path: string; // locale-relative path, '' for home or e.g. '/shop', '/care'
  title: string;
  description: string;
};

// A self-contained openGraph + twitter block for the brand-card pages. Next
// replaces (does not deep-merge) the parent openGraph when a segment declares
// its own, so every page must restate type/siteName/locale/url/images here
// instead of leaking the root layout's SVG card. Keeping it in one place stops
// the eight info/legal pages from drifting.
export function brandMeta(input: BrandMetaInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const url = `${SITE_URL}/${input.locale}${input.path}`;
  const image = brandCardUrl(input.locale);
  return {
    openGraph: {
      type: 'website',
      siteName: 'REINASLEO',
      locale: ogLocale(input.locale),
      alternateLocale: ogLocale(input.locale === 'ru' ? 'en' : 'ru'),
      url,
      title: input.title,
      description: input.description,
      images: [{url: image, width: 1200, height: 630, alt: 'REINASLEO'}],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}
