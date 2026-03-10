import type {Metadata, Viewport} from 'next';
import {cookies} from 'next/headers';
import {Spectral, IBM_Plex_Sans} from 'next/font/google';
import {defaultLocale, locales, type Locale} from '../i18n';
import './globals.css';

const display = Spectral({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
  preload: true
});

const body = IBM_Plex_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
  preload: true
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'REINASLEO — Regal confidence. Sculpted femininity.',
  description:
    'Premium womenswear with sculpted silhouettes, precision craftsmanship, and editorial storytelling.',
  applicationName: 'REINASLEO',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'REINASLEO',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: [{rel: 'icon', url: '/favicon.ico'}]
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value as Locale | undefined;
  const lang = (cookieLocale && locales.includes(cookieLocale)) ? cookieLocale : defaultLocale;

  return (
    <html lang={lang}>
      <body className={`${display.variable} ${body.variable} bg-paper text-ink`}>
        {children}
      </body>
    </html>
  );
}
