# CLAUDE.md — apps/web (Frontend)

This file extends `../../CLAUDE.md`. Read root first, then these specifics.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Tailwind CSS (utility-first, no styled-components)
- next-intl v3 for i18n — locales `en` and `ru`, files in `messages/`
- framer-motion for animation
- vitest + Testing Library for unit, Playwright for E2E

## File structure

```
app/[locale]/                  routes (one folder = one URL segment)
  layout.tsx                   localized layout, html lang attribute
  page.tsx                     route handler
  account/                     /[locale]/account (protected)
  admin/                       /[locale]/admin (RBAC ROLE_ADMIN)
components/                    shared client/server components
  ui/                          atomic primitives (Button, IconBtn, ...)
  admin/                       admin-only widgets
contexts/                      React contexts: Auth, Cart, Favorites
lib/
  api.ts                       single fetch wrapper — apiFetch(), getToken()
  useSyncedList.ts             guest-localStorage / authed-server hybrid list
  jsonLd.ts                    structured data builders
  validation.ts                form validation (Zod-style by hand)
hooks/                         custom hooks (useFocusTrap, ...)
messages/{en,ru}.json          i18n catalogues, must stay in sync
middleware.ts                  security headers + locale routing
i18n.ts, i18n-routing.ts       next-intl wiring
```

## Code style

- No verbose AI-style comments ("This component renders...").
- No JSDoc on obvious functions; comments only where logic is non-obvious.
- Match existing tone — look at `Footer.tsx` / `ShopClient.tsx` for reference.
- Server Components by default; add `'use client'` only when needed (state, refs, listeners, browser APIs).
- Prefer `apiFetch<T>(path, init)` over raw `fetch` — it handles base URL, auth, error envelope.
- When reverting a feature: delete ALL related files, components, types, imports.

## Security

- `middleware.ts` — do NOT remove security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- `NEXT_PUBLIC_*` env vars are inlined into the client bundle — NEVER put secrets there.
- JWT lives in `localStorage` (key `reinasleo_token`); read it via `getToken()` only.
- Validate every external URL going into `<a href>` / `<img src>` — server-rendered HTML must not echo unsanitized input.
- CSP: inline scripts require a nonce; don't `dangerouslySetInnerHTML` user content.

## Performance

- Use `next/image` (`<Image>`) for non-SVG raster images — never plain `<img>`.
- `dynamic(() => import(...), { ssr: false })` for heavy client-only libs (e.g. shader backgrounds, lightbox).
- Lazy-mount modals/overlays inside `<AnimatePresence>` so unused trees do not hydrate.
- Sync localStorage writes inside `useSyncedList` — don't add a second source of truth.

## Accessibility

- Every form input has matching `htmlFor` + `id` pair.
- Focus styling uses `:focus-visible` (see `globals.css`); do not strip outlines without a replacement ring.
- Touch targets >= 44x44 px; use `IconBtn` for icon-only buttons.
- Contrast meets WCAG AA against the current `--bg`/`--ink` tokens.
- Modal dialogs: `role="dialog" aria-modal="true" aria-labelledby="..."`, trap focus via `useFocusTrap`.
- Keyboard: ESC closes overlays unless mid-submit.

## ESLint / TypeScript

- `next.config.mjs` has `eslint.ignoreDuringBuilds: true` — warnings do NOT block production build.
- Run `npm run lint` manually before opening a PR; treat new warnings as bugs.
- TS strict is on; `noUncheckedIndexedAccess` is off — see `TYPE_STRICTNESS.md` for rationale.
- Don't add `// @ts-ignore`; use `// @ts-expect-error <reason>` with a comment.

## i18n

- Every user-visible string lives in `messages/{en,ru}.json`. Match keys top-to-bottom — both files must have identical structure.
- Coordinate top-level keys across agents — `account.*` (this app), `header.*`, `shop.*`, `product.*`.
- For pluralization use ICU MessageFormat `{count, plural, ...}` syntax (next-intl handles it).

## Testing

- Unit: `vitest` in `components/__tests__/` and `lib/__tests__/`.
- E2E: Playwright specs in `e2e/`; smoke-test critical flows (auth, checkout, account delete).
- Run before PR: `npm run test` and `npm run test:e2e`.

## API contract (relevant FE-touched endpoints)

Full contract lives in root `CLAUDE.md`. FE-relevant additions:

### Auth
- `GET /api/auth/me/export` → `200` (Bearer JWT) — JSON dump of user-owned data (`user`, `orders`, `cart`, `favorites`, `verificationCodesIssued`, `exportedAt`). GDPR Art.20 portability. Use for "Download my data" action on the account page.
