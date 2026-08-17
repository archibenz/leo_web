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

  if (!apiKey) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[newsletter] Resend not configured', {hasKey: false});
    }
    return {status: 'unconfigured'};
  }

  // No audience to add them to. The account's key is restricted to sending mail
  // — it cannot create or read audiences — so waiting for one would mean
  // turning the form away, and the form is on every page of the site. Send the
  // address to the shop's own inbox instead: the subscriber is captured either
  // way and can be imported into an audience later. The moment
  // RESEND_AUDIENCE_ID exists this branch stops being taken.
  if (!audienceId) {
    return forwardSubscriber(email, apiKey);
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

// The fallback when there is no audience: mail the address to the shop. Reported
// as 'ok' because from the subscriber's side it is — they asked to hear from us
// and we now have their address. Reported as 'unconfigured' only when there is
// nowhere at all to send it, which is a genuine misconfiguration.
async function forwardSubscriber(email: string, apiKey: string): Promise<SubscribeResult> {
  const to = process.env.NEWSLETTER_TO ?? process.env.PREORDER_TO ?? process.env.CONTACT_TO;
  if (!to) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[newsletter] no audience and no inbox to forward to');
    }
    return {status: 'unconfigured'};
  }

  try {
    const res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'REINASLEO <noreply@reinasleo.com>',
        to: [to],
        subject: 'Новая подписка на рассылку',
        text: `Почта: ${email}`,
      }),
    });
    if (res.ok) return {status: 'ok'};
    console.error('[newsletter] forward rejected', res.status);
    return {status: 'error', detail: String(res.status)};
  } catch (err) {
    console.error('[newsletter] forward network error', err);
    return {status: 'error', detail: 'network'};
  }
}

// A pre-order request: a garment that is nowhere to be had, and someone who
// wants it anyway. It goes straight to the shop's own inbox rather than into an
// audience — this is a person waiting for an answer, not a subscriber.
export async function sendPreorderRequest(input: {
  email: string;
  product: string;
  size?: string;
  note?: string;
}): Promise<SubscribeResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.PREORDER_TO ?? process.env.CONTACT_TO;
  if (!apiKey || !to) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[preorder] Resend not configured', {hasKey: Boolean(apiKey), hasTo: Boolean(to)});
    }
    return {status: 'unconfigured'};
  }

  const lines = [
    `Товар: ${input.product}`,
    input.size ? `Размер: ${input.size}` : null,
    `Почта покупателя: ${input.email}`,
    input.note ? `Комментарий: ${input.note}` : null,
  ].filter(Boolean);

  let res: Response;
  try {
    res = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? 'REINASLEO <noreply@reinasleo.com>',
        to: [to],
        // So a reply from the inbox lands with the buyer, not with noreply@.
        reply_to: input.email,
        subject: `Предзаказ — ${input.product}`,
        text: lines.join('\n'),
      }),
    });
  } catch (err) {
    console.error('[preorder] Resend network error', err);
    return {status: 'error', detail: 'network'};
  }

  if (res.ok) return {status: 'ok'};
  console.error('[preorder] Resend rejected', res.status);
  return {status: 'error', detail: String(res.status)};
}
