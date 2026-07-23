import {ImageResponse} from 'next/og';
import {renderOgCard, ogAlt, OG_SIZE, OG_CONTENT_TYPE} from '../lib/ogCard';
// Import the plain locale const from i18n-routing, not i18n: i18n.ts calls
// getRequestConfig(next-intl/server) at module scope, which the edge bundle
// would otherwise pull in just for defaultLocale.
import {defaultLocale} from '../i18n-routing';

export const runtime = 'edge';
export const alt = ogAlt(defaultLocale);
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Site-wide default share-card for non-locale routes (404, errors) and the
// ultimate fallback. Locale pages use /[locale]/opengraph-image for a localised
// tagline; both render the same dark brand identity via renderOgCard.
export default function OGImage() {
  return new ImageResponse(renderOgCard(defaultLocale), {...size});
}
