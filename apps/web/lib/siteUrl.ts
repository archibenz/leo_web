// Single source of truth for the public site origin used in absolute URLs
// (canonical/alternate links, sitemap, robots, JSON-LD). Falls back to the
// production origin so generated URLs stay absolute when NEXT_PUBLIC_SITE_URL
// is unset (CI, local, preview) instead of collapsing to a relative path.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://reinasleo.com';
