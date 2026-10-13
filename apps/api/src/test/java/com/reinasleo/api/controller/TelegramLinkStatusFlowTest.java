package com.reinasleo.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Sql("/telegram-identity-test-schema.sql")
class TelegramLinkStatusFlowTest {
    private static final String PATH = "/api/auth/me/telegram-link/status";
    private static final AtomicLong SEQUENCE = new AtomicLong(91000000);
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    private User member;
    private String token;
    private long telegramId;

    @BeforeEach
    void prepare() {
        member = account();
        token = jwt.generateToken(member.getId(), member.getEmail());
        telegramId = SEQUENCE.incrementAndGet();
    }

    private User account() {
        return users.save(new User(UUID.randomUUID() + "@link-status.test", "Member", null, "test-hash",
                LocalDate.of(1990, 1, 1), false, true));
    }

    private MockHttpServletRequestBuilder fresh(MockHttpServletRequestBuilder request) {
        return request.with(r -> {
            r.setRemoteAddr("192.0.2." + SEQUENCE.incrementAndGet());
            return r;
        });
    }

    private JsonNode readStatus() throws Exception {
        return json.readTree(mvc.perform(fresh(get(PATH)).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andReturn().getResponse().getContentAsString());
    }

    private void proof(Instant verifiedAt, Instant validUntil) {
        jdbc.update("UPDATE users SET telegram_id = ? WHERE id = ?", telegramId, member.getId());
        jdbc.update("""
                INSERT INTO verified_telegram_identities
                (user_id, telegram_id, telegram_username, verified_at, valid_until) VALUES (?, ?, ?, ?, ?)
                """, member.getId(), telegramId, "private_username", Timestamp.from(verifiedAt), Timestamp.from(validUntil));
    }

    @Test
    void ordinaryMemberGetsNarrowStatusWithoutMutatingProofOrChallenges() throws Exception {
        Instant verifiedAt = Instant.now().minusSeconds(30).truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        proof(verifiedAt, Instant.now().plusSeconds(300));
        long challenges = jdbc.queryForObject("SELECT COUNT(*) FROM telegram_link_challenges", Long.class);
        JsonNode response = readStatus();
        assertThat(response.size()).isEqualTo(5);
        assertThat(response.get("schema_version").asInt()).isEqualTo(1);
        assertThat(response.get("site_user_id").asText()).isEqualTo(member.getId().toString());
        assertThat(response.get("linked").asBoolean()).isTrue();
        assertThat(response.get("verified").asBoolean()).isTrue();
        assertThat(Instant.parse(response.get("verified_until").asText())).isAfter(Instant.now());
        assertThat(jdbc.queryForObject("SELECT verified_at FROM verified_telegram_identities WHERE user_id = ?",
                Timestamp.class, member.getId()).toInstant()).isEqualTo(verifiedAt);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM telegram_link_challenges", Long.class)).isEqualTo(challenges);
        mvc.perform(fresh(get("/api/admin/analytics-session")).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    void staleProofRemainsLinkedButDoesNotSupplyVerification() throws Exception {
        proof(Instant.now().minusSeconds(300), Instant.now().minusSeconds(1));
        JsonNode response = readStatus();
        assertThat(response.get("linked").asBoolean()).isTrue();
        assertThat(response.get("verified").asBoolean()).isFalse();
        assertThat(response.get("verified_until").isNull()).isTrue();
    }

    @Test
    void legacyTelegramFieldAloneAndMismatchedProofDoNotConnect() throws Exception {
        jdbc.update("UPDATE users SET telegram_id = ? WHERE id = ?", telegramId, member.getId());
        assertThat(readStatus().get("linked").asBoolean()).isFalse();
        proof(Instant.now().minusSeconds(30), Instant.now().plusSeconds(300));
        jdbc.update("UPDATE users SET telegram_id = ? WHERE id = ?", telegramId + 1, member.getId());
        JsonNode response = readStatus();
        assertThat(response.get("linked").asBoolean()).isFalse();
        assertThat(response.get("verified").asBoolean()).isFalse();
        assertThat(response.get("verified_until").isNull()).isTrue();
    }

    @Test
    void missingCookieCannotBeReplacedWithBearer() throws Exception {
        mvc.perform(fresh(get(PATH)).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void differingBearerAndDuplicateCookiesFailClosed() throws Exception {
        User other = account();
        String otherToken = jwt.generateToken(other.getId(), other.getEmail());
        mvc.perform(fresh(get(PATH)).cookie(new Cookie("rl_session", token))
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
        mvc.perform(fresh(get(PATH)).cookie(new Cookie("rl_session", token), new Cookie("rl_session", token)))
                .andExpect(status().isUnauthorized());
        mvc.perform(fresh(get(PATH)).cookie(new Cookie("rl_session", token)).header("Authorization", "Basic invalid"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void matchingBearerAndCookieAreAccepted() throws Exception {
        mvc.perform(fresh(get(PATH)).cookie(new Cookie("rl_session", token)).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.site_user_id").value(member.getId().toString()));
    }

    @Test
    void anonymousExpiredAndDeletedSessionsAreRejectedWithNoStore() throws Exception {
        mvc.perform(fresh(get(PATH))).andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
        String expired = Jwts.builder().subject(member.getId().toString())
                .expiration(Date.from(Instant.now().minusSeconds(1)))
                .signWith(Keys.hmacShaKeyFor("test-jwt-secret-key-minimum-32-characters-long-for-hmac"
                        .getBytes(StandardCharsets.UTF_8))).compact();
        mvc.perform(fresh(get(PATH)).cookie(new Cookie("rl_session", expired)))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
        jdbc.update("UPDATE users SET deleted_at = ? WHERE id = ?", Timestamp.from(Instant.now()), member.getId());
        mvc.perform(fresh(get(PATH)).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void nonGetMethodCannotMutateStatus() throws Exception {
        mvc.perform(fresh(post(PATH)).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void pollingRateLimitAlsoPreventsCaching() throws Exception {
        String ip = "198.51.100." + SEQUENCE.incrementAndGet();
        for (int attempt = 0; attempt < 30; attempt++) {
            mvc.perform(get(PATH).with(r -> { r.setRemoteAddr(ip); return r; })
                            .cookie(new Cookie("rl_session", token)))
                    .andExpect(status().isOk());
        }
        mvc.perform(get(PATH).with(r -> { r.setRemoteAddr(ip); return r; }).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }
}
