import {beforeEach, describe, expect, it, vi} from 'vitest';
import {apiFetch, clearToken, getToken, setToken} from '../api';
import {fetchSessionUser} from '../authSession';

const fetchMock = vi.fn();
const user = {id: 'cookie-user', role: 'admin'};
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status});

beforeEach(() => {
  vi.stubGlobal('localStorage', {getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn()});
  let token: string | null = null;
  vi.mocked(localStorage.getItem).mockImplementation(() => token);
  vi.mocked(localStorage.setItem).mockImplementation((_key, value) => {token = value;});
  vi.mocked(localStorage.removeItem).mockImplementation(() => {token = null;});
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

describe('cookie session restoration', () => {
  it('restores an HttpOnly-only session without a readable token', async () => {
    fetchMock.mockResolvedValue(response(user));
    await expect(fetchSessionUser(null, () => true)).resolves.toEqual({user, cookieVerified: true});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });

  it('a valid cookie chooses the server user despite a different legacy bearer', async () => {
    setToken('older-user-token');
    fetchMock.mockResolvedValue(response(user));
    await expect(fetchSessionUser(getToken(), () => true)).resolves.toEqual({user, cookieVerified: true});
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(getToken()).toBe('older-user-token');
  });

  it.each([401, 403])('keeps bearer-only compatibility after definitive cookie status %s', async status => {
    setToken('legacy-token');
    fetchMock.mockResolvedValueOnce(response({}, status)).mockResolvedValueOnce(response(user));
    await expect(fetchSessionUser(getToken(), () => true)).resolves.toEqual({user, cookieVerified: false});
    expect(fetchMock.mock.calls.map(([, init]) => init.headers.Authorization)).toEqual([undefined, 'Bearer legacy-token']);
  });

  it.each([429, 502, 503])('does not switch credentials after unavailable cookie verification %s', async status => {
    setToken('legacy-token');
    fetchMock.mockResolvedValue(response({}, status));
    await expect(fetchSessionUser(getToken(), () => true)).rejects.toMatchObject({status});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getToken()).toBe('legacy-token');
  });

  it('does not fall back to bearer after cookie transport fails', async () => {
    setToken('legacy-token');
    fetchMock.mockRejectedValue(new TypeError('offline'));
    await expect(fetchSessionUser(getToken(), () => true)).rejects.toThrow('offline');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not verify an obsolete bearer after the session generation changes', async () => {
    setToken('legacy-token');
    fetchMock.mockResolvedValue(response({}, 403));
    await expect(fetchSessionUser(getToken(), () => false)).rejects.toMatchObject({status: 403});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    clearToken();
  });

  it('cookie-only requests keep explicit auth handlers suppressed without leaking the option into fetch', async () => {
    setToken('legacy-token');
    fetchMock.mockResolvedValue(response(user));
    await apiFetch('/api/auth/me', {skipBearer: true, skipAuthHandler: true});
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('skipBearer');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
