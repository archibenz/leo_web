import {describe, it, expect} from 'vitest';
import {ogLocale, brandCardUrl, brandMeta} from '../openGraph';
import {SITE_URL} from '../siteUrl';

// Absolute OG URLs are built from SITE_URL — NEXT_PUBLIC_SITE_URL when set,
// otherwise the production fallback (see siteUrl.test.ts). Assert against the
// same resolved origin so the suite is green whether the env var is set (CI
// exports http://localhost:3000) or unset (local dev).
const ORIGIN = SITE_URL;

describe('ogLocale', () => {
  it('maps the app locales to OG locale codes', () => {
    expect(ogLocale('ru')).toBe('ru_RU');
    expect(ogLocale('en')).toBe('en_US');
  });

  it('falls back to en_US for an unknown locale', () => {
    expect(ogLocale('fr')).toBe('en_US');
  });
});

describe('brandCardUrl', () => {
  it('points at the per-locale brand card route on the site origin', () => {
    expect(brandCardUrl('ru')).toBe(`${ORIGIN}/ru/opengraph-image`);
    expect(brandCardUrl('en')).toBe(`${ORIGIN}/en/opengraph-image`);
  });
});

describe('brandMeta', () => {
  const meta = brandMeta({
    locale: 'ru',
    path: '/shop',
    title: 'Магазин · REINASLEO',
    description: 'Каталог REINASLEO.',
  });

  it('restates the openGraph fields Next drops when a segment overrides openGraph', () => {
    expect(meta.openGraph).toMatchObject({
      type: 'website',
      siteName: 'REINASLEO',
      locale: 'ru_RU',
      alternateLocale: 'en_US',
      url: `${ORIGIN}/ru/shop`,
      title: 'Магазин · REINASLEO',
      description: 'Каталог REINASLEO.',
    });
  });

  it('uses the raster brand card (not the SVG logo) as og:image', () => {
    expect(meta.openGraph?.images).toEqual([
      {url: `${ORIGIN}/ru/opengraph-image`, width: 1200, height: 630, alt: 'REINASLEO'},
    ]);
  });

  it('emits a summary_large_image twitter card sharing the same card image', () => {
    expect(meta.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Магазин · REINASLEO',
      images: [`${ORIGIN}/ru/opengraph-image`],
    });
  });

  it('builds the home og:url from an empty path', () => {
    const home = brandMeta({locale: 'en', path: '', title: 'REINASLEO', description: 'x'});
    expect(home.openGraph?.url).toBe(`${ORIGIN}/en`);
  });

  it('flips alternateLocale to ru_RU on en pages', () => {
    const en = brandMeta({locale: 'en', path: '/care', title: 't', description: 'd'});
    expect(en.openGraph).toMatchObject({locale: 'en_US', alternateLocale: 'ru_RU'});
  });
});
