package com.reinasleo.api.service;

import com.reinasleo.api.exception.UnauthorizedException;
import com.reinasleo.api.repository.TelegramIdentityStore;
import com.reinasleo.api.security.SiteSessionClaims.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsIdentityServiceTest {
    private final Instant now = Instant.parse("2026-10-19T00:00:00Z");
    private final UUID userId = UUID.randomUUID();
    private TelegramIdentityStore store;
    private TelegramIdentityService service;

    @BeforeEach
    void prepare() {
        store = mock(TelegramIdentityStore.class);
        service = new TelegramIdentityService(store, "test_bot", Clock.fixed(now, ZoneOffset.UTC));
        when(store.activeAccount(userId, false)).thenReturn(Optional.of(
                new TelegramIdentityStore.Account(userId, 17L, "user")));
    }

    private void proof(UUID owner, Instant until) {
        when(store.identity(userId)).thenReturn(Optional.of(new TelegramIdentityStore.Identity(
                owner, 17L, null, now.minusSeconds(10), until)));
    }

    @ParameterizedTest
    @CsvSource({"5, 10, 5", "100, 10, 10", "100, 200, 60"})
    void buyerAssertionNeverOutlivesSessionProofOrSixtySeconds(int sessionSeconds, int proofSeconds, int expectedSeconds) {
        proof(userId, now.plusSeconds(proofSeconds));
        var response = service.analyticsIdentity(new Session(userId, now.plusSeconds(sessionSeconds)));
        assertThat(response.isAdmin()).isFalse();
        assertThat(response.telegramVerified()).isTrue();
        assertThat(response.telegramId()).isEqualTo(17L);
        assertThat(response.expiresAt()).isEqualTo(now.plusSeconds(expectedSeconds));
        verify(store).activeAccount(userId, false);
        verify(store).identity(userId);
        verifyNoMoreInteractions(store);
    }

    @Test
    void expiredSiteSessionFailsBeforeAnyDatabaseRead() {
        assertThatThrownBy(() -> service.analyticsIdentity(new Session(userId, now)))
                .isInstanceOf(UnauthorizedException.class);
        verifyNoInteractions(store);
    }

    @Test
    void inactiveAccountCannotProduceIdentity() {
        when(store.activeAccount(userId, false)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.analyticsIdentity(new Session(userId, now.plusSeconds(60))))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void proofFromDifferentAccountFailsEvenWithSameNumericTelegramId() {
        proof(UUID.randomUUID(), now.plusSeconds(60));
        assertThatThrownBy(() -> service.analyticsIdentity(new Session(userId, now.plusSeconds(60))))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getReason()).isEqualTo("telegram_link_required"));
    }

    @Test
    void sessionExpiryDuringProofReadCannotProduceAlreadyExpiredAssertion() {
        proof(userId, now.plusSeconds(100));
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenReturn(now, now.plusSeconds(30));
        var delayed = new TelegramIdentityService(store, "test_bot", clock);
        assertThatThrownBy(() -> delayed.analyticsIdentity(new Session(userId, now.plusSeconds(10))))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void proofExpiryDuringReadCannotProduceAlreadyExpiredAssertion() {
        proof(userId, now.plusSeconds(10));
        Clock clock = mock(Clock.class);
        when(clock.instant()).thenReturn(now, now.plusSeconds(30));
        var delayed = new TelegramIdentityService(store, "test_bot", clock);
        assertThatThrownBy(() -> delayed.analyticsIdentity(new Session(userId, now.plusSeconds(60))))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getReason()).isEqualTo("telegram_link_refresh_required"));
    }
}
