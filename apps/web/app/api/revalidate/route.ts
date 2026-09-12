import {revalidateTag} from 'next/cache';
import {NextResponse, type NextRequest} from 'next/server';
import {timingSafeEqual} from 'node:crypto';

// Сброс кэша данных Next после публикации правки витрины. Дёргает бэкенд
// (NextRevalidator.java) сразу после того, как черновик уехал в колонки.
//
// Без этой ручки правка доезжает до покупателя до ~15 минут: Caffeine 5 мин +
// max-age=60 на эндпоинте + revalidate 600 в lib/catalogue/fetch.ts. Первый
// слой снимает @CacheEvict на бэкенде, третий — этот вызов.
//
// ВАЖНО про адрес: nginx проксирует ВЕСЬ /api/* в Spring Boot, поэтому публичный
// https://reinasleo.com/api/revalidate сюда не попадёт — он уйдёт в бэкенд.
// Бэкенд обязан звать процесс Next напрямую по внутреннему адресу
// (WEB_REVALIDATE_URL=http://127.0.0.1:3000/api/revalidate). Тем же путём
// ходят /newsletter и /preorder, только они вынесены из /api/ целиком.

const NO_STORE_HEADERS = {'Cache-Control': 'no-store, max-age=0'} as const;
const SECRET_HEADER = 'x-revalidate-secret';
const STOREFRONT_TAG = 'storefront';

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // timingSafeEqual бросает на разной длине — сравниваем её отдельно. Длина
  // секрета не тайна, его содержимое тайна.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected) {
    return NextResponse.json({status: 'unconfigured'}, {status: 503, headers: NO_STORE_HEADERS});
  }

  const provided = req.headers.get(SECRET_HEADER);
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({status: 'forbidden'}, {status: 401, headers: NO_STORE_HEADERS});
  }

  revalidateTag(STOREFRONT_TAG);
  return NextResponse.json({revalidated: STOREFRONT_TAG}, {status: 200, headers: NO_STORE_HEADERS});
}
