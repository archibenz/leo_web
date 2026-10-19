package com.reinasleo.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.JwtService;
import jakarta.servlet.http.Cookie;
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
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Sql("/telegram-identity-test-schema.sql")
class AnalyticsIdentityFlowTest {
    private static final String ENDPOINT = "/api/auth/analytics-session";
    private static final AtomicLong SEQUENCE = new AtomicLong(91000000);
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired JwtService jwt;
    @Autowired JdbcTemplate jdbc;
    private User buyer;
    private String token;
    private long telegramId;

    @BeforeEach
    void prepare() {
        buyer = users.save(new User(UUID.randomUUID() + "@identity.test", "Identity", null,
                "test-hash", LocalDate.of(1990, 1, 1), false, true));
        token = jwt.generateToken(buyer.getId(), buyer.getEmail());
        telegramId = SEQUENCE.incrementAndGet();
    }

    private MockHttpServletRequestBuilder fresh(MockHttpServletRequestBuilder request) {
        return request.with(r -> { r.setRemoteAddr("192.0.2." + SEQUENCE.incrementAndGet()); return r; });
    }

    private void confirmIdentity() throws Exception {
        var issued = mvc.perform(fresh(post("/api/auth/me/telegram-link/challenge"))
                        .cookie(new Cookie("rl_session", token)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        String challenge = json.readTree(issued).get("challenge_token").asText();
        mvc.perform(fresh(post("/api/bot/telegram-link/confirm"))
                        .header("X-Bot-Secret", "test-bot-secret")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("challengeToken", challenge,
                                "telegramId", telegramId, "telegramUsername", "synthetic_buyer"))))
                .andExpect(status().isNoContent());
    }

    private ResultActions identity() throws Exception {
        return mvc.perform(fresh(get(ENDPOINT)).cookie(new Cookie("rl_session", token)));
    }

    @Test
    void verifiedBuyerGetsIdentityWithoutSiteAdminPrivilegesOrDatabaseWrites() throws Exception {
        confirmIdentity();
        long usersBefore = users.count();
        var proofBefore = jdbc.queryForMap("SELECT * FROM verified_telegram_identities WHERE user_id = ?", buyer.getId());
        long challengesBefore = jdbc.queryForObject("SELECT COUNT(*) FROM telegram_link_challenges", Long.class);

        JsonNode proof = json.readTree(identity().andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", containsString("no-store")))
                .andReturn().getResponse().getContentAsString());
        assertThat(proof.size()).isEqualTo(7);
        assertThat(proof.get("schema_version").asInt()).isEqualTo(1);
        assertThat(proof.get("site_user_id").asText()).isEqualTo(buyer.getId().toString());
        assertThat(proof.get("telegram_id").isIntegralNumber()).isTrue();
        assertThat(proof.get("telegram_id").asLong()).isEqualTo(telegramId);
        assertThat(proof.get("telegram_verified").asBoolean()).isTrue();
        assertThat(proof.get("is_admin").asBoolean()).isFalse();
        assertThat(proof.get("telegram_username").asText()).isEqualTo("synthetic_buyer");
        assertThat(Instant.parse(proof.get("expires_at").asText())).isAfter(Instant.now())
                .isBeforeOrEqualTo(Instant.now().plusSeconds(60));
        assertThat(users.findActiveById(buyer.getId()).orElseThrow().getRole()).isEqualTo("user");
        assertThat(users.count()).isEqualTo(usersBefore);
        assertThat(jdbc.queryForMap("SELECT * FROM verified_telegram_identities WHERE user_id = ?", buyer.getId()))
                .isEqualTo(proofBefore);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM telegram_link_challenges", Long.class))
                .isEqualTo(challengesBefore);
        mvc.perform(fresh(get("/api/admin/analytics-session")).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isForbidden());
        mvc.perform(fresh(get("/api/admin/site/socials")).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isForbidden());
    }

    @Test
    void informationalAdminFlagFollowsCurrentSiteRoleWithoutBlockingBuyerProof() throws Exception {
        confirmIdentity();
        jdbc.update("UPDATE users SET role = 'admin' WHERE id = ?", buyer.getId());
        identity().andExpect(status().isOk()).andExpect(jsonPath("$.is_admin").value(true));
        mvc.perform(fresh(get("/api/admin/analytics-session")).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.is_admin").value(true));
        jdbc.update("UPDATE users SET role = 'user' WHERE id = ?", buyer.getId());
        identity().andExpect(status().isOk()).andExpect(jsonPath("$.is_admin").value(false));
        mvc.perform(fresh(get("/api/admin/analytics-session")).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"absent", "legacy", "stale", "future", "mismatch", "revoked"})
    void invalidProofIsForbiddenAndNeverCached(String state) throws Exception {
        if (!state.equals("absent") && !state.equals("legacy")) confirmIdentity();
        switch (state) {
            case "legacy" -> jdbc.update("UPDATE users SET telegram_id = ? WHERE id = ?", telegramId, buyer.getId());
            case "stale" -> jdbc.update("UPDATE verified_telegram_identities SET verified_at = ?, valid_until = ? WHERE user_id = ?",
                    Timestamp.from(Instant.now().minusSeconds(600)), Timestamp.from(Instant.now().minusSeconds(1)), buyer.getId());
            case "future" -> jdbc.update("UPDATE verified_telegram_identities SET verified_at = ? WHERE user_id = ?",
                    Timestamp.from(Instant.now().plusSeconds(600)), buyer.getId());
            case "mismatch" -> jdbc.update("UPDATE users SET telegram_id = ? WHERE id = ?", telegramId + 1, buyer.getId());
            case "revoked" -> jdbc.update("DELETE FROM verified_telegram_identities WHERE user_id = ?", buyer.getId());
            default -> { }
        }
        identity().andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void anonymousMalformedAndDeletedSessionsFailBeforeControllerAndAreNotCached() throws Exception {
        mvc.perform(fresh(get(ENDPOINT))).andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
        mvc.perform(fresh(get(ENDPOINT)).cookie(new Cookie("rl_session", "malformed")))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
        confirmIdentity();
        jdbc.update("UPDATE users SET deleted_at = ? WHERE id = ?", Timestamp.from(Instant.now()), buyer.getId());
        identity().andExpect(status().isForbidden())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }

    @Test
    void bearerOnlyDuplicateAndConflictingCookiesCannotSupplyIdentityAuthority() throws Exception {
        confirmIdentity();
        String otherToken = jwt.generateToken(UUID.randomUUID(), "other@identity.test");
        for (var request : new MockHttpServletRequestBuilder[] {
                get(ENDPOINT).header("Authorization", "Bearer " + token),
                get(ENDPOINT).cookie(new Cookie("rl_session", token), new Cookie("rl_session", token)),
                get(ENDPOINT).cookie(new Cookie("rl_session", token), new Cookie("rl_session", otherToken)),
                get(ENDPOINT).cookie(new Cookie("rl_session", otherToken)).header("Authorization", "Bearer " + token),
                get(ENDPOINT).cookie(new Cookie("rl_session", token)).header("Authorization", "Basic malformed")
        }) {
            mvc.perform(fresh(request)).andExpect(status().isUnauthorized())
                    .andExpect(header().string("Cache-Control", containsString("no-store")));
        }
    }

    @Test
    void identityProbesHaveIndependentBoundedAllowanceAndRateDenialIsNotCached() throws Exception {
        confirmIdentity();
        String ip = "198.51.100." + SEQUENCE.incrementAndGet();
        for (int attempt = 0; attempt < 30; attempt++) {
            mvc.perform(get(ENDPOINT).with(r -> { r.setRemoteAddr(ip); return r; })
                            .cookie(new Cookie("rl_session", token)))
                    .andExpect(status().isOk());
        }
        mvc.perform(get(ENDPOINT).with(r -> { r.setRemoteAddr(ip); return r; })
                        .cookie(new Cookie("rl_session", token)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(header().string("Cache-Control", containsString("no-store")));
        mvc.perform(post("/api/auth/me/telegram-link/challenge")
                        .with(r -> { r.setRemoteAddr(ip); return r; }).cookie(new Cookie("rl_session", token)))
                .andExpect(status().isCreated());
    }

    @Test
    void invalidCookiesAreBoundedWithoutConsumingAuthenticatedUserAllowance() throws Exception {
        confirmIdentity();
        String ip = "198.51.100." + SEQUENCE.incrementAndGet();
        for (int attempt = 0; attempt < 31; attempt++) {
            mvc.perform(get(ENDPOINT).with(r -> { r.setRemoteAddr(ip); return r; })
                            .cookie(new Cookie("rl_session", "invalid-cookie-" + attempt)))
                    .andExpect(status().is(attempt < 30 ? 403 : 429))
                    .andExpect(header().string("Cache-Control", containsString("no-store")));
        }
        for (int attempt = 0; attempt < 30; attempt++) {
            mvc.perform(get(ENDPOINT).with(r -> { r.setRemoteAddr(ip); return r; })
                            .cookie(new Cookie("rl_session", token)))
                    .andExpect(status().isOk());
        }
        mvc.perform(get(ENDPOINT).with(r -> { r.setRemoteAddr(ip); return r; })
                        .cookie(new Cookie("rl_session", token)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void authenticatedUsersBehindSameProxyHaveIndependentIdentityAllowance() throws Exception {
        confirmIdentity();
        String firstToken = token;
        prepare();
        confirmIdentity();
        String ip = "198.51.100." + SEQUENCE.incrementAndGet();
        for (String sessionToken : new String[] { firstToken, token }) {
            for (int attempt = 0; attempt < 30; attempt++) {
                mvc.perform(get(ENDPOINT).with(r -> { r.setRemoteAddr(ip); return r; })
                                .cookie(new Cookie("rl_session", sessionToken)))
                        .andExpect(status().isOk());
            }
            mvc.perform(get(ENDPOINT).with(r -> { r.setRemoteAddr(ip); return r; })
                            .cookie(new Cookie("rl_session", sessionToken)))
                    .andExpect(status().isTooManyRequests());
        }
    }

    @Test
    void changingCookieOrIpDoesNotResetAnAuthenticatedUsersQuota() throws Exception {
        confirmIdentity();
        for (int attempt = 0; attempt < 30; attempt++) identity().andExpect(status().isOk());
        String renewed = jwt.generateToken(buyer.getId(), "different-claim@identity.test");
        assertThat(renewed).isNotEqualTo(token);
        mvc.perform(fresh(get(ENDPOINT)).cookie(new Cookie("rl_session", renewed)))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Cache-Control", containsString("no-store")));
    }
}
