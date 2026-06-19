import type {Metadata} from 'next';

export type ProductMetaInput = {
  brandPrefix: string;
  title: string;
  description: string;
  url: string; // absolute product URL
  locale: string; // 'en' | 'ru'
  image?: string | null; // first product image (relative ok — metadataBase absolutises)
};

const OG_LOCALE: Record<string, string> = {en: 'en_US', ru: 'ru_RU'};

// Next replaces (does not deep-merge) the parent openGraph when a child segment
// declares its own, so the PDP must re-state type/siteName/url/locale here or
// shared product links lose them. It also needs an explicit product twitter
// card — otherwise the page inherits the generic root card (brand title, no
// product image). Relative image paths are resolved against metadataBase.
export function buildProductMeta(input: ProductMetaInput): Pick<Metadata, 'openGraph' | 'twitter'> {
  const ogTitle = `${input.brandPrefix}${input.title}`;
  return {
    openGraph: {
      type: 'website',
      siteName: 'REINASLEO',
      locale: OG_LOCALE[input.locale] ?? OG_LOCALE.en,
      url: input.url,
      title: ogTitle,
      description: input.description,
      ...(input.image && {images: [{url: input.image, alt: input.title}]}),
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: input.description,
      ...(input.image && {images: [input.image]}),
    },
  };
}
