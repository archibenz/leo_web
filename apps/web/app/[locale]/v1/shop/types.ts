export interface ShopItem {
  id: string;
  title: string;
  subtitle: string | null;
  occasion: string | null;
  category: string | null;
  color: string | null;
  sizes: string[] | null;
  price: number;
  material: string | null;
  image: string | null;
  images: string | null;
  isTest: boolean;
  inStock: boolean;
  collectionName: string | null;
}

export type MobileBadge = 'new' | 'popular';

export interface MobileShopItem extends ShopItem {
  badge: MobileBadge | null;
}
