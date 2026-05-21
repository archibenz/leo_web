package com.reinasleo.api.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Issues / clears the httpOnly session cookie that mirrors the JWT.
 *
 * <p>SameSite=Lax + HttpOnly + Secure closes the XSS-steal vector that
 * localStorage suffered from. Lax allows top-level GET navigation (links from
 * email, Telegram redirects) but blocks cross-site POST/PUT/DELETE — that
 * already covers CSRF for our mutating endpoints, so no separate token is
 * required.
 *
 * <p>The Authorization: Bearer header path is kept for non-browser callers
 * (curl, integration tests, native apps) — the JwtAuthFilter accepts either.
 */
@Component
public class AuthCookies {

    public static final String SESSION_COOKIE = "rl_session";

    private final long maxAgeSeconds;

    public AuthCookies(@Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.maxAgeSeconds = expirationMs / 1000L;
    }

    public void issue(HttpServletResponse response, String token) {
        response.addHeader("Set-Cookie", build(token, maxAgeSeconds).toString());
    }

    public void clear(HttpServletResponse response) {
        response.addHeader("Set-Cookie", build("", 0).toString());
    }

    private static ResponseCookie build(String value, long maxAge) {
        return ResponseCookie.from(SESSION_COOKIE, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofSeconds(maxAge))
                .build();
    }
}
