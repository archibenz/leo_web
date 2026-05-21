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
};

export default withNextIntl(nextConfig);
