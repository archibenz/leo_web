# REINASLEO Web

Premium women's fashion storefront. Next.js 15 web app with a Spring Boot 3
API and PostgreSQL behind it.

## Architecture

```
apps/web/   Next.js 15 (App Router, RSC), TypeScript, Tailwind, next-intl
apps/api/   Spring Boot 3.3 (Java 21), Spring Security, JPA, Flyway
            actuator + Prometheus, JSON structured logging
docker-compose.yml   PostgreSQL 16 for local dev
scripts/check-env.sh runtime env validation against application.yml
```

The web app and the API are owned by separate agents — see
`apps/web/CLAUDE.md` and `apps/api/CLAUDE.md`. The only coupling between
them is the HTTP REST contract documented in `CLAUDE.md` at the repo root.

Auxiliary services live in sibling repos:

- `leo_bot` — Telegram bot (deployed as `reinasleo-bot` systemd unit)
- `leo_analytics` — analytics API (deployed as `reinasleo-analytics-api` systemd unit, see `reinasleo-deploy-web/systemd/`)

## Local development

Prerequisites: Node 20+, Java 21, Docker.

```bash
# 1. Postgres
docker compose up -d

# 2. API (terminal 1)
cp apps/api/.env.example apps/api/.env   # fill in secrets
npm run api:dev                          # http://localhost:8080

# 3. Web (terminal 2)
cp apps/web/.env.example apps/web/.env.local
npm run web:dev                          # http://localhost:3000/en
```

The API reads its env from `apps/api/.env` (gradle's bootRun task picks it
up). The web reads `apps/web/.env.local`.

Routes default to `/en`; localized as `/en/...` and `/ru/...`.

## Environment

See `.env.example` files for the canonical list — never commit `.env`.

- `apps/api/.env.example` — DB, JWT, Resend, Bot secret, CORS, metrics scraper secret
- `apps/web/.env.example` — public API base, site URL, Resend audience

Validate before starting:

```bash
npm run check:env             # template mode (keys only)
npm run check:env:strict      # values must be non-empty
```

Secrets in `application.yml` are wired via `${ENV_VAR}` with no fallback —
the app refuses to start when a required var is missing.

## Scripts

| Command | What |
|---|---|
| `npm run web:dev` | Next.js dev server on :3000 |
| `npm run web:build` | Production build of the web app |
| `npm run web:start` | Run the built web app |
| `npm run api:dev` | `gradle bootRun` on :8080 |
| `npm run api:build` | `gradle build` (runs tests) |
| `npm run check:env` | Validate `application.yml` ↔ `.env.example` |

Inside `apps/web/`:

| Command | What |
|---|---|
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end |

Inside `apps/api/`:

| Command | What |
|---|---|
| `gradle test` | JUnit 5 |
| `gradle bootRun` | Run the API |
| `gradle build` | Build the JAR |

## API surface

REST contract is the single coupling between web and API. Full list in
the root `CLAUDE.md`. Highlights:

- Auth (JWT + Telegram link): `POST /api/auth/{register,login}`, `GET /api/auth/me`
- Commerce: `/api/cart/*`, `/api/favorite/*`, `/api/orders/*`
- Public: `/api/catalog/*`, `/api/lookbook`, `/api/care-guides`, `/api/contact`
- Bot ingress (X-Bot-Secret header): `/api/bot/*`
- Health: `GET /api/health`, `GET /actuator/health`
- Metrics: `GET /actuator/prometheus` — requires `X-Metrics-Secret` header
  matching `METRICS_SECRET` env var (or a JWT with `ROLE_ADMIN`)

## Observability

The API exports Prometheus metrics and emits structured JSON logs in
`prod`:

- `/actuator/health` — public, used by load balancer / uptime checks
- `/actuator/prometheus` — secret-protected scrape endpoint
- `logback-spring.xml` switches to `LogstashEncoder` under the `prod`
  Spring profile; `local` / `dev` / `test` keep human-readable text output
- `DatabaseHealthIndicator` executes `SELECT 1` and is rolled into
  `/actuator/health`

Wire your Prometheus scraper with the `X-Metrics-Secret` header; ship logs
from stdout to whatever sink you run (Loki, Datadog, Cloudwatch).

## Deployment

Web is built and served as a Node app (Vercel-style platform or behind
nginx). API is a Spring Boot fat-jar. In production both sit behind nginx,
which terminates TLS and proxies `/api/**` and `/uploads/**` to the API on
:8080. CORS therefore allows only the public origins listed in
`CORS_ORIGIN`.

Set `SPRING_PROFILES_ACTIVE=prod` so the API emits JSON logs and the web
build picks up the production `NEXT_PUBLIC_*` values.

## Commit conventions

The repo follows Conventional Commits (`feat(api): …`, `fix(web): …`,
`perf(web): …`, `chore: …`, `test(api): …`, `style(loader): …`). Keep one
logical change per commit and write the body for the next reader.

## Where to look next

- `CLAUDE.md` (root) — agent boundaries, shared REST contract, security rules
- `apps/web/CLAUDE.md` — Next.js conventions, component patterns
- `apps/api/CLAUDE.md` — Spring Boot conventions, security model
- `docs/superpowers/` — operational runbooks
