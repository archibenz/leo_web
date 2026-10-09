package com.reinasleo.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import jakarta.servlet.http.Cookie;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Sql("/telegram-identity-test-schema.sql")
class TelegramIdentityFlowTest {
    private static final AtomicLong SEQUENCE = new AtomicLong(81000000);
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    private User admin;
    private String token;
    private long telegramId;

    @BeforeEach
    void prepare() {
        admin = account("admin");
        token = jwt.generateToken(admin.getId(), admin.getEmail());
        telegramId = SEQUENCE.incrementAndGet();
    }

    private User account(String role) {
        User user = new User(UUID.randomUUID() + "@identity.test", "Identity", null, "test-hash",
                LocalDate.of(1990, 1, 1), false, true);
        user.setRole(role);
        return users.save(user);
    }

    private MockHttpServletRequestBuilder fresh(MockHttpServletRequestBuilder request) {
        return request.with(r -> {
            r.setRemoteAddr("192.0.2." + SEQUENCE.incrementAndGet());
            return r;
        });
    }

    private String issue() throws Exception {
        String response = mvc.perform(fresh(post("/api/auth/me/telegram-link/challenge"))
                        .cookie(new Cookie("rl_session", token)))
                .andExpect(status().isCreated())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andReturn().getResponse().getContentAsString();
        JsonNode node = json.readTree(response);
        assertThat(node.get("deep_link").asText()).endsWith("link_" + node.get("challenge_token").asText());
        assertThat(node.get("challenge_token").asText()).matches("[A-Za-z0-9_-]{43}");
        return node.get("challenge_token").asText();
    }

    private org.springframework.test.web.servlet.ResultActions confirm(String challenge, long sender) throws Exception {
        return mvc.perform(fresh(post("/api/bot/telegram-link/confirm"))
                .header("X-Bot-Secret", "test-bot-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("challengeToken", challenge,
                        "telegramId", sender, "telegramUsername", "identity_admin"))));
    }

    private org.springframework.test.web.servlet.ResultActions session() throws Exception {
        return mvc.perform(fresh(get("/api/admin/analytics-session")).cookie(new Cookie("rl_session", token)));
    }

    @Test
    void verifiedExistingUuidProducesNarrowNumericIdentityWithoutCreatingUsers() throws Exception {
        long count = users.count();
        String challenge = issue();
        confirm(challenge, telegramId).andExpect(status().isNoContent())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
        JsonNode response = json.readTree(session().andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andReturn().getResponse().getContentAsString());
        assertThat(response.size()).isEqualTo(7);
        assertThat(response.get("schema_version").asInt()).isEqualTo(1);
        assertThat(response.get("site_user_id").asText()).isEqualTo(admin.getId().toString());
        assertThat(response.get("telegram_id").isIntegralNumber()).isTrue();
        assertThat(response.get("telegram_id").asLong()).isEqualTo(telegramId);
        assertThat(response.get("telegram_verified").asBoolean()).isTrue();
        assertThat(response.get("is_admin").asBoolean()).isTrue();
        assertThat(response.get("telegram_username").asText()).isEqualTo("identity_admin");
        assertThat(Instant.parse(response.get("expires_at").asText())).isBeforeOrEqualTo(Instant.now().plusSeconds(60));
        assertThat(users.count()).isEqualTo(count);
        assertThat(users.findActiveById(admin.getId()).orElseThrow().getTelegramId()).isEqualTo(telegramId);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM telegram_link_challenges WHERE token_hash = ?",
                Integer.class, challenge)).isZero();
    }

    @Test
    void replayCannotRefreshOrChangeProof() throws Exception {
        String challenge = issue();
        confirm(challenge, telegramId).andExpect(status().isNoContent());
        Timestamp before = jdbc.queryForObject("SELECT verified_at FROM verified_telegram_identities WHERE user_id = ?",
                Timestamp.class, admin.getId());
        confirm(challenge, telegramId + 1).andExpect(status().isGone());
        assertThat(jdbc.queryForObject("SELECT verified_at FROM verified_telegram_identities WHERE user_id = ?",
                Timestamp.class, admin.getId())).isEqualTo(before);
        session().andExpect(status().isOk()).andExpect(jsonPath("$.telegram_id").value(telegramId));
    }

    @Test
    void expiredChallengeAndIssuerAreRejected() throws Exception {
        String challenge = issue();
        jdbc.update("UPDATE telegram_link_challenges SET created_at = ?, expires_at = ? WHERE user_id = ?",
                Timestamp.from(Instant.now().minusSeconds(600)), Timestamp.from(Instant.now().minusSeconds(1)),
                admin.getId());
        confirm(challenge, telegramId).andExpect(status().isGone());
        assertThat(users.findActiveById(admin.getId()).orElseThrow().getTelegramId()).isNull();
    }

    @Test
    void issuingAgainInvalidatesThePreviousChallenge() throws Exception {
        String old = issue();
        String current = issue();
        confirm(old, telegramId).andExpect(status().isGone());
        confirm(current, telegramId).andExpect(status().isNoContent());
    }

    @Test
    void uniqueIdentityConflictPreservesTargetAndChallenge() throws Exception {
        User other = account("user");
        other.setTelegramId(telegramId);
        users.save(other);
        String challenge = issue();
        confirm(challenge, telegramId).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("telegram_link_conflict"));
        assertThat(users.findActiveById(admin.getId()).orElseThrow().getTelegramId()).isNull();
        assertThat(jdbc.queryForObject("SELECT consumed_at FROM telegram_link_challenges WHERE user_id = ?",
                Timestamp.class, admin.getId())).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM verified_telegram_identities WHERE user_id = ?",
                Integer.class, admin.getId())).isZero();
    }

    @Test
    void legacyIdIsNotVerifiedAndReadonlyProbeDoesNotCreateRows() throws Exception {
        admin.setTelegramId(telegramId);
        users.save(admin);
        long before = jdbc.queryForObject("SELECT COUNT(*) FROM telegram_link_challenges", Long.class);
        session().andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM telegram_link_challenges", Long.class)).isEqualTo(before);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM verified_telegram_identities WHERE user_id = ?",
                Integer.class, admin.getId())).isZero();
    }

    @Test
    void demotionDeletionAndMismatchedCurrentTelegramFailClosed() throws Exception {
        confirm(issue(), telegramId).andExpect(status().isNoContent());
        jdbc.update("UPDATE users SET telegram_id = ? WHERE id = ?", telegramId + 1, admin.getId());
        session().andExpect(status().isForbidden());
        jdbc.update("UPDATE users SET telegram_id = ?, role = 'user' WHERE id = ?", telegramId, admin.getId());
        session().andExpect(status().isForbidden());
        jdbc.update("UPDATE users SET role = 'admin', deleted_at = ? WHERE id = ?",
                Timestamp.from(Instant.now()), admin.getId());
        session().andExpect(status().isForbidden());
    }

    @Test
    void staleProofFailsClosed() throws Exception {
        confirm(issue(), telegramId).andExpect(status().isNoContent());
        jdbc.update("UPDATE verified_telegram_identities SET verified_at = ?, valid_until = ? WHERE user_id = ?",
                Timestamp.from(Instant.now().minusSeconds(600)), Timestamp.from(Instant.now().minusSeconds(1)),
                admin.getId());
        session().andExpect(status().isForbidden());
    }

    @Test
    void bearerOnlyOrDifferentBearerCannotSupplyCookieAuthority() throws Exception {
        mvc.perform(fresh(get("/api/admin/analytics-session")).header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
        User other = account("admin");
        String otherToken = jwt.generateToken(other.getId(), other.getEmail());
        mvc.perform(fresh(get("/api/admin/analytics-session")).cookie(new Cookie("rl_session", token))
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isUnauthorized());
        mvc.perform(fresh(post("/api/auth/me/telegram-link/challenge"))
                        .cookie(new Cookie("rl_session", token))
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void secretAndOriginChecksBlockWrites() throws Exception {
        String challenge = issue();
        String body = json.writeValueAsString(Map.of("challengeToken", challenge, "telegramId", telegramId));
        mvc.perform(fresh(post("/api/bot/telegram-link/confirm")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(fresh(post("/api/bot/telegram-link/confirm")).header("X-Bot-Secret", "wrong")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(fresh(post("/api/auth/me/telegram-link/challenge")).cookie(new Cookie("rl_session", token))
                        .header("Origin", "https://untrusted.example"))
                .andExpect(status().isForbidden());
        assertThat(users.findActiveById(admin.getId()).orElseThrow().getTelegramId()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/admin/analytics-session", "/api/auth/me/telegram-link/challenge"})
    void securityLayerDenialsAlreadyHaveNoStore(String path) throws Exception {
        var request = path.endsWith("/challenge") ? post(path) : get(path);
        mvc.perform(fresh(request)).andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @Test
    void buyerAndRateLimitDenialsHaveNoStore() throws Exception {
        User buyer = account("user");
        mvc.perform(fresh(get("/api/admin/analytics-session"))
                        .cookie(new Cookie("rl_session", jwt.generateToken(buyer.getId(), buyer.getEmail()))))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
        String ip = "198.51.100." + SEQUENCE.incrementAndGet();
        for (int attempt = 0; attempt < 10; attempt++) {
            mvc.perform(post("/api/auth/me/telegram-link/challenge")
                            .with(r -> { r.setRemoteAddr(ip); return r; })
                            .cookie(new Cookie("rl_session", token)))
                    .andExpect(status().isCreated());
        }
        mvc.perform(post("/api/auth/me/telegram-link/challenge")
                        .with(r -> { r.setRemoteAddr(ip); return r; })
                        .cookie(new Cookie("rl_session", token)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "1.0", "\"12\"", "true", "9223372036854775808", "null"})
    void telegramIdMustBeAnActualPositiveDatabaseInteger(String value) throws Exception {
        String body = "{\"challengeToken\":\"" + "a".repeat(43) + "\",\"telegramId\":" + value + "}";
        mvc.perform(fresh(post("/api/bot/telegram-link/confirm")).header("X-Bot-Secret", "test-bot-secret")
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }
}
