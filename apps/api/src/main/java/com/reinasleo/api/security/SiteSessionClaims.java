package com.reinasleo.api.security;

import com.reinasleo.api.exception.UnauthorizedException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.UUID;

@Component
public class SiteSessionClaims {
    private final SecretKey key;

    public record Session(UUID userId, Instant expiresAt) {}

    public SiteSessionClaims(@Value("$" + "{app.jwt.secret}") String secret) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("A valid Site JWT secret is required");
        }
        key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public Session requireCookie(HttpServletRequest request, UUID authenticatedUserId) {
        String token = null;
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (AuthCookies.SESSION_COOKIE.equals(cookie.getName())) {
                    if (token != null) throw denied();
                    token = cookie.getValue();
                }
            }
        }
        if (token == null || token.isBlank()) throw denied();
        String bearer = request.getHeader("Authorization");
        if (bearer != null && (!bearer.startsWith("Bearer ")
                || !MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8),
                    bearer.substring(7).trim().getBytes(StandardCharsets.UTF_8)))) {
            throw denied();
        }
        try {
            var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            UUID userId = UUID.fromString(claims.getSubject());
            if (!userId.equals(authenticatedUserId) || claims.getExpiration() == null) throw denied();
            return new Session(userId, claims.getExpiration().toInstant());
        } catch (RuntimeException exception) {
            throw denied();
        }
    }

    private static UnauthorizedException denied() {
        return new UnauthorizedException("site_session_required");
    }
}
