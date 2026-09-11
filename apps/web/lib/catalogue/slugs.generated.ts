// СГЕНЕРИРОВАНО scripts/generate-product-slugs.mjs — не править руками.
// Перезаписывается на каждом `npm run build` (шаг prebuild) из живого
// `GET /api/catalog/storefront`. В git лежит потому, что tsc, vitest и
// `next dev` должны собираться без поднятого API; для прода единственный
// источник — сборка.
//
// Читает его middleware.ts: по этому списку edge отличает адрес живого товара
// от выдуманного и ставит 404 на переписыватель next-intl, который иначе
// отдаёт тело «не найдено» со статусом 200.
//
// Пока витрина статическая (`dynamicParams = false`), список верен между
// сборками. С переходом на `revalidateTag('storefront')` он обязан стать
// динамическим вместе с каталогом — иначе новый товар отрисуется, но получит
// 404 на edge.
export const CATALOGUE_SLUGS: ReadonlySet<string> = new Set([
  "bluzka-shkolnaya-s-volanami",
  "bryuki-alladiny",
  "korset-vecherniy-s-baskoy",
  "kurtka-bomber-zamsha",
  "lnyanoy-kostyum-s-yubkoy-maksi",
  "palto-kimono-drapovoe",
  "palto-kimono-korotkoe",
  "palto-oversayz-s-poyasom",
  "palto-pidzhak-pritalennoe",
  "rubashka-oversayz-s-kruzhevom",
  "rubashka-s-baskoy",
  "sportivnyy-kostyum-s-kantom",
  "svitshot-s-bantikami",
  "yubka-ballon-atlasnaya",
  "yubka-karandash-s-kruzhevnym-podyubnikom",
  "yubka-mini-plisse-zamshevaya",
  "yubka-plisse-dlinnaya-s-kruzhevom",
  "yubka-shorty-zamshevaya",
  "zhilet-kostyumnyy-s-baskoy",
  "zhilet-s-baskoy-i-kruzhevom",
]);
