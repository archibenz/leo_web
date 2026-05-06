const RESEND_API_BASE = 'https://api.resend.com';

export type SubscribeStatus = 'ok' | 'already' | 'error' | 'unconfigured';

export interface SubscribeResult {
  status: SubscribeStatus;
  detail?: string;
}

// Subscribe an email to the configured Resend audience. Returns a discriminated
// status so the API route can map it to the right HTTP code without leaking
// vendor-specific error shapes to the client.
export async function subscribeToNewsletter(
  email: string
): Promise<SubscribeResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!apiKey || !audienceId) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[newsletter] Resend not configured', {
        hasKey: Boolean(apiKey),
        hasAudience: Boolean(audienceId),
      });
    }
    return {status: 'unconfigured'};
  }

  let res: Response;
  try {
    res = await fetch(
      `${RESEND_API_BASE}/audiences/${audienceId}/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, unsubscribed: false}),
      }
    );
  } catch (err) {
    console.error('[newsletter] Resend network error', err);
    return {status: 'error', detail: 'network'};
  }

  if (res.status === 200 || res.status === 201) {
    return {status: 'ok'};
  }

  const raw: unknown = await res.json().catch(() => ({}));
  const data: Record<string, unknown> =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawMessage = data['message'];
  const rawName = data['name'];
  const messageStr = typeof rawMessage === 'string' ? rawMessage : '';
  const nameStr = typeof rawName === 'string' ? rawName : undefined;
  const message = messageStr.toLowerCase();

  // Resend API returns either 409 or a 4xx with "already exists" / duplicate
  // wording in the message. Normalise both into 'already'.
  if (
    res.status === 409 ||
    message.includes('already exists') ||
    message.includes('duplicate') ||
    message.includes('contact already')
  ) {
    return {status: 'already'};
  }

  // Resend echoes the submitted email back inside `data.message`, so logging
  // it raw would write user PII to server logs. Drop the message field from
  // the log entry; keep the status and error name for diagnostics.
  console.error('[newsletter] Resend subscribe failed', {
    status: res.status,
    name: nameStr,
    message: '<redacted>',
  });
  return {status: 'error', detail: messageStr || `http_${res.status}`};
}
