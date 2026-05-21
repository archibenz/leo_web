import createIntlMiddleware from 'next-intl/middleware';
import {defaultLocale, locales} from './i18n-routing';
import {NextRequest, NextResponse} from 'next/server';

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
// img-src tightened from broad `https:` to the same allowlist we already trust in
// next.config.mjs remotePatterns — stops an injected <img src="https://attacker"> from
// leaking data via URL params or referrers. Keep in sync with remotePatterns.
const imgHosts = [
  'https://images.unsplash.com',
  'https://reinasleo.com',
  'https://www.reinasleo.com'
].join(' ');

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `img-src 'self' data: blob: ${imgHosts}`,
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

// Edge guard for /admin/* — redirects unauthenticated requests BEFORE the RSC
// payload (containing customer emails, revenue figures, etc.) is rendered.
// JWT signature is not verified here (no secret at the edge); the backend
// /api/admin/** matcher remains the source of truth via ROLE_ADMIN auth.
// Presence of rl_session cookie is enough to filter out anonymous probes.
// Derive the locale alternation from the actual locale list so a future
// non-two-letter locale (e.g. `zh-CN`) does not silently bypass the guard.
const ADMIN_PATH = new RegExp(`^/(${locales.join('|')})/admin(/|$)`);
const SESSION_COOKIE = 'rl_session';

export default function middleware(request: NextRequest) {
  const nonce = generateNonce();
  // Mutate request headers so Server Components can read the nonce via
  // `headers()` and apply it to <Script nonce={nonce}>. Next.js automatically
  // applies the same nonce to its own inline bootstrap script when this header
  // is present in the request.
  request.headers.set('x-nonce', nonce);

  const pathname = request.nextUrl.pathname;

  // Defense-in-depth: anonymous users get redirected to the account/login
  // page instead of receiving the admin RSC payload. Authenticated non-admin
  // users still reach the page but the backend rejects every /api/admin/*
  // call with 403, and AdminGuard.tsx hides the UI client-side.
  if (ADMIN_PATH.test(pathname) && !request.cookies.has(SESSION_COOKIE)) {
    const locale = pathname.split('/')[1] || defaultLocale;
    const redirectUrl = new URL(`/${locale}/account`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Next.js API route handlers (/api/*) must NOT go through next-intl
  // (no locale routing) but they DO need the same security headers as pages —
  // otherwise endpoints like /api/newsletter/subscribe ship without CSP, HSTS,
  // X-Frame-Options, etc. Skip intl, still apply headers below.
  const isApiRoute = pathname.startsWith('/api/');
  const response = isApiRoute
    ? NextResponse.next({request: {headers: request.headers}})
    : intlMiddleware(request);
  const csp = buildCsp(nonce);

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=()'
  );
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  // COOP prevents cross-origin popups (e.g. Telegram OAuth) from retaining
  // window.opener references that enable timing attacks against auth state.
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Content-Security-Policy', csp);

  return response;
}

export const config = {
  // Include `/api/*` so Next.js API route handlers receive security headers.
  // Exclude only static asset routes and Next.js File Convention dynamic routes
  // (icon, apple-icon, opengraph-image) — they have no extension so the .*\..*
  // exclusion doesn't catch them, and they don't need security headers.
  matcher: ['/((?!_next|_vercel|icon|apple-icon|opengraph-image|.*\\..*).*)']
};
