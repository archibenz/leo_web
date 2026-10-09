package com.reinasleo.api.service;

import com.reinasleo.api.dto.BotTelegramLinkConfirmRequest;
import com.reinasleo.api.exception.ConflictException;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.TelegramIdentityStore;
import com.reinasleo.api.repository.UserRepository;
import com.reinasleo.api.security.SiteSessionClaims.Session;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.SpyBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@Sql("/telegram-identity-test-schema.sql")
class TelegramIdentityRollbackTest {
    @Autowired TelegramIdentityService identities;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;
    @SpyBean TelegramIdentityStore store;

    @Test
    void failureAfterBothIdentityWritesRollsBackUserProofAndConsumption() {
        User user = new User(UUID.randomUUID() + "@rollback.test", "Rollback", null, "test-hash",
                LocalDate.of(1990, 1, 1), false, true);
        user.setRole("admin");
        user = users.save(user);
        UUID id = user.getId();
        String token = identities.issue(new Session(id, Instant.now().plusSeconds(600))).challengeToken();
        doThrow(new ConflictException("synthetic_consume_failure")).when(store).consume(any(), any());

        assertThatThrownBy(() -> identities.confirm(new BotTelegramLinkConfirmRequest(token, 92000001L, null)))
                .isInstanceOf(ConflictException.class).hasMessage("synthetic_consume_failure");

        assertThat(users.findActiveById(id).orElseThrow().getTelegramId()).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM verified_telegram_identities WHERE user_id = ?",
                Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject("SELECT consumed_at FROM telegram_link_challenges WHERE user_id = ?",
                Timestamp.class, id)).isNull();
    }
}
