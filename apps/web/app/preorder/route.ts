import {NextResponse, type NextRequest} from 'next/server';
import {isValidEmail} from '../../lib/validation';
import {sendPreorderRequest} from '../../lib/resend';

// Pre-orders for garments that are nowhere to be bought. Deliberately a sibling
// of /newsletter rather than a route under /api: nginx sends /api/ to Spring,
// so anything Next has to answer itself lives outside that prefix.
//
// Same shape of guard as the newsletter route — the numbers are tighter because
// this one sends mail to a human inbox, and a flood there costs attention
// rather than a row in an audience.

const RATE_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_BUCKETS = 10_000;
const MAX_BODY_BYTES = 2048;
const MAX_NOTE = 500;
const MAX_PRODUCT = 120;
const MAX_SIZE = 8;

const NO_STORE_HEADERS = {'Cache-Control': 'no-store, max-age=0'} as const;

const ipBuckets = new Map<string, {count: number; resetAt: number}>();

function pruneExpired(now: number): void {
  for (const [key, bucket] of ipBuckets) {
    if (bucket.resetAt < now) ipBuckets.delete(key);
  }
}

function rateLimit(ip: string): boolean {
  const now = Date.now();
  if (ipBuckets.size > MAX_BUCKETS) pruneExpired(now);
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, {count: 1, resetAt: now + WINDOW_MS});
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  ipBuckets.set(ip, {...bucket, count: bucket.count + 1});
  return true;
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Last entry: the hop appended by our own nginx, which a client cannot forge.
    const parts = forwarded.split(',');
    const last = parts[parts.length - 1];
    if (last) return last.trim();
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Header injection guard: these values are pasted into a subject line and a
// reply-to, so a newline would let a caller append headers of their own.
function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const declared = Number.parseInt(contentLength, 10);
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return NextResponse.json({status: 'too_large'}, {status: 413, headers: NO_STORE_HEADERS});
    }
  }

  const ip = clientIp(req);
  if (!rateLimit(ip)) {
    return NextResponse.json({status: 'rate_limited'}, {status: 429, headers: NO_STORE_HEADERS});
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({status: 'invalid'}, {status: 400, headers: NO_STORE_HEADERS});
  }

  const email = clean(body['email'], 200);
  const product = clean(body['product'], MAX_PRODUCT);
  if (!email || !isValidEmail(email) || !product) {
    return NextResponse.json({status: 'invalid'}, {status: 400, headers: NO_STORE_HEADERS});
  }

  const result = await sendPreorderRequest({
    email,
    product,
    size: clean(body['size'], MAX_SIZE) || undefined,
    note: clean(body['note'], MAX_NOTE) || undefined,
  });

  if (result.status === 'unconfigured') {
    return NextResponse.json({status: 'unavailable'}, {status: 503, headers: NO_STORE_HEADERS});
  }
  if (result.status === 'error') {
    return NextResponse.json({status: 'error'}, {status: 502, headers: NO_STORE_HEADERS});
  }
  return NextResponse.json({status: 'ok'}, {status: 200, headers: NO_STORE_HEADERS});
}
