# E2E tests (Playwright)

## Local run

1. Start API in another terminal: from monorepo root `npm run api:dev`.
2. From `apps/web/`:
   - `npm run test:e2e` — headless, opens HTML report at `playwright-report/` on failure.
   - `npm run test:e2e:ui` — interactive Playwright UI (recommended while iterating).
   - `npm run test:e2e:debug` — headed Chromium + DevTools inspector.

Playwright's `webServer` auto-starts `next dev` on :3000 and reuses existing one.

## Optional admin login test

`04-admin-login.spec.ts` is skipped by default. To enable, create `apps/web/.env.local`:

```
E2E_ADMIN_EMAIL=admin@reinasleo.local
E2E_ADMIN_PASSWORD=your-dev-admin-password
```

User must exist in local Postgres with `role = 'admin'`.

## Scenarios

| # | File | Covers |
|---|---|---|
| 01 | `01-account-auth.spec.ts` | `/ru/account` is the auth surface: both tabs, the fields each exposes, client-side validation before any request, Telegram alternative, and that `/auth/register` is gone |
| 02 | `02-add-to-cart.spec.ts` | Shop grid → PDP (`?p=<key>`) → size gate → bag line in localStorage → `/ru/bag`; plus the sizeless sticky CTA scrolling to the sizes |
| 03 | `03-checkout-wb-redirect.spec.ts` | No own checkout: empty bag, per-line Wildberries article link, PDP buy button on mouse and touch (incl. reduced motion) |
| 04 | `04-admin-login.spec.ts` | Admin sign-in flow lands on `/admin` dashboard (skipped without creds) |
| 05 | `05-language-switch.spec.ts` | `/ru`, `/en` render; `/` redirects to a locale |
| 06 | `06-underline-offset.spec.ts` | Quiet link underlines hug their text and every `.wv-link` carries an ink span |

Specs 01-03 run with the Spring API down: they abort `**/api/**` and every
off-origin request, so a green run proves the storefront needs neither.

## Adding new tests

- Put specs in `e2e/tests/`, use fixture from `../fixtures/auth.ts` for admin creds or unique emails.
- Read user-visible copy through `../fixtures/messages.ts` instead of pinning Russian strings — copy changes weekly and pinned strings are what rotted the first generation of these specs.
- Storefront state helpers (bag seeding, cookie bar, hydration gate, instant scroll) live in `../fixtures/white.ts`.
- Prefer `getByRole` / `getByLabel` over CSS selectors — stable across refactors.
- Use `test.skip(condition, reason)` for scenarios that require data not yet seeded.
