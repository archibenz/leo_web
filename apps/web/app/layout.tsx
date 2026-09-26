import type {Metadata, Viewport} from 'next';
import {cookies, headers} from 'next/headers';
import {Cormorant_Garamond, Jost, Cormorant} from 'next/font/google';
import {defaultLocale, locales, type Locale} from '../i18n';
import {SITE_URL as siteUrl} from '../lib/siteUrl';
import {earlyErrorsScript} from '../lib/earlyErrors';
import './globals.css';
import ClientErrorReporter from '../components/ClientErrorReporter';

const EARLY_ERRORS = earlyErrorsScript(process.env.NEXT_PUBLIC_RELEASE);

const display = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600'],
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
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-accent',
  display: 'swap',
  preload: false
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  // Root-level title — fallback for non-locale routes (404, errors).
  // The locale-aware title and template live in app/[locale]/layout.tsx.
  title: 'REINASLEO',
  description:
    'Premium womenswear with sculpted silhouettes, precision craftsmanship, and editorial storytelling.',
  applicationName: 'REINASLEO',
  manifest: '/manifest.json',
  metadataBase: new URL(siteUrl),
  // Ownership proof for Yandex.Webmaster and Google Search Console. Both are
  // read-only meta tags, but without them nobody can see how the site indexes
  // or ask for a recrawl. Set the codes in the web env and redeploy; absent,
  // Next simply omits the tags.
  verification: {
    ...(process.env.NEXT_PUBLIC_YANDEX_VERIFICATION && {
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    }),
    ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION && {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    }),
  },
  alternates: {
    canonical: '/',
    languages: {
      'en': '/en',
      'ru': '/ru',
      'x-default': '/ru',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'REINASLEO',
    title: 'REINASLEO · Atelier',
    description: 'Premium womenswear with sculpted silhouettes, precision craftsmanship, and editorial storytelling.',
    url: siteUrl,
    // Raster 1200x630 card, not the SVG logo — Telegram/WhatsApp/VK scrapers
    // reject SVG og:image. Locale pages override with a localised card.
    images: [{url: `${siteUrl}/opengraph-image`, width: 1200, height: 630, alt: 'REINASLEO'}],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'REINASLEO · Atelier',
    description: 'Premium womenswear with sculpted silhouettes and precision craftsmanship.',
    images: [`${siteUrl}/opengraph-image`],
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
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang={lang}>
      <head>
        {/* Первым: ловит ошибки до гидрации, в том числе упавший чанк, после
            которого сборщик не появится вовсе (lib/earlyErrors.ts). Nonce —
            тот же, что у Метрики; браузер прячет его из DOM, отсюда
            suppressHydrationWarning. */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: EARLY_ERRORS}} />
      </head>
      {/* bg-paper/text-ink used to sit here unconditionally — a hardcoded
          #1E120D/#F3E9DA pair from tailwind.config.ts, wholly separate from
          the --paper/--ink custom properties and higher-specificity than the
          plain `body { }` rule in globals.css (a class always beats a bare
          element selector), so it silently outranked every attempt to make
          body white by default from there. White is body's default now
          (app/globals.css); dark is body.theme-gradient, opt-in, and nothing
          sets it, so these two utility classes would just fight that default
          and win on every route that isn't (shop) — admin included. */}
      <body className={`${display.variable} ${body.variable} ${accent.variable} font-sans`}>
        {/* Ошибки браузера → аналитика (lib/clientErrors.ts). */}
        <ClientErrorReporter />
        {children}
      </body>
    </html>
  );
}
