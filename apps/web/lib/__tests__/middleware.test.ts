import {describe, it, expect} from 'vitest';
import {readdirSync} from 'node:fs';
import {join} from 'node:path';
import {NextRequest} from 'next/server';
import middleware from '../../middleware';
import {CATALOGUE_SLUGS} from '../catalogue/slugs.generated';

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
//
// What this file can and cannot prove: it runs the real middleware, so it sees
// the decision, but not the status the browser receives — that one is settled
// on the next-intl rewrite inside a built app, which is why e2e/tests/
// 07-soft-404-status.spec.ts exists. The previous version of this file expected
// `/ru/product/anything` to be 200 and passed while production served a soft
// 404: an expectation dictated by the change it was meant to guard proves
// nothing.
const edgeStatus = (path: string) => middleware(new NextRequest(new URL(`https://reinasleo.com${path}`))).status;

// Whatever the build put in the list — the same value middleware compares
// against, so the case cannot drift away from the catalogue.
const KNOWN_SLUG = [...CATALOGUE_SLUGS][0]!;

describe('middleware dead ends', () => {
  it('has a catalogue to check product slugs against', () => {
    // An empty list would 404 every garment on the site. scripts/
    // generate-product-slugs.mjs refuses to write one; this fails the suite if
    // the file is ever hand-edited into that state.
    expect(CATALOGUE_SLUGS.size).toBeGreaterThan(0);
  });

  it('404s a product slug the catalogue does not carry', () => {
    expect(edgeStatus('/ru/product/anything')).toBe(404);
    // Depth it can still judge: there is no route below /product/<slug>.
    expect(edgeStatus('/ru/product/a/b')).toBe(404);
  });

  it('leaves a slug the catalogue does carry alone', () => {
    expect(edgeStatus(`/ru/product/${KNOWN_SLUG}`)).toBe(200);
    // /product itself is a page (the legacy ?p=<key> address), not a dead end.
    expect(edgeStatus('/ru/product')).toBe(200);
  });

  it('still 404s a segment that has no page at all', () => {
    expect(edgeStatus('/ru/nonsense')).toBe(404);
    expect(edgeStatus('/ru/shop')).toBe(200);
  });
});
