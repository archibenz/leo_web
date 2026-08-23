import {describe, it, expect} from 'vitest';
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {PRODUCT_SLUGS} from '../productSlugs';
import {WHITE_PRODUCTS} from '../../app/[locale]/products';

// The edge middleware decides what is a real address from these two lists, and
// a wrong answer is expensive in both directions: a slug missing from the map
// makes a live garment answer 404, a route segment missing from the middleware
// list makes a whole section answer 404. Neither shows up in a build. Both are
// derived from something authoritative here so drift fails the suite instead.

describe('PRODUCT_SLUGS', () => {
  it('carries every catalogue garment, and nothing that left it', () => {
    const fromCatalogue = Object.fromEntries(WHITE_PRODUCTS.map((p) => [p.key, p.slug]));
    expect(PRODUCT_SLUGS).toEqual(fromCatalogue);
  });
});

describe('middleware route segments', () => {
  it('lists every first segment that has a page behind it', () => {
    const routeDir = join(process.cwd(), 'app', '[locale]');
    const onDisk = readdirSync(routeDir, {withFileTypes: true})
      .filter((e) => e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('_'))
      .map((e) => e.name)
      .sort();

    // Mirrors ROUTE_SEGMENTS in middleware.ts. Kept as a literal rather than
    // imported: middleware.ts pulls in next/server, which does not load under
    // the node test environment.
    const inMiddleware = [
      'account', 'admin', 'auth', 'bag', 'care', 'contact', 'delivery', 'faq',
      'favourites', 'info', 'lookbook', 'offer', 'privacy', 'product', 'sets',
      'shop', 'terms',
    ].sort();

    expect(inMiddleware).toEqual(onDisk);
  });
});
