import {NextResponse, type NextRequest} from 'next/server';
import {isValidEmail} from '../../../../lib/validation';
import {subscribeToNewsletter} from '../../../../lib/resend';

const RATE_LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000;

const ipBuckets = new Map<string, {count: number; resetAt: number}>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(ip, {count: 1, resetAt: now + WINDOW_MS});
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

interface SubscribeBody {
  email?: unknown;
  locale?: unknown;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = clientIp(req);
  if (!rateLimit(ip)) {
    return NextResponse.json({status: 'rate_limited'}, {status: 429});
  }

  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({status: 'invalid'}, {status: 400});
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim() : '';
  if (!rawEmail || !isValidEmail(rawEmail)) {
    return NextResponse.json({status: 'invalid'}, {status: 400});
  }

  const result = await subscribeToNewsletter(rawEmail);

  if (result.status === 'unconfigured') {
    return NextResponse.json({status: 'unavailable'}, {status: 503});
  }
  if (result.status === 'error') {
    return NextResponse.json({status: 'error'}, {status: 502});
  }
  return NextResponse.json({status: result.status}, {status: 200});
}
