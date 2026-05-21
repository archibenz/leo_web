import createIntlMiddleware from 'next-intl/middleware';
import {defaultLocale, locales} from './i18n-routing';
import {NextRequest} from 'next/server';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

// connect-src needs to allow the API origin. NEXT_PUBLIC_API_BASE is empty in
// production (same-origin via nginx) and 'self' covers it; in local dev it's
// the http://localhost:8080 backend that fetches from :3000.
const apiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
const connectSrc = apiBase && apiBase.length > 0 ? `'self' ${apiBase}` : "'self'";

// style-src keeps 'unsafe-inline' because next/image inline sizing styles and
// framer-motion's runtime style injection both require it. Script XSS is the
// higher-impact vector and is closed via per-request nonce + 'strict-dynamic'.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    "img-src 'self' https: data: blob:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'"
  ].join('; ');
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export default function middleware(request: NextRequest) {
  const nonce = generateNonce();
  // Mutate request headers so Server Components can read the nonce via
  // `headers()` and apply it to <Script nonce={nonce}>. Next.js automatically
  // applies the same nonce to its own inline bootstrap script when this header
  // is present in the request.
  request.headers.set('x-nonce', nonce);

  const response = intlMiddleware(request);
  const csp = buildCsp(nonce);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  // Exclude Next.js File Convention dynamic routes (icon, apple-icon, opengraph-image)
  // — they have no extension so the .*\..* exclusion doesn't catch them, and we don't
  // want next-intl to redirect them into /[locale]/... where they'd 404.
  matcher: ['/((?!api|_next|_vercel|icon|apple-icon|opengraph-image|.*\\..*).*)']
};
