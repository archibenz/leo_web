// «Куда ведёт» строки бегущей строки — выбор словами, а не свободный текст.
// Владелец однажды вписал сюда «Коллекция» и получил 400: TickerItemRequest.href
// требует путь вида /ru/sets, а откуда его взять — ниоткуда не следовало.
// Эти две функции — единственное место, которое знает, как выбор превращается
// в href и обратно: TickerForm их не изобретает, а зовёт.

export type TickerDestinationKind = 'none' | 'shop' | 'sets' | 'lookbook' | 'product' | 'custom';

// Слаг маршрута для трёх статических назначений — единственное место, где он
// написан. app/[locale]/{shop,sets,lookbook}/page.tsx — те же три страницы.
const STATIC_SLUG: Record<'shop' | 'sets' | 'lookbook', string> = {
  shop: 'shop',
  sets: 'sets',
  lookbook: 'lookbook',
};

const STATIC_KINDS = Object.keys(STATIC_SLUG) as (keyof typeof STATIC_SLUG)[];

export function hrefForDestination({kind, locale, productSlug, customHref}: {
  kind: TickerDestinationKind;
  locale: string;
  productSlug: string;
  customHref: string;
}): string | null {
  if (kind === 'none') return null;
  if (kind === 'product') return productSlug ? `/${locale}/product/${productSlug}` : null;
  if (kind === 'custom') return customHref.trim() ? customHref.trim() : null;
  return `/${locale}/${STATIC_SLUG[kind]}`;
}

export type TickerDestination = {kind: TickerDestinationKind; productSlug: string; customHref: string};

// Обратный разбор — форма открывается со строкой, у которой уже есть href
// (свежедобавленной или сохранённой раньше), и обязана показать, какой пункт
// списка ему соответствует, а не молча превращать его в «Своя ссылка».
//
// Неизвестный href (чужая локаль, слаг товара, которого больше нет в
// каталоге, произвольный путь) уходит в 'custom' СО СВОИМ значением, а не
// теряется — иначе открыть строку с уже сохранённым href значило бы стереть
// её адрес первой же перерисовкой формы.
export function destinationFromHref(
  href: string | null | undefined,
  locale: string,
  productSlugs: readonly string[],
): TickerDestination {
  if (!href) return {kind: 'none', productSlug: '', customHref: ''};

  for (const kind of STATIC_KINDS) {
    if (href === `/${locale}/${STATIC_SLUG[kind]}`) return {kind, productSlug: '', customHref: ''};
  }

  const productPrefix = `/${locale}/product/`;
  if (href.startsWith(productPrefix)) {
    const slug = href.slice(productPrefix.length);
    if (productSlugs.includes(slug)) return {kind: 'product', productSlug: slug, customHref: ''};
  }

  return {kind: 'custom', productSlug: '', customHref: href};
}

// Ровно то же правило, что TickerItemRequest.href на бэкенде
// (apps/api/.../dto/admin/storefront/TickerItemRequest.java): свой путь,
// без схемы, без protocol-relative //хост, без ../ вверх по дереву. Держать
// в синхроне вручную — своя проверка на клиенте не переиспользует Java-код,
// но правило и его причина (защита от открытого редиректа) одни и те же.
export const LOCAL_HREF_PATTERN = /^\/(?!\/)(?!.*\.\.)\S*$/;

export function isLocalHref(value: string): boolean {
  return LOCAL_HREF_PATTERN.test(value);
}
