package com.reinasleo.api.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String SECRET = "test-jwt-secret-key-minimum-32-characters-long-for-hmac";
    private static final long EXPIRATION_MS = 86_400_000L;

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, EXPIRATION_MS);
    }

    @Test
    void generateToken_returnsNonNullString() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "user@example.com");
        assertThat(token).isNotNull().isNotBlank();
    }

    @Test
    void extractUserId_returnsCorrectId() {
        UUID userId = UUID.randomUUID();
        String token = jwtService.generateToken(userId, "user@example.com");
        assertThat(jwtService.extractUserId(token)).isEqualTo(userId);
    }

    @Test
    void isValid_returnsTrueForFreshToken() {
        String token = jwtService.generateToken(UUID.randomUUID(), "user@example.com");
        assertThat(jwtService.isValid(token)).isTrue();
    }

    @Test
    void isValid_returnsFalseForExpiredToken() {
        JwtService shortLived = new JwtService(SECRET, -1000L);
        String token = shortLived.generateToken(UUID.randomUUID(), "user@example.com");
        assertThat(jwtService.isValid(token)).isFalse();
    }

    @Test
    void isValid_returnsFalseForGarbageString() {
        assertThat(jwtService.isValid("not.a.real.token")).isFalse();
    }

    @Test
    void isValid_returnsFalseForEmptyString() {
        assertThat(jwtService.isValid("")).isFalse();
    }

    @Test
    void tokenFromDifferentSecret_isInvalid() {
        JwtService other = new JwtService("another-secret-key-that-is-at-least-32-chars-long!!", EXPIRATION_MS);
        String token = other.generateToken(UUID.randomUUID(), "user@example.com");
        assertThat(jwtService.isValid(token)).isFalse();
    }
}
