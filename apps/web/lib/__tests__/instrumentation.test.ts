import {afterEach, describe, expect, it, vi} from 'vitest';
import {onRequestError} from '../../instrumentation';

// Серверный рендер Next → API сайта (instrumentation.ts). Ошибку, которую
// браузер видит лишь как digest, знает только сервер — и только отсюда она
// попадает в аналитику.
describe('onRequestError', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('шлёт render с шаблоном маршрута, а не адресом', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 202}));
    vi.stubGlobal('fetch', fetchMock);

    const err = new TypeError('cannot read price');
    await onRequestError(err, {path: '/ru/product/palto?token=secret'}, {routePath: '/[locale]/product/[slug]'});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/api\/client-errors$/);
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.events[0]).toMatchObject({
      kind: 'render',
      errorClass: 'TypeError',
      message: 'cannot read price',
      route: '/[locale]/product/[slug]',
    });
    expect(JSON.stringify(body)).not.toContain('secret');
  });

  it('недоступный API не роняет ответ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(onRequestError(new Error('x'), {}, {})).resolves.toBeUndefined();
  });
});
