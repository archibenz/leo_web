import {describe, it, expect} from 'vitest';
import {safeJsonLd, buildBreadcrumbJsonLd, buildProductJsonLd} from '../jsonLd';

const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

describe('safeJsonLd', () => {
  it('escapes HTML-significant characters so the JSON cannot break out of <script>', () => {
    const out = safeJsonLd({x: '<script>alert(1)</script> & more'});
    expect(out).not.toMatch(/[<>&]/);
    expect(out).toContain('u003c');
    expect(out).toContain('u003e');
    expect(out).toContain('u0026');
  });

  it('escapes the U+2028 / U+2029 line/paragraph separators', () => {
    const out = safeJsonLd({x: `a${LINE_SEP}b${PARA_SEP}c`});
    expect(out).not.toContain(LINE_SEP);
    expect(out).not.toContain(PARA_SEP);
    expect(out).toContain('u2028');
    expect(out).toContain('u2029');
  });

  it('round-trips to the original object after unescaping', () => {
    const data = {'@type': 'Product', name: 'Платье'};
    expect(JSON.parse(safeJsonLd(data))).toEqual(data);
  });
});

describe('buildBreadcrumbJsonLd', () => {
  it('builds a BreadcrumbList with 1-based positions and name/item per entry', () => {
    const out = buildBreadcrumbJsonLd([
      {name: 'REINASLEO', url: 'https://reinasleo.com/ru'},
      {name: 'Магазин', url: 'https://reinasleo.com/ru/shop'},
      {name: 'Платье', url: 'https://reinasleo.com/ru/product/1'},
    ]);
    expect(out['@type']).toBe('BreadcrumbList');
    expect(out['@context']).toBe('https://schema.org');
    expect(out.itemListElement).toHaveLength(3);
    expect(out.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'REINASLEO',
      item: 'https://reinasleo.com/ru',
    });
    expect(out.itemListElement[2].position).toBe(3);
    expect(out.itemListElement[2].name).toBe('Платье');
  });

  it('returns an empty itemListElement for no crumbs', () => {
    expect(buildBreadcrumbJsonLd([]).itemListElement).toEqual([]);
  });
});

describe('buildProductJsonLd', () => {
  const base = {
    name: 'Шёлковое платье',
    description: 'Косой крой, матовый шёлк.',
    url: 'https://reinasleo.com/ru/product/p1',
    sku: 'SKU-1',
    price: 24500,
    inStock: true,
    priceValidUntil: '2027-06-19',
    siteUrl: 'https://reinasleo.com',
  };

  it('builds a Product with brand and the required Offer fields', () => {
    const out = buildProductJsonLd(base);
    expect(out['@context']).toBe('https://schema.org');
    expect(out['@type']).toBe('Product');
    expect(out.name).toBe('Шёлковое платье');
    expect(out.sku).toBe('SKU-1');
    expect(out.brand).toEqual({'@type': 'Brand', name: 'REINASLEO'});
    expect(out.offers).toMatchObject({
      '@type': 'Offer',
      price: 24500,
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      priceValidUntil: '2027-06-19',
      url: 'https://reinasleo.com/ru/product/p1',
      seller: {'@type': 'Organization', name: 'REINASLEO'},
    });
  });

  it('marks OutOfStock when not in stock', () => {
    expect(buildProductJsonLd({...base, inStock: false}).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });

  it('emits the full image gallery, resolving relative paths against siteUrl', () => {
    const out = buildProductJsonLd({
      ...base,
      images: ['/uploads/a.jpg', 'https://cdn.example.com/b.jpg'],
    });
    expect(out.image).toEqual([
      'https://reinasleo.com/uploads/a.jpg',
      'https://cdn.example.com/b.jpg',
    ]);
  });

  it('filters out empty/null image entries', () => {
    const out = buildProductJsonLd({...base, images: ['', null, undefined, '/x.jpg']});
    expect(out.image).toEqual(['https://reinasleo.com/x.jpg']);
  });

  it('omits the image key entirely when there are no images', () => {
    expect('image' in buildProductJsonLd({...base, images: []})).toBe(false);
    expect('image' in buildProductJsonLd(base)).toBe(false);
  });

  it('does not double a trailing slash on siteUrl when resolving images', () => {
    const out = buildProductJsonLd({...base, siteUrl: 'https://reinasleo.com/', images: ['/a.jpg']});
    expect(out.image).toEqual(['https://reinasleo.com/a.jpg']);
  });
});
