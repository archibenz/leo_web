import createIntlMiddleware from 'next-intl/middleware';
import {defaultLocale, locales} from './i18n-routing';
import {NextRequest} from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  // Exclude Next.js File Convention dynamic routes (icon, apple-icon, opengraph-image)
  // — they have no extension so the .*\..* exclusion doesn't catch them, and we don't
  // want next-intl to redirect them into /[locale]/... where they'd 404.
  matcher: ['/((?!api|_next|_vercel|icon|apple-icon|opengraph-image|.*\\..*).*)']
};
