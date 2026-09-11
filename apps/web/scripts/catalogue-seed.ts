import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {WHITE_PRODUCTS, WHITE_SETS, WHITE_SIZES, type WhiteProduct, type WhiteColor} from '../app/[locale]/products';

// Детерминированные UUID (v5-подобные: sha1 от имени) — миграция воспроизводима
// и повторный запуск даёт тот же SQL.
const NS = 'reinasleo-storefront-';
function uuid(name: string): string {
  const h = createHash('sha1').update(NS + name).digest('hex').slice(0, 32).split('');
  h[12] = '5';
  h[16] = ((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
const q = (s: string | undefined | null) => (s == null ? 'NULL' : `$q$${s}$q$`);
const n = (v: number | undefined | null) => (v == null ? 'NULL' : String(v));
const arr = (xs: readonly string[]) => `ARRAY[${xs.map((x) => `'${x}'`).join(',')}]`;
const jsonb = (v: unknown) => `$j$${JSON.stringify(v)}$j$::jsonb`;

const ru = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'ru.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'en.json'), 'utf8'));

const L = (m: any, path: string) => path.split('.').reduce((o, k) => o?.[k], m) as string | undefined;

// Тексты витринных секций живут в переводах: пропавший ключ обязан свалить
// генератор, а не уехать в миграцию как NULL.
for (const k of [
  'white.landing.season',
  'white.landing.heroLine1',
  'white.landing.heroLine2',
  'white.sets.eyebrow',
  'white.sets.landingTitle1',
  'white.sets.landingTitle2',
  'white.sets.landingBody',
]) {
  if (!L(ru, k)) throw new Error(`missing ru message key: ${k}`);
  if (!L(en, k)) throw new Error(`missing en message key: ${k}`);
}

const out: string[] = [
  '-- V30: данные витрины, перенесённые из apps/web/app/[locale]/products.ts',
  '-- Сгенерировано scripts/catalogue-seed.ts 2026-09-11. Не править руками: после этой миграции',
  '-- источник правды — база, правки идут через админку.',
  'UPDATE products SET active = false WHERE is_test = true;',
];

function variantPrice(p: WhiteProduct, c: WhiteColor) {
  // Цвет со своей ценой не наследует скидку модели: она относилась к цене модели.
  return c.price != null ? {price: c.price, sale: c.sale} : {price: p.price, sale: p.sale};
}

WHITE_PRODUCTS.forEach((p, i) => {
  const mid = uuid(`model:${p.slug}`);
  out.push(`INSERT INTO product_models (id, model_key, slug, name_ru, name_en, category, desc_ru, desc_en, story_ru, story_en, composition_ru, composition_en, care_ru, care_en, sizes, image, gallery, season, sort_order) VALUES ('${mid}', ${p.key}, ${q(p.slug)}, ${q(p.ru)}, ${q(p.en)}, '${p.cat}', ${q(p.descRu)}, ${q(p.descEn)}, ${q(p.storyRu)}, ${q(p.storyEn)}, ${q(p.compositionRu)}, ${q(p.compositionEn)}, ${q(p.careRu)}, ${q(p.careEn)}, ${arr(p.sizes ?? WHITE_SIZES)}, ${q(p.image)}, ${jsonb(p.gallery ?? [])}, ${q(p.season)}, ${i}) ON CONFLICT (id) DO NOTHING;`);
  p.colors.forEach((c, j) => {
    if (c.nm == null) throw new Error(`variant without nm: ${p.slug}/${c.key}`);
    const {price, sale} = variantPrice(p, c);
    const images = (c.gallery ?? []).map((src) => ({src, alt: ''}));
    out.push(`INSERT INTO products (id, title, price, sale_price, image, images, category, sizes, model_id, color_key, color_hex, color_name_ru, color_name_en, nm, color, sku, stock_quantity, active, is_test, sort_order) VALUES ('wb-${c.nm}', ${q(`${p.ru} — ${c.ru}`)}, ${n(price)}, ${n(sale)}, ${q(c.image ?? p.image)}, ${jsonb(images)}, '${p.cat}', ${arr(p.sizes ?? WHITE_SIZES)}, '${mid}', ${q(c.key)}, ${q(c.hex)}, ${q(c.ru)}, ${q(c.en)}, ${c.nm}, ${q(c.key)}, 'WB-${c.nm}', 0, true, false, ${j}) ON CONFLICT (id) DO NOTHING;`);
  });
});

// Главная и лукбук: порядок из WhiteShowcase.tsx (FEATURED) и WhiteLookbookShowcase.tsx (LOOKS)
[2, 1, 3, 4, 8, 6].forEach((k, i) => out.push(`UPDATE product_models SET featured_order = ${i} WHERE model_key = ${k};`));
[2, 1, 6, 4, 8].forEach((k, i) => out.push(`UPDATE product_models SET lookbook_order = ${i} WHERE model_key = ${k};`));

WHITE_SETS.forEach((s, i) => {
  const sid = uuid(`set:${s.key}`);
  out.push(`INSERT INTO product_sets (id, key, name_ru, name_en, desc_ru, desc_en, image, sort_order) VALUES ('${sid}', ${q(s.key)}, ${q(s.ru)}, ${q(s.en)}, ${q(s.descRu)}, ${q(s.descEn)}, ${q(s.image)}, ${i}) ON CONFLICT (id) DO NOTHING;`);
  s.productKeys.forEach((k, j) => {
    const p = WHITE_PRODUCTS.find((x) => x.key === k)!;
    const wanted = s.colours?.[k];
    const colour = (wanted && p.colors.find((c) => c.key === wanted)) || p.colors[0]!;
    out.push(`INSERT INTO product_set_items (id, set_id, product_id, position) VALUES ('${uuid(`setitem:${s.key}:${k}`)}', '${sid}', 'wb-${colour.nm}', ${j}) ON CONFLICT (set_id, product_id) DO NOTHING;`);
  });
});

out.push(`INSERT INTO storefront_sections (id, slug, layout, status, name_ru, name_en, eyebrow_ru, eyebrow_en, headline_ru, headline_en, video_url, video_desktop_url, poster_url, poster_desktop_url, sort_order) VALUES ('${uuid('section:aw26-hero')}', 'aw26-hero', 'hero', 'active', ${q(L(ru, 'white.landing.season'))}, ${q(L(en, 'white.landing.season'))}, ${q(L(ru, 'white.landing.season'))}, ${q(L(en, 'white.landing.season'))}, ${q(`${L(ru, 'white.landing.heroLine1')}\n${L(ru, 'white.landing.heroLine2')}`)}, ${q(`${L(en, 'white.landing.heroLine1')}\n${L(en, 'white.landing.heroLine2')}`)}, '/videos/white/hero-mark2.mp4', '/videos/white/hero-desktop.mp4', '/images/white/hero-mark2.jpg', '/images/white/hero-desktop.jpg', 0) ON CONFLICT (id) DO NOTHING;`);
out.push(`INSERT INTO storefront_sections (id, slug, layout, status, name_ru, name_en, eyebrow_ru, eyebrow_en, headline_ru, headline_en, body_ru, body_en, video_url, poster_url, sort_order) VALUES ('${uuid('section:sets-teaser')}', 'sets-teaser', 'sets-teaser', 'active', ${q(L(ru, 'white.sets.landingTitle1'))}, ${q(L(en, 'white.sets.landingTitle1'))}, ${q(L(ru, 'white.sets.eyebrow'))}, ${q(L(en, 'white.sets.eyebrow'))}, ${q(`${L(ru, 'white.sets.landingTitle1')}\n${L(ru, 'white.sets.landingTitle2')}`)}, ${q(`${L(en, 'white.sets.landingTitle1')}\n${L(en, 'white.sets.landingTitle2')}`)}, ${q(L(ru, 'white.sets.landingBody'))}, ${q(L(en, 'white.sets.landingBody'))}, '/videos/white/sets-static.mp4', '/images/white/sets-static.jpg', 1) ON CONFLICT (id) DO NOTHING;`);

process.stdout.write(out.join('\n') + '\n');
