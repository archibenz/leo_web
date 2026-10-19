const GATE_URL = 'http://127.0.0.1:8081/api/v1/auth/web-gate';
const TIMEOUT_MS = 5000;
const NO_STORE = {'Cache-Control': 'no-store, max-age=0', Vary: 'Cookie'};

function statusResponse(status: number) {
  return new Response(null, {status, headers: NO_STORE});
}

export async function checkAnalyticsAccess(request: Request): Promise<Response> {
  const sessions = (request.headers.get('cookie') ?? '').split(';')
    .map(part => part.trim()).filter(part => part.split('=', 1)[0] === 'rl_session');
  const value = sessions.length === 1 ? sessions[0].slice('rl_session='.length) : '';
  if (!value || value.length > 8192 || !/^[A-Za-z0-9._~-]+$/.test(value)) return statusResponse(401);

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error('Analytics access check timed out'));
      }, TIMEOUT_MS);
    });
    // Analytics is a co-hosted service. Never forward another application's
    // cookie or Authorization header: only the Site session identifies this user.
    const upstream = await Promise.race([fetch(GATE_URL, {
      method: 'GET',
      headers: {Cookie: `rl_session=${value}`},
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    }), deadline]);
    void upstream.body?.cancel().catch(() => {});
    return statusResponse([204, 401, 403].includes(upstream.status) ? upstream.status : 503);
  } catch {
    return statusResponse(503);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
