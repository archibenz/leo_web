import {describe, it, expect, afterEach, vi} from 'vitest';

// SITE_URL is captured at module load from NEXT_PUBLIC_SITE_URL, so each branch
// needs a fresh module instance: set/clear the env, resetModules, dynamic import.
// It feeds canonical/sitemap/JSON-LD absolute URLs — the fallback must hold.
const FALLBACK = 'https://reinasleo.com';
const ENV_KEY = 'NEXT_PUBLIC_SITE_URL';
const original = process.env[ENV_KEY];

afterEach(() => {
  if (original === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = original;
  vi.resetModules();
});

async function loadSiteUrl(value: string | undefined): Promise<string> {
  if (value === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = value;
  vi.resetModules();
  const mod = await import('../siteUrl');
  return mod.SITE_URL;
}

describe('SITE_URL', () => {
  it('uses NEXT_PUBLIC_SITE_URL when set', async () => {
    expect(await loadSiteUrl('https://staging.reinasleo.com')).toBe('https://staging.reinasleo.com');
  });

  it('falls back to the production origin when unset', async () => {
    expect(await loadSiteUrl(undefined)).toBe(FALLBACK);
  });

  it('falls back when the env var is blank/whitespace', async () => {
    expect(await loadSiteUrl('   ')).toBe(FALLBACK);
  });

  it('trims surrounding whitespace from the env value', async () => {
    expect(await loadSiteUrl('  https://reinasleo.com  ')).toBe(FALLBACK);
  });
});
