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
| 01 | `01-registration.spec.ts` | `/ru/auth/register` renders, email field accepts input |
| 02 | `02-add-to-cart.spec.ts` | Shop list → product page navigation, cart CTA visible |
| 03 | `03-checkout-wb-redirect.spec.ts` | Cart page renders; if items present, checkout hits wildberries.ru |
| 04 | `04-admin-login.spec.ts` | Admin sign-in flow lands on `/admin` dashboard (skipped without creds) |
| 05 | `05-language-switch.spec.ts` | `/ru`, `/en` render; `/` redirects to a locale |

## Adding new tests

- Put specs in `e2e/tests/`, use fixture from `../fixtures/auth.ts` for admin creds or unique emails.
- Prefer `getByRole` / `getByLabel` over CSS selectors — stable across refactors.
- Use `test.skip(condition, reason)` for scenarios that require data not yet seeded.
