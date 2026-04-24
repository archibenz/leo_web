import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'images.unsplash.com'},
      {protocol: 'http', hostname: 'localhost'},
      {protocol: 'https', hostname: 'reinasleo.com'},
      {protocol: 'https', hostname: 'www.reinasleo.com'},
    ],
    minimumCacheTTL: 86400,
    formats: ['image/avif', 'image/webp'],
  },
};

export default withNextIntl(nextConfig);
