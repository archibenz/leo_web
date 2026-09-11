// Слаги витрины для edge-мидлвари: шаг `prebuild`, то есть перед каждым
// `next build` (npm запускает его сам; Dockerfile и деплой зовут `npm run
// build`, CI-job web-build — тоже).
//
// Зачем вообще файл, а не запрос из мидлвари: edge не ходит в базу и не читает
// диск, а `output: 'standalone'` увозит в образ только то, что трассировщик
// увидел в импортах. Модуль, который мидлварь импортирует статически,
// вкомпилируется в её бандл целиком — json рядом с сервером не пережил бы ни
// трассировку, ни отсутствие fs на edge.
//
// Источник — тот же `GET /api/catalog/storefront`, из которого
// `generateStaticParams` берёт список страниц (lib/catalogue/fetch.ts). Адрес
// API считается той же лестницей переменных, что и серверная ветка lib/api.ts:
// разойдись они — сборка нарисовала бы страницы одного каталога, а слаги взяла
// из другого.
//
// ВАЖНО ДЛЯ СЛЕДУЮЩЕГО ШАГА ЭТАПА 2. Список замирает на сборке, и это честно
// ровно пока витрина статическая: `dynamicParams = false` (app/[locale]/
// product/[slug]/page.tsx) и так не отдаёт новый товар без пересборки. Как
// только витрина перейдёт на `revalidateTag('storefront')` и каталог станет
// обновляться без сборки, этот список обязан стать динамическим вместе с ним —
// иначе заведённый из админки товар отрисуется страницей, но мидлварь ответит
// на него 404. Мина та же, что была у замороженной карты lib/productSlugs.ts,
// только с другой стороны.
//
// Молчаливая неудача здесь дороже шумной: пустой список означал бы 404 на весь
// каталог, поэтому любая заминка — это exit 1, а не запись «ничего не нашли».

import {writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'catalogue', 'slugs.generated.ts');
const OUT_LABEL = 'lib/catalogue/slugs.generated.ts';
const TIMEOUT_MS = 15_000;

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

function die(reason) {
  console.error(`\n[product-slugs] сборка остановлена: ${reason}`);
  console.error(`[product-slugs] источник: ${url}`);
  console.error('[product-slugs] без списка слагов edge отвечал бы 404 на весь каталог, поэтому пустой файл не пишется.\n');
  process.exit(1);
}

let payload;
try {
  const res = await fetch(url, {signal: AbortSignal.timeout(TIMEOUT_MS)});
  if (!res.ok) die(`API ответил ${res.status} ${res.statusText}`);
  payload = await res.json();
} catch (error) {
  die(`API недоступен (${error instanceof Error ? error.message : String(error)})`);
}

const products = payload?.products;
if (!Array.isArray(products)) die('в ответе нет массива products');
if (products.length === 0) die('каталог пуст — витрине нечего показывать');

// Только то, что может стоять в адресе как есть. Кириллический или пробельный
// слаг приехал бы на edge процент-кодированным и не совпал бы со строкой из
// этого файла — такой товар молча отдавал бы 404, поэтому лучше уронить сборку.
const SAFE_SLUG = /^[a-zA-Z0-9._~-]+$/;
const slugs = [];
for (const product of products) {
  const slug = product?.slug;
  if (typeof slug !== 'string' || !SAFE_SLUG.test(slug)) {
    die(`товар ${JSON.stringify(product?.id ?? product?.key ?? '?')} несёт слаг ${JSON.stringify(slug)}, непригодный для адреса`);
  }
  slugs.push(slug);
}

// Сортировка — чтобы файл не менялся от перестановки товаров в ответе: тогда
// разница в git означает разницу в каталоге, а не в порядке строк.
const unique = [...new Set(slugs)].sort();

const file = `// СГЕНЕРИРОВАНО scripts/generate-product-slugs.mjs — не править руками.
// Перезаписывается на каждом \`npm run build\` (шаг prebuild) из живого
// \`GET /api/catalog/storefront\`. В git лежит потому, что tsc, vitest и
// \`next dev\` должны собираться без поднятого API; для прода единственный
// источник — сборка.
//
// Читает его middleware.ts: по этому списку edge отличает адрес живого товара
// от выдуманного и ставит 404 на переписыватель next-intl, который иначе
// отдаёт тело «не найдено» со статусом 200.
//
// Пока витрина статическая (\`dynamicParams = false\`), список верен между
// сборками. С переходом на \`revalidateTag('storefront')\` он обязан стать
// динамическим вместе с каталогом — иначе новый товар отрисуется, но получит
// 404 на edge.
export const CATALOGUE_SLUGS: ReadonlySet<string> = new Set([
${unique.map((slug) => `  ${JSON.stringify(slug)},`).join('\n')}
]);
`;

await writeFile(OUT_FILE, file, 'utf8');
console.log(`[product-slugs] ${unique.length} слагов из ${url} → ${OUT_LABEL}`);
