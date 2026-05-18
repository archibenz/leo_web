import {NextResponse, type NextRequest} from 'next/server';
import {isValidEmail} from '../../../../lib/validation';
import {subscribeToNewsletter} from '../../../../lib/resend';

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_BUCKETS = 10_000;
const MAX_BODY_BYTES = 1024;

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
    // Use the LAST entry, not the first. The last hop is the IP appended by
    // our trusted nginx proxy and cannot be spoofed by the client. Earlier
    // entries can be forged by attackers via a self-set X-Forwarded-For header.
    const parts = forwarded.split(',');
    const last = parts[parts.length - 1];
    if (last) return last.trim();
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

interface SubscribeBody {
  email?: unknown;
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

  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({status: 'invalid'}, {status: 400, headers: NO_STORE_HEADERS});
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  if (!rawEmail || !isValidEmail(rawEmail)) {
    return NextResponse.json({status: 'invalid'}, {status: 400, headers: NO_STORE_HEADERS});
  }

  const result = await subscribeToNewsletter(rawEmail);

  if (result.status === 'unconfigured') {
    return NextResponse.json({status: 'unavailable'}, {status: 503, headers: NO_STORE_HEADERS});
  }
  if (result.status === 'error') {
    return NextResponse.json({status: 'error'}, {status: 502, headers: NO_STORE_HEADERS});
  }
  return NextResponse.json({status: result.status}, {status: 200, headers: NO_STORE_HEADERS});
}
