import type {MobileBadge, MobileShopItem, ShopItem} from './types';

const NEW_COUNT = 5;

function readPopularIds(): string[] {
  const raw = process.env.NEXT_PUBLIC_MOBILE_POPULAR_IDS ?? '';
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function mixCatalog(products: ShopItem[]): MobileShopItem[] {
  if (!products.length) return [];

  const popularIds = readPopularIds();
  const newIds = new Set(products.slice(0, NEW_COUNT).map(p => p.id));
  const popularSet = new Set(popularIds);

  const newOnes = products.filter(p => newIds.has(p.id));
  const popularOnes = products.filter(p => popularSet.has(p.id) && !newIds.has(p.id));
  const rest = products.filter(p => !newIds.has(p.id) && !popularSet.has(p.id));

  // Interleave new + popular at the top so the first taps mix both feels.
  const featured: MobileShopItem[] = [];
  const max = Math.max(newOnes.length, popularOnes.length);
  for (let i = 0; i < max; i += 1) {
    if (newOnes[i]) featured.push({...newOnes[i], badge: 'new'});
    if (popularOnes[i]) featured.push({...popularOnes[i], badge: 'popular'});
  }

  const tail: MobileShopItem[] = rest.map(p => ({...p, badge: null as MobileBadge | null}));
  return [...featured, ...tail];
}
