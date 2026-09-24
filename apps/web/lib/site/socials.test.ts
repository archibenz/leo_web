import {afterEach, describe, it, expect, vi} from 'vitest';
import {getSocials, socialHandle, toSocialLinks, FIXTURE_SOCIALS} from './socials';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('toSocialLinks — the API answer is outside data', () => {
  it('keeps known networks with an https address on their own domain', () => {
    expect(toSocialLinks([{network: 'telegram', href: 'https://t.me/reinasleo'}])).toEqual([
      {network: 'telegram', href: 'https://t.me/reinasleo'},
    ]);
  });

  it('drops what the write side would have refused', () => {
    expect(
      toSocialLinks([
        {network: 'telegram', href: 'http://t.me/reinasleo'},
        {network: 'telegram', href: 'https://evil.example/reinasleo'},
        {network: 'myspace', href: 'https://myspace.com/x'},
        {network: 'vk', href: 'javascript:alert(1)'},
        {network: 'instagram', href: 'https://user@instagram.com/x'},
        'garbage',
        null,
      ]),
    ).toEqual([]);
    expect(toSocialLinks({not: 'a list'})).toEqual([]);
  });
});

describe('getSocials', () => {
  it('asks the API once, tagged so an admin save refreshes the footer within a minute', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(FIXTURE_SOCIALS), {status: 200}));
    vi.stubGlobal('fetch', fetchMock);

    expect(await getSocials()).toEqual(FIXTURE_SOCIALS);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, {next: {tags: string[]}}];
    expect(url).toMatch(/\/api\/site\/socials$/);
    expect(init.next.tags).toContain('storefront');
  });

  // Показать выключенную владельцем ссылку было бы неправдой.
  it('an unreachable or failing API means no networks, not old ones', async () => {
    vi.stubEnv('CATALOGUE_SOURCE', '');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', {status: 503})));
    expect(await getSocials()).toEqual([]);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    expect(await getSocials()).toEqual([]);
  });
});

describe('socialHandle — the contact page caption', () => {
  it('reads as it did when it was written by hand', () => {
    expect(socialHandle({network: 'telegram', href: 'https://t.me/reinasleo'})).toBe('@reinasleo');
    expect(socialHandle({network: 'vk', href: 'https://vk.com/reinasleo'})).toBe('vk.com/reinasleo');
    expect(socialHandle({network: 'instagram', href: 'https://instagram.com/reinasleo/'})).toBe('@reinasleo');
  });
});
