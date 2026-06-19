import {describe, it, expect} from 'vitest';
import {buildProductMeta} from '../productMeta';

const base = {
  brandPrefix: 'REINASLEO · ',
  title: 'Silk Dress',
  description: 'A sculpted silk dress.',
  url: 'https://reinasleo.com/ru/product/abc',
  locale: 'ru',
  image: '/uploads/silk.jpg',
};

describe('buildProductMeta', () => {
  it('re-declares the openGraph fields Next drops when a child overrides openGraph', () => {
    const {openGraph} = buildProductMeta(base);
    expect(openGraph).toMatchObject({
      type: 'website',
      siteName: 'REINASLEO',
      url: 'https://reinasleo.com/ru/product/abc',
      title: 'REINASLEO · Silk Dress',
      description: 'A sculpted silk dress.',
    });
  });

  it('emits a product-specific summary_large_image twitter card', () => {
    const {twitter} = buildProductMeta(base);
    expect(twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'REINASLEO · Silk Dress',
      images: ['/uploads/silk.jpg'],
    });
  });

  it('maps locale to the OG locale code', () => {
    expect(buildProductMeta({...base, locale: 'ru'}).openGraph?.locale).toBe('ru_RU');
    expect(buildProductMeta({...base, locale: 'en'}).openGraph?.locale).toBe('en_US');
  });

  it('falls back to en_US for an unknown locale', () => {
    expect(buildProductMeta({...base, locale: 'fr'}).openGraph?.locale).toBe('en_US');
  });

  it('includes the product image in both OG and twitter when present', () => {
    const {openGraph, twitter} = buildProductMeta(base);
    expect(openGraph?.images).toEqual([{url: '/uploads/silk.jpg', alt: 'Silk Dress'}]);
    expect(twitter?.images).toEqual(['/uploads/silk.jpg']);
  });

  it('omits images when no product image is available', () => {
    const {openGraph, twitter} = buildProductMeta({...base, image: null});
    expect(openGraph).not.toHaveProperty('images');
    expect(twitter).not.toHaveProperty('images');
  });
});
