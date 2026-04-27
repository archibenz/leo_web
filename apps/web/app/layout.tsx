import type {Metadata, Viewport} from 'next';
import {cookies} from 'next/headers';
import {Cormorant_Garamond, Jost, Cormorant} from 'next/font/google';
import {defaultLocale, locales, type Locale} from '../i18n';
import './globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  preload: true
});

const body = Jost({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
  preload: true
});

const accent = Cormorant({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-accent',
  display: 'swap',
  preload: true
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

export const metadata: Metadata = {
  // Root-level title — fallback for non-locale routes (404, errors).
  // The locale-aware title and template live in app/[locale]/layout.tsx.
  title: 'REINASLEO',
  description:
    'Premium womenswear with sculpted silhouettes, precision craftsmanship, and editorial storytelling.',
  applicationName: 'REINASLEO',
  manifest: '/manifest.json',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
    languages: {
      'en': '/en',
      'ru': '/ru',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'REINASLEO',
    title: 'REINASLEO · Atelier',
    description: 'Premium womenswear with sculpted silhouettes, precision craftsmanship, and editorial storytelling.',
    url: siteUrl,
    images: [{url: '/logos/logo-white.svg', width: 480, height: 480, alt: 'REINASLEO'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'REINASLEO · Atelier',
    description: 'Premium womenswear with sculpted silhouettes and precision craftsmanship.',
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'REINASLEO',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  // Explicit icons - Google search uses the rasterised PNG endpoint
  // (Next.js generates /icon and /apple-icon from app/icon.tsx + app/apple-icon.tsx).
  icons: {
    icon: [{ url: '/icon', type: 'image/png', sizes: '32x32' }],
    apple: { url: '/apple-icon', type: 'image/png', sizes: '180x180' },
    shortcut: { url: '/icon', type: 'image/png' },
  },
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;
  const lang = (cookieLocale && locales.includes(cookieLocale)) ? cookieLocale : defaultLocale;

  return (
    <html lang={lang}>
      <body className={`${display.variable} ${body.variable} ${accent.variable} font-sans bg-paper text-ink`}>
        {children}
      </body>
    </html>
  );
}
