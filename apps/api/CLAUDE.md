# CLAUDE.md — apps/api (Backend)

This file extends `../../CLAUDE.md`. Read root first, then these specifics.

## Stack

- Spring Boot 3.3.4 on Java 21 (Kotlin Gradle build script)
- PostgreSQL 16 via `docker-compose.yml` at repo root
- Flyway forward-only migrations: `V1..V17` in `src/main/resources/db/migration/`
- JPA / Hibernate, `open-in-view: false` — repositories must own transaction boundaries
- Caffeine cache, Resend HTTP for email, Micrometer + Prometheus for metrics

## File structure

```
src/main/java/com/reinasleo/api/
  ReinasleoApplication.java    @SpringBootApplication entry
  controller/                  thin REST handlers, no business logic
  service/                     @Service classes, @Transactional boundaries
  repository/                  Spring Data JPA interfaces
  model/                       @Entity classes; immutable where possible
  dto/                         request/response records — validated with jakarta.validation
  config/                      SecurityConfig, CacheConfig, WebConfig, ...
  security/                    JwtService, JwtAuthFilter, RateLimitFilter, MetricsAuthFilter
  exception/                   custom exceptions + RestExceptionHandler ControllerAdvice
  health/                      custom @Component HealthIndicator beans
  util/                        pure helpers, no Spring beans
src/main/resources/
  application.yml              required env vars, NO :fallback defaults
  db/migration/                Flyway V1..V17 — never edit a shipped migration
  logback-spring.xml           JSON encoder in prod, text locally
src/test/java/                 mirrors main package layout
```

## Code style

- No verbose AI-style comments; no JSDoc on obvious methods.
- Comment only non-obvious invariants (e.g. why constant-time compare, why soft-delete).
- Prefer records for DTOs, immutable beans for entities outside JPA constraints.
- `@Transactional` lives on the service method, not the controller.
- Match existing tone — `AuthService.java`, `BotAuthService.java` are the reference.

## Security

- `SecurityConfig.java` — do NOT loosen any matcher; admin paths use `hasAuthority("ROLE_ADMIN")`.
- `application.yml` — secrets via `${ENV_VAR}` only, NO `${VAR:default}` fallback. Adding a fallback masks missing prod env and crashes silently in dev.
- Compare secrets / tokens / codes with `MessageDigest.isEqual(byte[], byte[])` — never `String.equals`.
- Filters that must stay enabled: `JwtAuthFilter`, `RateLimitFilter`, `MetricsAuthFilter`.
- `/actuator/health` is public; `/actuator/prometheus` requires `X-Metrics-Secret` (constant-time compare in `MetricsAuthFilter`).
- Soft-deleted users (`deleted_at IS NOT NULL`) must not authenticate — use `UserRepository.findActiveById` / `findActiveByEmailIgnoreCase`; JWTs issued before deletion fail on next request.

## Database

- Flyway is forward-only. To change a shipped column add a new `V<n>` migration.
- New migration filename: `V<next>__short_snake_case_summary.sql`. Update the FE/BE coordination if it changes the API contract.
- `open-in-view: false` — avoid lazy access outside `@Transactional` scope; project to DTOs in the service.
- Unique partial indexes (e.g. `idx_users_telegram_id WHERE telegram_id IS NOT NULL`) — keep partial predicate when adding new ones.

## Caching

- `CaffeineCacheManager` with TTL 5 min for: `products`, `collections`, `homepage`, `careGuides`, `lookbook`.
- Read paths: `@Cacheable(value = "<name>", key = "#id")`.
- Admin mutations: `@CacheEvict(value = "<name>", allEntries = true)` on `create / update / delete`.

## Observability

- `logback-spring.xml` uses JSON encoder under `prod` profile and pattern encoder otherwise.
- Log secrets / emails masked: `EmailService.maskEmail`, `VerificationService.maskEmail` are the templates.
- Metrics under `/actuator/prometheus` — scrape with header `Authorization` / `X-Metrics-Secret` as configured.
- `/api/health` public liveness, `/actuator/health` Spring details when authorized.

## Tests

- Baseline: 72 / 72 green. Don't ship red.
- Controller layer: `@SpringBootTest` + `MockMvc` (see `AuthControllerDeleteTest.java`).
- Service layer: pure JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`), see `AuthServiceDeleteTest.java`.
- Use real `PasswordEncoder` only in integration tests; mock it in unit tests.
- Run: `gradle test` (sandbox blocks gradlew in this harness — run manually from your shell).

## Email (Resend HTTP)

- `EmailService` calls Resend's HTTPS API, not SMTP.
- `RESEND_API_KEY` required; `RESEND_FROM` optional.
- Body HTML must go through `org.springframework.web.util.HtmlUtils.htmlEscape(...)` before interpolation.
- Three retries (1/2/4 s backoff) on 5xx/IO; fail fast on 4xx; mask email in all log lines.
