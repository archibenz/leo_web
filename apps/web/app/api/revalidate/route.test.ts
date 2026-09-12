import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {NextRequest} from 'next/server';

// Единственное, что мокается, — сам сброс кэша Next: он лезет в рантайм
// сервера, которого в тесте нет. Сравнение секрета идёт настоящим node:crypto,
// потому что проверять надо именно его.
const revalidateTag = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({revalidateTag}));

const SECRET = 'shared-secret-between-api-and-web';

function request(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://127.0.0.1:3000/api/revalidate', {
    method: 'POST',
    headers,
    body: JSON.stringify({tag: 'storefront'}),
  });
}

describe('POST /api/revalidate', () => {
  const originalSecret = process.env.REVALIDATE_SECRET;

  beforeEach(() => {
    revalidateTag.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.REVALIDATE_SECRET;
    else process.env.REVALIDATE_SECRET = originalSecret;
  });

  async function post(headers: Record<string, string> = {}) {
    const {POST} = await import('./route');
    return POST(request(headers));
  }

  it('отвечает 503, пока секрет не задан — молчаливого «ок» быть не должно', async () => {
    delete process.env.REVALIDATE_SECRET;

    const res = await post({'x-revalidate-secret': SECRET});

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({status: 'unconfigured'});
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('отвечает 401 на чужой секрет и на его отсутствие', async () => {
    process.env.REVALIDATE_SECRET = SECRET;

    // Та же длина, другое содержимое — единственный случай, где реально
    // работает timingSafeEqual. Заголовок обязан быть ASCII: HTTP не носит
    // ничего другого.
    const sameLength = 'z'.repeat(SECRET.length);
    expect(sameLength).toHaveLength(SECRET.length);
    const wrong = await post({'x-revalidate-secret': sameLength});
    expect(wrong.status).toBe(401);

    // Другая длина — timingSafeEqual на ней бросает, если не проверить заранее.
    const short = await post({'x-revalidate-secret': 'x'});
    expect(short.status).toBe(401);

    const missing = await post();
    expect(missing.status).toBe(401);

    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('на верный секрет сбрасывает тег storefront ровно один раз', async () => {
    process.env.REVALIDATE_SECRET = SECRET;

    const res = await post({'x-revalidate-secret': SECRET});

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({revalidated: 'storefront'});
    expect(revalidateTag).toHaveBeenCalledTimes(1);
    expect(revalidateTag).toHaveBeenCalledWith('storefront');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });
});
