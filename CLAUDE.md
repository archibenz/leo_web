# CLAUDE.md — REINASLEO Monorepo

This is the monorepo root. It contains two apps that are developed by **separate agents**.

## Agent Boundaries

| Agent | Directory | CLAUDE.md | What they own |
|-------|-----------|-----------|---------------|
| **Frontend** | `apps/web/` | `apps/web/CLAUDE.md` | Next.js pages, components, contexts, translations, CSS |
| **Backend** | `apps/api/` | `apps/api/CLAUDE.md` | Spring Boot controllers, services, models, migrations, DTOs |

Each agent has its own detailed CLAUDE.md. **Open Claude Code from the agent's directory**, not from this root.

## Quick Start

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Start API (terminal 1)
npm run api:dev        # http://localhost:8080

# 3. Start Web (terminal 2)
npm run web:dev        # http://localhost:3000
```

## Shared Contract: REST API

The only coupling between frontend and backend is the HTTP API. Changes to API endpoints or DTOs require coordination:

### Auth
- `POST /api/auth/register` → `{ token, user }`
- `POST /api/auth/login` → `{ token, user }`
- `GET /api/auth/me` → `{ user }` (Bearer JWT)
- `POST /api/auth/telegram/init` → `{ token, deepLink }`
- `GET /api/auth/telegram/exchange?token=X` → `{ token }`
- `POST /api/auth/link-email`

### Commerce
- `GET/POST/DELETE /api/cart/*`
- `GET/POST/DELETE /api/favorite/*`
- `GET /api/orders/*`

### Bot-only (X-Bot-Secret header)
- `POST /api/bot/login` → `{ loginToken }` — bot reports user login
- `POST /api/bot/register` → `{ loginToken }` — bot reports new user registration
- `POST /api/bot/check-user` → `{ registered, name }` — check if telegram user exists
- `POST /api/bot/organic-register` → `200 OK` — register without auth token (organic flow)

### Other
- `GET /api/lookbook`
- `POST /api/contact`
- `GET /api/health`

## Environment

- **PostgreSQL 16**: `docker compose up -d` (port 5432, db: `reinasleo`)
- **Web env**: `NEXT_PUBLIC_API_BASE=http://localhost:8080`
- **API env**: see `apps/api/CLAUDE.md` for full list

## Security Rules

- `.env` files are gitignored — NEVER commit them
- `application.yml`: secrets via `${ENV_VAR}` only, NO default values (no `:fallback` syntax)
- `auth.ts`: JWT_SECRET is required, NO fallback — app throws if missing
- Secret comparison: use `MessageDigest.isEqual()`, NEVER `String.equals()`
- `RateLimitFilter.java` — do NOT remove or disable rate limiting
- `SecurityConfig.java` — do NOT remove security headers or change CORS to `*`
- `middleware.ts` — do NOT remove security headers (X-Frame-Options, X-Content-Type-Options, etc.)

## Completed: Telegram Registration for All Users

All tasks implemented and verified:

- [x] **Backend** — `POST /api/bot/check-user`, `POST /api/bot/organic-register`, 3 DTOs, 2 service methods
- [x] **Bot** — Organic/deep-link consent flow, FSM states (`waiting_consent`, `waiting_phone_organic`), soft reminders in menu (~20%)
- [x] **Frontend** — `/[locale]/privacy` and `/[locale]/terms` pages, translations (en/ru), footer legal links

---

## TODO

### Email Verification (high priority)
- [ ] Configure real SMTP for verification code delivery
  - Gmail SMTP (`smtp.gmail.com:587`) — works on production server (no VPN), blocked locally by WireGuard VPN
  - Need: Google App Password for `reinasleo@gmail.com`
  - Alternative: mail.ru SMTP (`noreply_reinasleo@mail.ru`)
  - Set env vars on server: `MAIL_USERNAME`, `MAIL_PASSWORD`
- [ ] Currently codes are logged to console (`EmailService` fallback) when mail is not configured — works for dev
