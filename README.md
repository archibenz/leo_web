# leo_web

REINASLEO web application.

- `apps/web/` — Next.js frontend
- `apps/api/` — Spring Boot backend

## Local

```bash
npm install
npm run api:dev    # http://localhost:8080
npm run web:dev    # http://localhost:3000
```

`apps/web/lib/generated/product-slugs.ts` is generated, not committed: `predev`,
`prebuild` and the vitest setup write it. In a fresh clone `tsc --noEmit` therefore
fails on a missing module until one of them has run — start the dev server or run the
tests once first.
