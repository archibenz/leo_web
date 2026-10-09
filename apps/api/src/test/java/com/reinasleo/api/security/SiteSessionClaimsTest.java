package com.reinasleo.api.security;

import com.reinasleo.api.exception.UnauthorizedException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;

class SiteSessionClaimsTest {
    private static final String SECRET = "synthetic-site-key-with-at-least-32-bytes";
    private final SiteSessionClaims claims = new SiteSessionClaims(SECRET);
    private final UUID userId = UUID.randomUUID();

    private String token(Instant expires) {
        return Jwts.builder().subject(userId.toString()).expiration(Date.from(expires))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8))).compact();
    }

    @Test
    void readsSignedCookieExpiryAndAcceptsOnlyMatchingBearer() {
        Instant expiry = Instant.now().plusSeconds(30).truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        String value = token(expiry);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("rl_session", value));
        request.addHeader("Authorization", "Bearer " + value);
        assertThat(claims.requireCookie(request, userId).expiresAt()).isEqualTo(expiry);
        assertThat(claims.requireCookie(request, userId).userId()).isEqualTo(userId);
    }

    @Test
    void rejectsExpiredForgedAmbiguousOrWrongSubjectCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("rl_session", token(Instant.now().minusSeconds(1))));
        assertThatThrownBy(() -> claims.requireCookie(request, userId)).isInstanceOf(UnauthorizedException.class);
        request.setCookies(new Cookie("rl_session", "forged"));
        assertThatThrownBy(() -> claims.requireCookie(request, userId)).isInstanceOf(UnauthorizedException.class);
        String value = token(Instant.now().plusSeconds(30));
        request.setCookies(new Cookie("rl_session", value), new Cookie("rl_session", value));
        assertThatThrownBy(() -> claims.requireCookie(request, userId)).isInstanceOf(UnauthorizedException.class);
        request.setCookies(new Cookie("rl_session", value));
        assertThatThrownBy(() -> claims.requireCookie(request, UUID.randomUUID())).isInstanceOf(UnauthorizedException.class);
    }
}
