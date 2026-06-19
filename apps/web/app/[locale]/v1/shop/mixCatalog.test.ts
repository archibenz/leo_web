import {afterEach, describe, it, expect, vi} from 'vitest';
import {mixCatalog} from './mixCatalog';
import type {ShopItem} from './types';

const mk = (id: string): ShopItem => ({
  id,
  title: `Item ${id}`,
  subtitle: null,
  occasion: null,
  category: null,
  color: null,
  sizes: null,
  price: 1000,
  material: null,
  image: null,
  images: null,
  isTest: false,
  inStock: true,
  collectionName: null,
});

const seq = (n: number) => Array.from({length: n}, (_, i) => mk(`p${i}`));
const ids = (arr: {id: string}[]) => arr.map((x) => x.id);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('mixCatalog', () => {
  it('returns an empty list for empty input', () => {
    expect(mixCatalog([])).toEqual([]);
  });

  it('badges the first five products as new when no popular env is set', () => {
    const out = mixCatalog(seq(7));
    expect(out).toHaveLength(7);
    expect(out.slice(0, 5).every((i) => i.badge === 'new')).toBe(true);
    expect(out.slice(5).every((i) => i.badge === null)).toBe(true);
  });

  it('keeps order — first-five new, then the rest as the tail', () => {
    expect(ids(mixCatalog(seq(7)))).toEqual(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  });

  it('interleaves env-listed popular products with new at the top', () => {
    vi.stubEnv('NEXT_PUBLIC_MOBILE_POPULAR_IDS', 'p5,p6');
    const out = mixCatalog(seq(7));
    // featured = interleave(new[p0..p4], popular[p5,p6]); no tail (all featured)
    expect(ids(out)).toEqual(['p0', 'p5', 'p1', 'p6', 'p2', 'p3', 'p4']);
    expect(out.find((i) => i.id === 'p5')!.badge).toBe('popular');
    expect(out.find((i) => i.id === 'p0')!.badge).toBe('new');
  });

  it('lets new win when a product is both in the first five and popular (no duplicate)', () => {
    vi.stubEnv('NEXT_PUBLIC_MOBILE_POPULAR_IDS', 'p0,p6');
    const out = mixCatalog(seq(7));
    expect(out.filter((i) => i.id === 'p0')).toHaveLength(1);
    expect(out.find((i) => i.id === 'p0')!.badge).toBe('new');
    expect(out.find((i) => i.id === 'p6')!.badge).toBe('popular');
  });

  it('puts non-new, non-popular products in the tail with a null badge', () => {
    vi.stubEnv('NEXT_PUBLIC_MOBILE_POPULAR_IDS', 'p6');
    const out = mixCatalog(seq(8));
    // new: p0..p4, popular: p6 → tail: p5, p7
    expect(ids(out.filter((i) => i.badge === null))).toEqual(['p5', 'p7']);
  });

  it('ignores blank / whitespace entries in the popular env list', () => {
    vi.stubEnv('NEXT_PUBLIC_MOBILE_POPULAR_IDS', ' p6 , , p7 ');
    const out = mixCatalog(seq(8));
    expect(out.find((i) => i.id === 'p6')!.badge).toBe('popular');
    expect(out.find((i) => i.id === 'p7')!.badge).toBe('popular');
  });
});
