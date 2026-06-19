import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {subscribeToNewsletter} from '../resend';

// subscribeToNewsletter reads RESEND_* at call time and goes through global
// fetch, so we mock fetch + set/clear env per case (no module reset needed).
// It returns a discriminated status the API route maps to HTTP codes — the
// normalization of duplicates into 'already' and the graceful unconfigured /
// network branches are the contract worth pinning.

const KEY = 'RESEND_API_KEY';
const AUD = 'RESEND_AUDIENCE_ID';
const origKey = process.env[KEY];
const origAud = process.env[AUD];

const mockFetch = vi.fn();

function res(status: number, body: unknown = {}): Response {
  return {status, json: async () => body} as unknown as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  process.env[KEY] = 'test-key';
  process.env[AUD] = 'aud-123';
});

afterEach(() => {
  if (origKey === undefined) delete process.env[KEY];
  else process.env[KEY] = origKey;
  if (origAud === undefined) delete process.env[AUD];
  else process.env[AUD] = origAud;
  vi.restoreAllMocks();
});

describe('subscribeToNewsletter', () => {
  it('returns unconfigured (and never calls fetch) when keys are missing', async () => {
    delete process.env[KEY];
    delete process.env[AUD];
    const result = await subscribeToNewsletter('a@b.com');
    expect(result).toEqual({status: 'unconfigured'});
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns ok on 201 and posts to the audience with bearer auth + body', async () => {
    mockFetch.mockResolvedValue(res(201, {id: 'c1'}));
    const result = await subscribeToNewsletter('user@example.com');
    expect(result).toEqual({status: 'ok'});
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.resend.com/audiences/aud-123/contacts');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');
    expect(JSON.parse(init.body)).toEqual({email: 'user@example.com', unsubscribed: false});
  });

  it('treats a 409 as already-subscribed', async () => {
    mockFetch.mockResolvedValue(res(409, {}));
    expect(await subscribeToNewsletter('dup@example.com')).toEqual({status: 'already'});
  });

  it('normalizes duplicate wording in a 4xx body into already', async () => {
    mockFetch.mockResolvedValue(res(422, {message: 'Contact already exists in this audience'}));
    expect(await subscribeToNewsletter('dup@example.com')).toEqual({status: 'already'});
  });

  it('returns error on an unrelated non-2xx', async () => {
    mockFetch.mockResolvedValue(res(500, {name: 'internal', message: 'boom'}));
    const result = await subscribeToNewsletter('user@example.com');
    expect(result.status).toBe('error');
  });

  it('returns error with detail=network when fetch throws', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNRESET'));
    expect(await subscribeToNewsletter('user@example.com')).toEqual({status: 'error', detail: 'network'});
  });
});
