import {describe, it, expect} from 'vitest';
import {buildOzonLink, ozonProductUrl, hasOzonListing} from '../ozon';

const CARD = 'https://www.ozon.ru/product/zhilet-kostyumnyy-s-baskoy-1234567890/';

describe('buildOzonLink', () => {
  it('tags the link so Ozon can attribute the visit to the site', () => {
    const url = new URL(buildOzonLink(CARD, {campaign: 'product', content: 'zhilet-kostyumnyy-s-baskoy'})!);
    expect(url.origin + url.pathname).toBe('https://www.ozon.ru/product/zhilet-kostyumnyy-s-baskoy-1234567890/');
    expect(url.searchParams.get('utm_source')).toBe('reinasleo.com');
    expect(url.searchParams.get('utm_medium')).toBe('website');
    expect(url.searchParams.get('utm_content')).toBe('zhilet-kostyumnyy-s-baskoy');
  });

  it('opens utm_campaign with the seller prefix — without it Ozon never counts the visit', () => {
    const url = new URL(buildOzonLink(CARD, {campaign: 'product'})!);
    expect(url.searchParams.get('utm_campaign')).toMatch(/^vendor_org_\d+_product$/);
  });

  it('replaces tagging the pasted link already carried instead of doubling it', () => {
    // Ozon's own link builder hands out a tagged URL; pasting that into the
    // list must not produce ?utm_source=a&utm_source=b.
    const pasted = `${CARD}?utm_source=vk&utm_medium=post&utm_campaign=vendor_org_1_old&sort=price`;
    const url = new URL(buildOzonLink(pasted, {campaign: 'product'})!);
    expect(url.searchParams.getAll('utm_source')).toEqual(['reinasleo.com']);
    // Our prefix, not the stale one the pasted link carried.
    expect(url.searchParams.get('utm_campaign')).not.toBe('vendor_org_1_old');
    expect(url.searchParams.get('utm_campaign')).toMatch(/_product$/);
    // Non-UTM query the card needs is left alone.
    expect(url.searchParams.get('sort')).toBe('price');
  });

  it('omits utm_content when the caller has nothing to distinguish', () => {
    const url = new URL(buildOzonLink(CARD, {campaign: 'store'})!);
    expect(url.searchParams.has('utm_content')).toBe(false);
  });

  it('refuses a link that does not point at Ozon', () => {
    // A mistyped entry would otherwise sit behind a button reading "buy on Ozon".
    expect(buildOzonLink('https://www.ozon.ru.evil.com/product/1/', {campaign: 'product'})).toBeNull();
    expect(buildOzonLink('https://www.wildberries.ru/catalog/1/detail.aspx', {campaign: 'product'})).toBeNull();
    expect(buildOzonLink('not a url', {campaign: 'product'})).toBeNull();
  });

  it('accepts Ozon subdomains and the bare host', () => {
    expect(buildOzonLink('https://ozon.ru/product/1/', {campaign: 'product'})).toContain('utm_source=reinasleo.com');
    expect(buildOzonLink('https://m.ozon.ru/product/1/', {campaign: 'product'})).toContain('utm_source=reinasleo.com');
  });

  it('rejects a plain-http link rather than sending shoppers over an insecure hop', () => {
    expect(buildOzonLink('http://www.ozon.ru/product/1/', {campaign: 'product'})).toBeNull();
  });
});

describe('ozonProductUrl', () => {
  it('gives nothing for a garment that is not listed on Ozon', () => {
    // Only the pieces shipped from our own warehouse carry a link; the rest
    // must not grow a button pointing at a card that does not exist.
    expect(ozonProductUrl({key: 999, slug: 'not-on-ozon'})).toBeNull();
    expect(hasOzonListing(999)).toBe(false);
  });
});
