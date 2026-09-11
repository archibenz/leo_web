// Слаги витрины для edge-мидлвари. Пишет модуль lib/generated/product-slugs.ts,
// который middleware импортирует статически.
//
// Запускается тремя путями (package.json, vitest.global-setup.ts):
//   prebuild — перед `next build`, СТРОГО: API недоступен → exit 1;
//   predev   — перед `next dev`, с `--allow-stub`;
//   vitest   — из глобального сетапа, с `--allow-stub`.
//
// Разница между режимами принципиальная. В прод ведёт только `prebuild`, и там
// пустой список означал бы 404 на весь каталог, поэтому любая заминка — exit 1.
// В dev и тестах API часто нет вовсе, падать там незачем: пишется валидный
// модуль с ПУСТЫМ списком и пометкой `CATALOGUE_SLUGS_IS_STUB = true`. На
// пустом списке middleware отвечает «не знаю» и пропускает товарный адрес — то
// есть возвращается сегодняшний мягкий 404, что честнее, чем 404 на живых
// товарах. Доехать до прода заглушка не может: `npm run build` падает на
// prebuild, а сборка мимо него (`npx next build`) падает на сверке в
// generateStaticParams — пустой список отстал от каталога по определению.
//
// Зачем файл, а не запрос из мидлвари: edge не ходит в базу и не читает диск, а
// `output: 'standalone'` увозит в образ только то, что трассировщик увидел в
// импортах. Статически импортированный модуль вкомпилируется в бандл мидлвари
// целиком — json рядом с сервером не пережил бы ни трассировку, ни отсутствие
// fs на edge.
//
// Источник — тот же `GET /api/catalog/storefront`, из которого каталог берёт
// сама витрина (lib/catalogue/fetch.ts). Адрес API считается той же лестницей
// переменных, что и серверная ветка lib/api.ts: разойдись они — сборка
// нарисовала бы страницы одного каталога, а слаги взяла из другого.
//
// КОГДА ЭТОТ ФАЙЛ СТАНЕТ МИНОЙ. Витрина НЕ статическая: layout ждёт headers()
// ради CSP-нонса, поэтому ни одна страница не пререндерится, а каталог
// приезжает в рантайме (`fetch` с revalidate 600). Новый товар появляется на
// сайте без пересборки — в пределах десяти минут. Список же замирает на
// сборке. Сегодня это сходится только потому, что товары заводятся вместе с
// выкаткой; как только слаг сможет появиться без сборки (редактор витрины,
// этап 2), карточка отрисуется, а ответ поедет со статусом 404: человек товар
// увидит, поисковик не проиндексирует. Значит вместе с редактором список
// обязан стать динамическим — или проверка обязана уехать с edge.

import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'generated', 'product-slugs.ts');
const OUT_LABEL = 'lib/generated/product-slugs.ts';
const TIMEOUT_MS = 15_000;
const ALLOW_STUB = process.argv.includes('--allow-stub');

// Как lib/api.ts на сервере. CATALOGUE_SOURCE=fixture здесь намеренно не
// поддержан: `next build` идёт с NODE_ENV=production, а там getStorefront()
// фикстуру запрещает — сборке в любом случае нужен живой API.
const apiBase = (
  process.env.API_BASE_INTERNAL
  || process.env.NEXT_PUBLIC_API_BASE
  || process.env.NEXT_PUBLIC_SITE_URL
  || 'http://127.0.0.1:8080'
).replace(/\/+$/, '');

const url = `${apiBase}/api/catalog/storefront`;

const HEADER = `// СГЕНЕРИРОВАНО scripts/generate-product-slugs.mjs — не править руками и не
// коммитить: путь в .gitignore. Пишется перед каждой сборкой (prebuild), перед
// \`next dev\` (predev) и перед тестами (vitest.global-setup.ts).
//
// Читает его middleware.ts: по этому списку edge отличает адрес живого товара
// от выдуманного и ставит 404 на переписыватель next-intl, который иначе
// отдаёт тело «не найдено» со статусом 200.`;

function stubFile(reason) {
  return `${HEADER}
//
// ЗАГЛУШКА: ${reason}
// Список пуст, и middleware на пустом списке пропускает любой товарный адрес —
// в dev и тестах это возвращает мягкий 404, а не 404 на живых товарах. В прод
// такой файл попасть не может: \`npm run build\` падает на prebuild, сборка мимо
// него — на сверке каталога со списком в generateStaticParams.
export const CATALOGUE_SLUGS_IS_STUB = true;
export const CATALOGUE_SLUGS: ReadonlySet<string> = new Set<string>([]);
`;
}

function realFile(slugs) {
  return `${HEADER}
export const CATALOGUE_SLUGS_IS_STUB = false;
export const CATALOGUE_SLUGS: ReadonlySet<string> = new Set([
${slugs.map((slug) => `  ${JSON.stringify(slug)},`).join('\n')}
]);
`;
}

async function write(contents) {
  await mkdir(dirname(OUT_FILE), {recursive: true});
  await writeFile(OUT_FILE, contents, 'utf8');
}

// Строгий режим — останавливаем сборку. Мягкий — пишем заглушку и объясняем.
async function give_up(reason) {
  if (ALLOW_STUB) {
    await write(stubFile(reason));
    console.warn(`[product-slugs] ${reason}`);
    console.warn(`[product-slugs] записана заглушка с пустым списком → ${OUT_LABEL} (годится только для dev и тестов)`);
    process.exit(0);
  }
  console.error(`\n[product-slugs] сборка остановлена: ${reason}`);
  console.error(`[product-slugs] источник: ${url}`);
  console.error('[product-slugs] без списка слагов edge отвечал бы 404 на весь каталог, поэтому пустой файл не пишется.\n');
  process.exit(1);
}

let raw;
try {
  const res = await fetch(url, {signal: AbortSignal.timeout(TIMEOUT_MS)});
  if (!res.ok) await give_up(`API ответил ${res.status} ${res.statusText} (${url})`);
  raw = await res.text();
} catch (error) {
  await give_up(`API недоступен (${url}): ${error instanceof Error ? error.message : String(error)}`);
}

// Разбор отделён от доставки нарочно: по этому адресу может отвечать не API, а
// заглушка nginx или прокси, и тогда причина — «пришёл не JSON», а вовсе не
// «API недоступен». Без этого различия ищут упавший бэкенд вместо конфига.
let payload;
try {
  payload = JSON.parse(raw);
} catch (error) {
  const head = raw.slice(0, 120).replace(/\s+/g, ' ');
  await give_up(
    `ответ по ${url} не разобрался как JSON (${error instanceof Error ? error.message : String(error)}). `
    + `Начало ответа: «${head}». Похоже, по этому адресу отвечает не API — заглушка nginx, прокси или страница ошибки.`,
  );
}

const products = payload?.products;
if (!Array.isArray(products)) await give_up(`в ответе ${url} нет массива products`);
if (products.length === 0) await give_up(`каталог по ${url} пуст — витрине нечего показывать`);

// Только то, что может стоять в адресе как есть. Кириллический или пробельный
// слаг приехал бы на edge процент-кодированным и не совпал бы со строкой из
// этого файла — такой товар молча отдавал бы 404, поэтому лучше уронить сборку.
const SAFE_SLUG = /^[a-zA-Z0-9._~-]+$/;
const slugs = [];
for (const product of products) {
  const slug = product?.slug;
  if (typeof slug !== 'string' || !SAFE_SLUG.test(slug)) {
    await give_up(`товар ${JSON.stringify(product?.id ?? product?.key ?? '?')} несёт слаг ${JSON.stringify(slug)}, непригодный для адреса`);
  }
  slugs.push(slug);
}

// Сортировка — чтобы файл не зависел от порядка товаров в ответе.
const unique = [...new Set(slugs)].sort();

await write(realFile(unique));
console.log(`[product-slugs] ${unique.length} слагов из ${url} → ${OUT_LABEL}`);
