import {describe, it, expect} from 'vitest';
import {isRenderableImageSrc, keepRenderableImages, ALLOWED_IMAGE_HOSTS} from '../imageHost';

describe('isRenderableImageSrc', () => {
  it('rejects empty / nullish', () => {
    expect(isRenderableImageSrc('')).toBe(false);
    expect(isRenderableImageSrc('   ')).toBe(false);
    expect(isRenderableImageSrc(null)).toBe(false);
    expect(isRenderableImageSrc(undefined)).toBe(false);
  });

  it('accepts same-origin root-relative paths', () => {
    expect(isRenderableImageSrc('/images/white/hero.jpg')).toBe(true);
    expect(isRenderableImageSrc('/uploads/abc.png')).toBe(true);
  });

  it('accepts absolute URLs on allow-listed hosts (matching protocol)', () => {
    expect(isRenderableImageSrc('https://reinasleo.com/a.jpg')).toBe(true);
    expect(isRenderableImageSrc('https://www.reinasleo.com/a.jpg')).toBe(true);
    expect(isRenderableImageSrc('https://images.unsplash.com/photo-1')).toBe(true);
    expect(isRenderableImageSrc('http://localhost/x.jpg')).toBe(true);
    // port is ignored — remotePatterns without a port matches any port
    expect(isRenderableImageSrc('http://localhost:8080/x.jpg')).toBe(true);
  });

  it('rejects a right host on the wrong scheme (mirrors remotePatterns)', () => {
    // config lists reinasleo.com as https only, localhost as http only
    expect(isRenderableImageSrc('http://reinasleo.com/a.jpg')).toBe(false);
    expect(isRenderableImageSrc('https://localhost/x.jpg')).toBe(false);
  });

  it('rejects unknown / untrusted hosts — the crash case', () => {
    expect(isRenderableImageSrc('https://evil.example/x.jpg')).toBe(false);
    expect(isRenderableImageSrc('https://cdn.attacker.test/p.png')).toBe(false);
    // protocol-relative to an off-list host
    expect(isRenderableImageSrc('//evil.example/x.jpg')).toBe(false);
  });

  it('rejects non-http(s) schemes and garbage', () => {
    expect(isRenderableImageSrc('data:image/png;base64,AAAA')).toBe(false);
    expect(isRenderableImageSrc('javascript:alert(1)')).toBe(false);
    expect(isRenderableImageSrc('ftp://reinasleo.com/x.jpg')).toBe(false);
    // bare-relative (no scheme, no leading slash) is not a valid next/image src
    expect(isRenderableImageSrc('foo.jpg')).toBe(false);
    expect(isRenderableImageSrc('not a url')).toBe(false);
  });

  it('is case-insensitive on host', () => {
    expect(isRenderableImageSrc('https://REINASLEO.com/a.jpg')).toBe(true);
    expect(isRenderableImageSrc('https://Images.Unsplash.com/p')).toBe(true);
  });
});

describe('keepRenderableImages', () => {
  it('drops untrusted entries, preserves order of the rest', () => {
    const input = [
      '/images/a.jpg',
      'https://evil.example/b.jpg',
      'https://reinasleo.com/c.jpg',
      'data:image/png;base64,ZZ',
    ];
    expect(keepRenderableImages(input)).toEqual([
      '/images/a.jpg',
      'https://reinasleo.com/c.jpg',
    ]);
  });

  it('returns [] when nothing is renderable', () => {
    expect(keepRenderableImages(['https://evil.example/x.jpg', ''])).toEqual([]);
  });
});

describe('ALLOWED_IMAGE_HOSTS', () => {
  it('mirrors the next.config.mjs remotePatterns list', () => {
    expect(ALLOWED_IMAGE_HOSTS.map((h) => h.hostname)).toEqual([
      'images.unsplash.com',
      'localhost',
      'reinasleo.com',
      'www.reinasleo.com',
    ]);
  });
});
