import {describe, it, expect} from 'vitest';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {WHITE_PRODUCTS, WHITE_SETS, WHITE_EDITORIAL, WHITE_HERO_IMAGE, WHITE_ATELIER_IMAGE} from './products';
import {ozonListedKeys} from '../../lib/ozon';

// Every photograph the catalogue names has to be on disk. A missing file does
// not fail the build — next/image answers 404 and the card renders an empty
// frame, which has slipped past review more than once (renaming a garment's
// photos to bust the optimiser's 24h cache is exactly when a path goes stale).
// This is the cheap check that catches it before a deploy does.

const PUBLIC = join(process.cwd(), 'public');
const onDisk = (webPath: string) => existsSync(join(PUBLIC, webPath));

function everyPathOf(p: (typeof WHITE_PRODUCTS)[number]): string[] {
  return [
    p.image,
    ...(p.gallery ?? []),
    ...p.colors.flatMap((c) => [c.image, ...(c.gallery ?? [])].filter((x): x is string => Boolean(x))),
  ];
}

describe('White catalogue integrity', () => {
  it.each(WHITE_PRODUCTS.map((p) => [p.ru, p] as const))('%s — every photograph exists', (_name, product) => {
    const missing = everyPathOf(product).filter((path) => !onDisk(path));
    expect(missing).toEqual([]);
  });

  it('set photographs exist', () => {
    const missing = WHITE_SETS.map((s) => s.image).filter((path) => !onDisk(path));
    expect(missing).toEqual([]);
  });

  it('editorial imagery exists', () => {
    const missing = [WHITE_HERO_IMAGE, WHITE_ATELIER_IMAGE, ...WHITE_EDITORIAL].filter((path) => !onDisk(path));
    expect(missing).toEqual([]);
  });

  it('keys and slugs are unique — a duplicate silently shadows a product', () => {
    const keys = WHITE_PRODUCTS.map((p) => p.key);
    const slugs = WHITE_PRODUCTS.map((p) => p.slug);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every set names products that are actually in the catalogue', () => {
    const keys = new Set(WHITE_PRODUCTS.map((p) => p.key));
    const orphans = WHITE_SETS.flatMap((s) => s.productKeys.filter((k) => !keys.has(k)));
    expect(orphans).toEqual([]);
  });

  it('a garment carries either a real price or nothing to sell', () => {
    // A zero or negative price would render as "0 ₽" and take an order. No
    // price at all is legitimate — a preorder-only piece labels itself instead.
    expect(WHITE_PRODUCTS.filter((p) => p.price != null && !(p.price > 0)).map((p) => p.ru)).toEqual([]);
  });

  it('every Ozon link belongs to a garment that is in the catalogue', () => {
    // A link keyed to a product that was pulled from the catalogue is invisible
    // — nothing reads it, so nothing complains, and it silently fails to come
    // back when the garment does. One did sit here for exactly that reason.
    const keys = new Set(WHITE_PRODUCTS.map((p) => p.key));
    const dangling = ozonListedKeys().filter((k) => !keys.has(k));
    expect(dangling).toEqual([]);
  });
});
