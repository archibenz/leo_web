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

// style-src keeps 'unsafe-inline' because next/image inline sizing styles
// require it. Script XSS is the higher-impact vector and is closed via
// per-request nonce + 'strict-dynamic'.
// img-src tightened from broad `https:` to the same allowlist we already trust in
// next.config.mjs remotePatterns — stops an injected <img src="https://attacker"> from
// leaking data via URL params or referrers. Keep in sync with remotePatterns.
const imgHosts = [
  'https://images.unsplash.com',
  'https://reinasleo.com',
  'https://www.reinasleo.com'
].join(' ');

// Yandex.Metrika hosts are allowed only when the counter is configured.
// tag.js itself loads via the nonce'd inline snippet + 'strict-dynamic';
// the explicit script-src entry is a fallback for CSP2-only browsers.
const ymHosts = process.env.NEXT_PUBLIC_YM_ID?.trim()
  ? ' https://mc.yandex.ru https://mc.yandex.com'
  : '';

// Next's dev runtime (Fast Refresh) evaluates code via eval, which the strict
// production CSP forbids — without this, dev hydration dies with an EvalError
// and every client component renders blank. Production builds never get it.
const devEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `img-src 'self' data: blob: ${imgHosts}${ymHosts}`,
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval}${ymHosts}`,
    "font-src 'self' data:",
    `connect-src ${connectSrc}${ymHosts}`,
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

// The White storefront moved from /<locale>/white/* to the locale root. Old
// /white URLs stay alive as permanent 308s so external links and indexed pages
// keep resolving; retired gradient URLs that have no root page anymore
// (cart/favorites/collections/about, path-style /product/<id>) 308 to their
// White successors. Legal pages (privacy/terms/offer), auth and admin stay put.
const WHITE_LEGACY_PATH = new RegExp(`^/(${locales.join('|')})/white(/.*)?$`);
const WHITE_ATELIER_PATH = new RegExp(`^/(${locales.join('|')})/white/atelier/?$`);
const LEGACY_ALIAS_PATH = new RegExp(`^/(${locales.join('|')})(/.*)?$`);
const LEGACY_ALIASES: Record<string, string> = {
  '/cart': '/bag',
  '/favorites': '/favourites',
  '/collections': '/shop',
  '/about': '/sets',
};

export default function middleware(request: NextRequest) {
  const nonce = generateNonce();
  // Mutate request headers so Server Components can read the nonce via
  // `headers()` and apply it to <Script nonce={nonce}>. Next.js automatically
  // applies the same nonce to its own inline bootstrap script when this header
  // is present in the request.
  request.headers.set('x-nonce', nonce);

  const pathname = request.nextUrl.pathname;
  // Let Server Components know which route they serve (the locale layout keeps
  // the gradient chrome only on privacy/terms/offer/admin/auth; everything else
  // renders the White storefront chrome). Same mechanism as the nonce.
  request.headers.set('x-pathname', pathname);

  // The atelier section became Sets — permanent, real 308 at the edge (a
  // page-level redirect can't change the status once the shell streams).
  // Checked before the generic /white rule so /white/atelier lands on /sets.
  const atelier = pathname.match(WHITE_ATELIER_PATH);
  if (atelier) {
    return NextResponse.redirect(new URL(`/${atelier[1]}/sets`, request.url), 308);
  }

  // Old /<locale>/white/* addresses → the same path at the locale root, query
  // intact (/ru/white/product?p=key must keep its ?p).
  const whiteLegacy = pathname.match(WHITE_LEGACY_PATH);
  if (whiteLegacy) {
    const rest = whiteLegacy[2] === '/' ? '' : (whiteLegacy[2] ?? '');
    return NextResponse.redirect(
      new URL(`/${whiteLegacy[1]}${rest}${request.nextUrl.search}`, request.url),
      308
    );
  }

  // Retired gradient URLs. The old PDPs were path-style /product/<id>; the
  // White PDP lives at /product?p=<key> with no extra segment, so only paths
  // WITH a segment after /product/ (or the old /shop/<collection>) fall back
  // to the shop.
  const legacy = pathname.match(LEGACY_ALIAS_PATH);
  if (legacy) {
    const rest = legacy[2] ?? '';
    let target: string | null = null;
    if (rest in LEGACY_ALIASES) target = LEGACY_ALIASES[rest]!;
    else if (/^\/(?:product|shop)\/[^/?]/.test(rest)) target = '/shop';
    if (target) {
      return NextResponse.redirect(
        new URL(`/${legacy[1]}${target}${request.nextUrl.search}`, request.url),
        308
      );
    }
  }

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
  // /newsletter is a Next route handler that lives OUTSIDE /api/ on purpose:
  // nginx proxies every /api/* to the Spring backend, so an /api/ Next route is
  // never reached. Kept out of the intl locale-routing like the /api/ handlers.
  const isApiRoute = pathname.startsWith('/api/') || pathname === '/newsletter';
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
