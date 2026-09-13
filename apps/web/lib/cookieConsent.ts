// Shared with app/[locale]/WhiteCookieNotice.tsx (the banner that sets it) and
// lib/siteEvents.ts (which reads it to decide whether a session key may be
// stored). Kept in its own leaf module so the tracking utility does not have
// to import a React/next-intl component just for one string.
export const COOKIE_CONSENT_KEY = 'wv-cookie-ok';
