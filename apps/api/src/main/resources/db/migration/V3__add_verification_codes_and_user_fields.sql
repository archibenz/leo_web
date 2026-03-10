-- Email verification codes
CREATE TABLE verification_codes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) NOT NULL,
    code       VARCHAR(6)   NOT NULL,
    expires_at TIMESTAMPTZ  NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_vc_email ON verification_codes (email);
CREATE INDEX idx_vc_email_code ON verification_codes (email, code);

-- Expand user profile fields
ALTER TABLE users ADD COLUMN surname        VARCHAR(255);
ALTER TABLE users ADD COLUMN date_of_birth  DATE;
ALTER TABLE users ADD COLUMN newsletter     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN privacy_accepted BOOLEAN NOT NULL DEFAULT false;
