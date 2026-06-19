import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  devIndicators: false,
  // Drop X-Powered-By: Next.js — leaks framework + version, gives no benefit.
  poweredByHeader: false,
  eslint: {
    // Lint runs as a separate CI step (`npm run lint`). Build is functional
    // only — warnings in legacy files shouldn't block production bundling.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type-checking runs separately (`tsc --noEmit`, kept at 0 errors). Running
    // it again inline during `next build` is one of the heaviest memory phases —
    // it OOM-killed the full build (gradient + White) on the 2GB prod box. Skip
    // it at build time; correctness is still gated by the standalone tsc step.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'images.unsplash.com'},
      {protocol: 'http', hostname: 'localhost'},
      {protocol: 'https', hostname: 'reinasleo.com'},
      {protocol: 'https', hostname: 'www.reinasleo.com'},
    ],
    minimumCacheTTL: 86400,
    formats: ['image/avif', 'image/webp'],
    // dangerouslyAllowSVG removed: SVG can carry CSS/foreignObject exfil and clickjacking
    // even with the per-image CSP sandbox. Brand SVGs are served as /public/*.svg (not via next/image).
  },
  // Shareable entry for the "White" preview variant. next.config redirects run
  // before next-intl middleware (localePrefix: 'always'), so /white-version is
  // sent to the locale-prefixed showcase before the matcher ever sees it.
  // Temporary (307) on purpose — White is a prototype; the entry may move/retire.
  async redirects() {
    return [
      {source: '/white-version', destination: '/ru/white', permanent: false},
      {source: '/white-version/:path*', destination: '/ru/white/:path*', permanent: false},
    ];
  },
};

export default withNextIntl(nextConfig);
