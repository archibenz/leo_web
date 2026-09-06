import {describe, it, expect} from 'vitest';
import {WHITE_PRODUCTS, findWhiteProduct, whitePrice, whiteEffectivePrice, whitePriceRange, type WhiteColor, type WhiteProduct} from './products';

// Wildberries prices per colourway, so the site does too. What these pin down is
// that a colour's own price never mixes with the product's sale — quoting one
// colour's number for another is how a card promises half of what the bag then
// charges.

const colour = (over: Partial<WhiteColor> = {}): WhiteColor => ({key: 'x', hex: '#000', en: 'X', ru: 'Икс', ...over});

describe('whitePrice', () => {
  it('sells a colour without its own price at the product price', () => {
    expect(whitePrice({price: 5000}, colour())).toEqual({price: 5000, sale: undefined});
  });

  it('lets the colour price win over the product price', () => {
    expect(whitePrice({price: 5000}, colour({price: 2250}))).toEqual({price: 2250, sale: undefined});
  });

  it('drops the product sale once the colour prices itself', () => {
    // The struck 25 000 belongs to the product's colour, not this one — showing
    // it here would advertise a discount that was never offered on this swatch.
    expect(whitePrice({price: 25000, sale: 12000}, colour({price: 8000}))).toEqual({price: 8000, sale: undefined});
  });

  it("keeps a colour's own sale", () => {
    expect(whitePrice({price: 5000}, colour({price: 9000, sale: 4500}))).toEqual({price: 9000, sale: 4500});
  });

  it('falls back to the product when no colour is given', () => {
    expect(whitePrice({price: 25000, sale: 12000})).toEqual({price: 25000, sale: 12000});
  });
});

describe('whiteEffectivePrice', () => {
  it('charges the sale when there is one', () => {
    expect(whiteEffectivePrice({price: 25000, sale: 12000})).toBe(12000);
  });

  it('charges the colour price', () => {
    expect(whiteEffectivePrice({price: 5000}, colour({price: 2250}))).toBe(2250);
  });

  it('has nothing to charge for a priceless preorder piece', () => {
    expect(whiteEffectivePrice({})).toBeUndefined();
  });
});

describe('whitePriceRange', () => {
  const product = (colors: WhiteColor[], price?: number): WhiteProduct =>
    ({colors, price} as unknown as WhiteProduct);

  it('reports no spread when every colour costs the same', () => {
    expect(whitePriceRange(product([colour(), colour()], 5000))).toEqual({min: 5000, max: 5000, varies: false});
  });

  it('reports the spread when colours are priced apart', () => {
    const range = whitePriceRange(product([colour(), colour({price: 2250}), colour({price: 4500})], 5000));
    expect(range).toEqual({min: 2250, max: 5000, varies: true});
  });

  it('stays quiet for a priceless preorder piece', () => {
    expect(whitePriceRange(product([colour(), colour()]))).toEqual({varies: false});
  });
});

// Data guards. These fail when the catalogue drifts from the marketplace, which
// is the whole failure this feature exists to catch.
describe('catalogue pricing', () => {
  it('prices the balloon skirt from its cheapest colour, not its dearest', () => {
    // Ivory is 5 000 and red is 2 250 — the card must not quote ivory for both.
    const range = whitePriceRange(findWhiteProduct(8)!);
    expect(range.varies).toBe(true);
    expect(range.min).toBe(2250);
  });

  it('leaves a single-priced piece alone', () => {
    expect(whitePriceRange(findWhiteProduct(6)!)).toMatchObject({varies: false, min: 5000});
  });

  it('never prices a colour at zero or below', () => {
    for (const p of WHITE_PRODUCTS) {
      for (const c of p.colors) {
        if (c.price != null) expect(c.price, `${p.slug} / ${c.key}`).toBeGreaterThan(0);
        if (c.sale != null) expect(c.sale, `${p.slug} / ${c.key}`).toBeGreaterThan(0);
      }
    }
  });

  it('never marks a colour up above its own struck price', () => {
    for (const p of WHITE_PRODUCTS) {
      for (const c of p.colors) {
        if (c.price != null && c.sale != null) expect(c.sale, `${p.slug} / ${c.key}`).toBeLessThan(c.price);
      }
    }
  });
});
