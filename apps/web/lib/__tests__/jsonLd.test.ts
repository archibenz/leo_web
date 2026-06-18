import {describe, it, expect} from 'vitest';
import {safeJsonLd, buildBreadcrumbJsonLd} from '../jsonLd';

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
