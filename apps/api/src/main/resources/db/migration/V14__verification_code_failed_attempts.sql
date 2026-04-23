-- A13: счётчик неудачных попыток ввода кода верификации.
-- Каждый mismatch в VerificationService.verifyCode инкрементирует failed_attempts;
-- при достижении порога (5) строка помечается used=true и юзер должен запросить
-- новый код. Защищает от brute-force 6-значного кода с ботнета в обход
-- per-IP rate-limit (RateLimitFilter, 10 req/min на /api/auth/*).

ALTER TABLE verification_codes
    ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN verification_codes.failed_attempts IS
    'Число неверных попыток ввода кода. После порога строка помечается used (A13).';
