-- R9 MED-1: optimistic lock на race-prone счётчиках failed_attempts.
-- Два параллельных DELETE с неверным кодом для одного telegram_id/email
-- читают failedAttempts=N, инкрементят оба до N+1, теряют один шаг —
-- юзер получает лишнюю попытку перебора. С @Version Hibernate сериализует
-- апдейты: второй коммит ловит ObjectOptimisticLockingFailureException,
-- сервис fail-safe возвращает invalid_credentials.

ALTER TABLE telegram_delete_challenges
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE verification_codes
    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
