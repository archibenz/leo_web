import {describe, it, expect} from 'vitest';
import {STOREFRONT_FIXTURE as SF} from './fixture';
import {
  findProductByKey,
  findProductBySlug,
  findSet,
  setColour,
  whitePriceRange,
  whiteAvailability,
  whiteInStock,
  whiteProductHref,
  normalizeWhiteCat,
} from './select';

describe('lookups', () => {
  it('finds by key whether the key arrives as number or string', () => {
    expect(findProductByKey(SF.products, 8)?.slug).toBe('yubka-ballon-atlasnaya');
    expect(findProductByKey(SF.products, '8')?.slug).toBe('yubka-ballon-atlasnaya');
    expect(findProductByKey(SF.products, undefined)).toBeUndefined();
  });
  it('finds by slug', () => expect(findProductBySlug(SF.products, 'palto-pidzhak-pritalennoe')?.key).toBe(2));
  it('resolves the colour worn in a set, falling back to the first colour', () => {
    const set = findSet(SF.sets, 'everyday')!;
    const skirt = findProductByKey(SF.products, 8)!;
    // The look wears ivory, which is deliberately not the skirt's first colour:
    // a setColour that always returned colors[0] would sell the red one.
    expect(setColour(set, skirt).key).toBe('ivory');
    expect(setColour(set, skirt)).not.toBe(skirt.colors[0]);
    expect(setColour(set, findProductByKey(SF.products, 21)!).key).toBe(SF.products[2]!.colors[0]!.key);
  });
});

describe('price range', () => {
  it('reports «from» when colourways differ', () => expect(whitePriceRange(findProductByKey(SF.products, 8)!)).toEqual({min: 2250, max: 5000, varies: true}));
});

describe('availability', () => {
  it('a priceless piece is never available', () => expect(whiteAvailability(findProductByKey(SF.products, 21)!, {onWb: true})).toBe('none'));
  it('site sales stay switched off in this stage', () => expect(whiteInStock(SF.products[0]!)).toBe(false));
});

describe('links and filters', () => {
  it('builds the canonical product path', () => expect(whiteProductHref('ru', SF.products[0]!)).toBe('/ru/product/palto-pidzhak-pritalennoe'));
  it('collapses an unrecognised category to all', () => {
    expect(normalizeWhiteCat('skirts')).toBe('skirts');
    expect(normalizeWhiteCat('handbags')).toBe('all');
    expect(normalizeWhiteCat(null)).toBe('all');
  });
});
