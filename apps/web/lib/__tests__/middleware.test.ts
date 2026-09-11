import {describe, it, expect} from 'vitest';
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {NextRequest} from 'next/server';
import middleware from '../../middleware';

// The edge middleware decides what is a real address, and a wrong answer is
// expensive in both directions: a route segment missing from its list makes a
// whole section answer 404, and a segment it polices too eagerly 404s live
// content. Neither shows up in a build, so both are checked here.

describe('middleware route segments', () => {
  it('lists every first segment that has a page behind it', () => {
    const routeDir = join(process.cwd(), 'app', '[locale]');
    const onDisk = readdirSync(routeDir, {withFileTypes: true})
      .filter((e) => e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('_'))
      .map((e) => e.name)
      .sort();

    // Mirrors ROUTE_SEGMENTS in middleware.ts, which keeps it module-private —
    // the list is an edge implementation detail, not an export.
    const inMiddleware = [
      'account', 'admin', 'auth', 'bag', 'care', 'contact', 'delivery', 'faq',
      'favourites', 'info', 'lookbook', 'offer', 'privacy', 'product', 'sets',
      'shop', 'terms',
    ].sort();

    expect(inMiddleware).toEqual(onDisk);
  });
});

// The status the edge puts on a page request — 404 only where middleware is
// certain there is nothing behind the address.
const edgeStatus = (path: string) => middleware(new NextRequest(new URL(`https://reinasleo.com${path}`))).status;

describe('middleware dead ends', () => {
  it('unknown product slug is not a dead end for the edge', () => {
    // Slugs live in the database; the edge has no list to check them against,
    // so the page decides — `dynamicParams = false` gives an honest 404 there.
    expect(edgeStatus('/ru/product/anything')).toBe(200);
    // Depth it can still judge: there is no route below /product/<slug>.
    expect(edgeStatus('/ru/product/a/b')).toBe(404);
  });

  it('still 404s a segment that has no page at all', () => {
    expect(edgeStatus('/ru/nonsense')).toBe(404);
    expect(edgeStatus('/ru/shop')).toBe(200);
  });
});
