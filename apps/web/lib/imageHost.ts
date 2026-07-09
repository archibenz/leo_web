// next/image checks a remote src's host against next.config.mjs →
// images.remotePatterns and THROWS synchronously during render when the host
// isn't listed (a plain <img> would just fail to load and fire onError). Product
// image URLs come from admin-editable data (AdminProductRequest.images), so an
// off-list, wrong-scheme or malformed host would crash the whole product grid /
// PDP rather than degrade. These helpers let each image resolver drop a src
// next/image can't render, so the card falls back to its gradient/placeholder.
//
// Keep ALLOWED_IMAGE_HOSTS in sync with next.config.mjs → images.remotePatterns
// (same protocol + hostname pairs).

type ImageHostPattern = {protocol: 'http' | 'https'; hostname: string};

export const ALLOWED_IMAGE_HOSTS: readonly ImageHostPattern[] = [
  {protocol: 'https', hostname: 'images.unsplash.com'},
  {protocol: 'http', hostname: 'localhost'},
  {protocol: 'https', hostname: 'reinasleo.com'},
  {protocol: 'https', hostname: 'www.reinasleo.com'},
];

// True when next/image can render `src` without throwing: a same-origin path
// (root-relative), or an absolute http(s) URL whose protocol+host is allow-listed.
// Everything else — unknown host, non-http scheme, protocol-relative to an
// off-list host, bare-relative, unparseable, empty — is treated as unrenderable.
export function isRenderableImageSrc(src: string | null | undefined): boolean {
  if (!src) return false;
  const s = src.trim();
  if (s === '') return false;
  // Root-relative paths are same-origin; next/image always accepts them. Guard
  // against protocol-relative "//host/…" which also starts with "/".
  if (s.startsWith('/') && !s.startsWith('//')) return true;
  let url: URL;
  try {
    url = new URL(s.startsWith('//') ? `https:${s}` : s);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return ALLOWED_IMAGE_HOSTS.some(
    (p) => `${p.protocol}:` === url.protocol && p.hostname === host,
  );
}

// Keep only the srcs next/image can render, preserving order.
export function keepRenderableImages(srcs: readonly string[]): string[] {
  return srcs.filter(isRenderableImageSrc);
}
