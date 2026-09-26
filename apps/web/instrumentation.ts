// Ошибки серверного рендера и route handlers Next → API сайта →
// аналитика (app_error). Хук Next 15: вызывается на каждую необработанную
// ошибку запроса, в том числе ту, что браузер увидит лишь как digest.
//
// Шлём на API напрямую по внутреннему адресу (API_BASE_INTERNAL), мимо nginx:
// по этому признаку — loopback без X-Real-IP — API и считает источником
// серверный рендер (ClientErrorController). Лучшее усилие: отправка не должна
// задерживать ответ и не имеет права уронить его своей ошибкой.

type RequestErrorContext = {routePath?: string; routeType?: string};

const MAX_MESSAGE = 500;
const MAX_FRAMES = 10;

function frames(stack: string | undefined): string[] {
  if (!stack) return [];
  return stack
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('at ') && !l.includes('node_modules') && !l.includes('node:'))
    .slice(0, MAX_FRAMES)
    .map((l) => l.slice(3, 203));
}

export async function onRequestError(err: unknown, _request: unknown, context: RequestErrorContext): Promise<void> {
  try {
    const e = err instanceof Error ? err : new Error(String(err));
    const base = process.env.API_BASE_INTERNAL || 'http://127.0.0.1:8080';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    await fetch(`${base}/api/client-errors`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        events: [
          {
            kind: 'render',
            errorClass: e.name || 'Error',
            message: (e.message || '').slice(0, MAX_MESSAGE),
            frames: frames(e.stack),
            // Шаблон маршрута Next (/[locale]/product/[slug]), а не адрес.
            route: context?.routePath ?? null,
            release: process.env.NEXT_PUBLIC_RELEASE || undefined,
            count: 1,
          },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
  } catch {
    // Молча: отчёт об ошибке не должен рождать вторую.
  }
}
