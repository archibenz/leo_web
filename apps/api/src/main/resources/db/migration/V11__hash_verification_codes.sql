-- Replace plaintext verification codes with SHA-256 hex hash.
-- Existing pending codes (10-min window) are invalidated; users re-request.

DROP INDEX IF EXISTS idx_vc_email_code;

ALTER TABLE verification_codes DROP COLUMN code;
ALTER TABLE verification_codes ADD COLUMN code_hash VARCHAR(64) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_verification_codes_email_used
    ON verification_codes (email, used);

COMMENT ON COLUMN verification_codes.code_hash IS 'SHA-256 hex хэш 6-значного кода (plain отправляется только по email)';
