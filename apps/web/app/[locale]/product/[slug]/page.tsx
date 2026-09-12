import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {notFound} from 'next/navigation';
import WhitePdpShowcase from '../WhitePdpShowcase';
import {getStockSnapshot, wbHasStock} from '../../../../lib/stock';
import {getStorefront} from '../../../../lib/catalogue/fetch';
import {storefrontForViewer, wantsEditing} from '../../../../lib/catalogue/viewer';
import {EditorProvider} from '../../../../components/editor/EditorProvider';
import EditorUnavailable from '../../../../components/editor/EditorUnavailable';
import {CATALOGUE_SLUGS} from '../../../../lib/generated/product-slugs';
import {findProductBySlug, whiteProductHref, whitePriceRange} from '../../../../lib/catalogue/select';
import {safeJsonLd, buildBreadcrumbJsonLd} from '../../../../lib/jsonLd';
import {SITE_URL} from '../../../../lib/siteUrl';
import {buildProductMeta} from '../../../../lib/productMeta';
import {brandCardUrl} from '../../../../lib/openGraph';

// Product page on its own readable address — /<locale>/product/<slug>. The old
// /product?p=<key> form 301s here (see ../page.tsx) so existing links survive.

type Props = {
  params: Promise<{locale: string; slug: string}>;
  // `?edit=1` — режим правки: цена, скидка, наличие и галерея цветового
  // варианта правятся на той самой странице, где покупатель их видит.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// Остаётся страховкой, но сегодня ничего не решает: ни одна страница
// не пререндерится (лейаут локали ждёт headers() ради CSP-нонса), каталог
// приезжает в рантайме, и слаг, которого не было на сборке, спокойно
// рисуется — проверено на стенде. Тело «не найдено» рисует notFound() ниже,
// а статус ставит middleware: переписыватель next-intl иначе отдаёт 200.
export const dynamicParams = false;

// Stock is read per request from a snapshot on disk, so the page must not be
// frozen at build time. Revalidating every ten minutes keeps it a cached static
// response for almost every visitor while never showing yesterday's shelf.
export const revalidate = 600;

// Ходит в API на сборке — API должен быть поднят до `next build`. Статического
// HTML это сейчас не даёт (см. dynamicParams выше), но остаётся единственным
// местом, где сборка держит в руках весь каталог сразу — и потому единственным,
// где есть с чем сверить список слагов для edge.
export async function generateStaticParams() {
  const {products} = await getStorefront();
  // Сторож сборки. Каталог здесь и список слагов у middleware — две выводки
  // из одного ответа API: список пишет шаг prebuild
  // (scripts/generate-product-slugs.mjs) перед этой сборкой. Разошлись —
  // значит собрали мимо `npm run build` или подсунули dev-заглушку с пустым
  // списком; и то и другое в проде означает неверные коды ответа.
  //
  // Сверка только с опасной стороны: слага нет в списке — падаем, лишний
  // старый слаг в списке безвреден (мягкий 404 на снятом товаре — отдельная
  // задача). В dev и тестах не сторожит: там живёт и фикстура, и база
  // разработчика, и заглушка без API. Проверено, что эта функция выполняется
  // только на сборке: с разошедшимся каталогом в рантайме страницы отвечают
  // как обычно, никакого исключения не бросается.
  if (process.env.NODE_ENV === 'production') {
    const missing = products.map((p) => p.slug).filter((slug) => !CATALOGUE_SLUGS.has(slug));
    if (missing.length > 0) {
      throw new Error(
        `список слагов для edge отстал от каталога (нет: ${missing.join(', ')}). `
        + 'Запустите сборку как `npm run build` — шаг prebuild перепишет lib/generated/product-slugs.ts из живого каталога.',
      );
    }
  }
  return products.flatMap((p) =>
    ['en', 'ru'].map((locale) => ({locale, slug: p.slug})),
  );
}

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale, slug} = await params;
  const {products} = await getStorefront();
  const product = findProductBySlug(products, slug);
  if (!product) notFound();
  const ru = locale === 'ru';
  const name = ru ? product.ru : product.en;
  const description = ru ? product.descRu : product.descEn;
  const href = whiteProductHref(locale, product);
  const ogImage = product.image ? `${SITE_URL}${product.image}` : brandCardUrl(locale);
  return {
    title: {absolute: `${name} · REINASLEO`},
    alternates: {
      canonical: href,
      // Both locales serve the same slug, so the alternates are a plain swap.
      languages: {
        ru: `/ru/product/${product.slug}`,
        en: `/en/product/${product.slug}`,
      },
    },
    description,
    robots: {index: true, follow: true},
    ...buildProductMeta({
      brandPrefix: '',
      title: name,
      description,
      url: `${SITE_URL}${href}`,
      locale,
      image: ogImage,
    }),
  };
}

export default async function WhiteProductSlugPage({params, searchParams}: Props) {
  const {locale, slug} = await params;
  const view = await storefrontForViewer(wantsEditing(await searchParams));
  if (view.storefront === null) return <EditorUnavailable plainHref={`/${locale}/product/${slug}`} reason={view.previewError} />;
  const {products, sets} = view.storefront;
  const product = findProductBySlug(products, slug);
  if (!product) notFound();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const onWildberries = wbHasStock(await getStockSnapshot(), product.nm);
  const ru = locale === 'ru';
  const url = `${SITE_URL}${whiteProductHref(locale, product)}`;

  // Every frame the page can show, deduped — colour albums included, so image
  // search sees the whole shoot rather than the single opening shot.
  const images = [
    product.image,
    ...(product.gallery ?? []),
    ...product.colors.flatMap((c) => [c.image, ...(c.gallery ?? [])]),
  ].filter((src): src is string => Boolean(src));

  const priceRange = whitePriceRange(product);

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ru ? product.ru : product.en,
    description: ru ? product.descRu : product.descEn,
    image: [...new Set(images)].map((src) => `${SITE_URL}${src}`),
    sku: String(product.nm),
    mpn: String(product.nm),
    brand: {'@type': 'Brand', name: 'REINASLEO'},
    category: ru ? product.ru : product.en,
    material: ru ? product.compositionRu : product.compositionEn,
    // Colour variants are a real buying signal — spelling them out lets the
    // listing answer "is it in olive?" straight from the search result.
    color: product.colors.map((c) => (ru ? c.ru : c.en)).join(', '),
    // A priceless preorder piece publishes no offer at all: an Offer without a
    // price is invalid for rich results, and inventing one would be worse.
    ...(product.price == null ? {} : {offers: {
      // Colourways are priced separately, and a single `price` would advertise
      // one colour's number for all of them — AggregateOffer is the shape
      // schema.org has for exactly that.
      ...(priceRange.varies
        ? {'@type': 'AggregateOffer', lowPrice: priceRange.min, highPrice: priceRange.max, offerCount: product.colors.length}
        : {'@type': 'Offer', price: product.sale ?? product.price}),
      priceCurrency: 'RUB',
      // No `availability` on purpose. Nothing here knows what is actually in
      // stock — the catalogue is a static file and the count lives at
      // Wildberries. Declaring InStock for everything told search all 18
      // garments were on the shelf, and a sold-out piece would keep showing as
      // available until someone noticed. Omitting the field claims nothing;
      // restore it once stock is wired up (Ozon integration is the plan).
      itemCondition: 'https://schema.org/NewCondition',
      url,
      seller: {'@type': 'Organization', name: 'REINASLEO'},
    }}),
  };

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    {name: 'REINASLEO', url: `${SITE_URL}/${locale}`},
    {name: ru ? 'Магазин' : 'Shop', url: `${SITE_URL}/${locale}/shop`},
    {name: ru ? product.ru : product.en, url},
  ]);

  return (
    <>
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(productJsonLd)}} />
      <script type="application/ld+json" nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{__html: safeJsonLd(breadcrumbJsonLd)}} />
      <EditorProvider editing={view.editing} brokenDrafts={view.storefront.brokenDrafts}>
        <WhitePdpShowcase locale={locale} product={product} products={products} sets={sets} onWildberries={onWildberries} />
      </EditorProvider>
    </>
  );
}
