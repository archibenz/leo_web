import {ImageResponse} from 'next/og';
import {renderOgCard, OG_SIZE, OG_CONTENT_TYPE} from '../../lib/ogCard';
import {locales} from '../../i18n';

// Node runtime (the default): the card is static, so generateStaticParams
// prerenders both locale cards at build — edge + generateStaticParams is not
// allowed together, and static generation is cheaper than an edge render.
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'REINASLEO — Premium womenswear';

// Localised twin of the root /opengraph-image: the same dark brand card with the
// tagline in the page's language. Every locale page points og:image here
// (…/<locale>/opengraph-image) so ru links preview the ru card and en the en.
export function generateStaticParams() {
  return locales.map((locale) => ({locale}));
}

export default async function OpengraphImage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  return new ImageResponse(renderOgCard(locale), {...size});
}
