// Key → slug map for the retired /product?p=<key> address.
//
// Lives apart from products.ts on purpose: middleware runs on the edge and
// importing the catalogue would drag ~280 image paths into every request.
// Generated from the catalogue — keep in step when a garment is added.
export const PRODUCT_SLUGS: Record<number, string> = {
  1: 'lnyanoy-kostyum-s-yubkoy-maksi',
  2: 'palto-pidzhak-pritalennoe',
  3: 'zhilet-kostyumnyy-s-baskoy',
  4: 'svitshot-s-bantikami',
  5: 'yubka-karandash-s-kruzhevnym-podyubnikom',
  6: 'korset-vecherniy-s-baskoy',
  7: 'bryuki-alladiny',
  8: 'yubka-ballon-atlasnaya',
  9: 'rubashka-oversayz-s-kruzhevom',
  10: 'yubka-shorty-zamshevaya',
  11: 'palto-oversayz-s-poyasom',
  15: 'palto-kimono-drapovoe',
  16: 'palto-kimono-korotkoe',
  18: 'zhilet-s-baskoy-i-kruzhevom',
  19: 'bluzka-shkolnaya-s-volanami',
  20: 'kurtka-bomber-zamsha',
  21: 'sportivnyy-kostyum-s-kantom',
  22: 'yubka-mini-plisse-zamshevaya',
  23: 'yubka-plisse-dlinnaya-s-kruzhevom',
  24: 'rubashka-s-baskoy',
};
