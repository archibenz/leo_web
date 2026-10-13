package com.reinasleo.api.service;

import com.reinasleo.api.exception.UnauthorizedException;
import com.reinasleo.api.repository.TelegramIdentityStore;
import com.reinasleo.api.repository.TelegramIdentityStore.Account;
import com.reinasleo.api.repository.TelegramIdentityStore.Identity;
import com.reinasleo.api.security.SiteSessionClaims.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TelegramLinkStatusTest {
    private final Instant now = Instant.parse("2026-10-12T12:00:00Z");
    private final UUID userId = UUID.randomUUID();
    private final Session session = new Session(userId, now.plusSeconds(600));
    private TelegramIdentityStore store;
    private TelegramIdentityService service;

    @BeforeEach
    void prepare() {
        store = mock(TelegramIdentityStore.class);
        service = new TelegramIdentityService(store, "test_bot", Clock.fixed(now, ZoneOffset.UTC));
    }

    private void linkedAccount(Instant verifiedAt, Instant validUntil) {
        when(store.activeAccount(userId, false)).thenReturn(Optional.of(new Account(userId, 7L, "user")));
        when(store.identity(userId)).thenReturn(Optional.of(new Identity(userId, 7L, "private_username",
                verifiedAt, validUntil)));
    }

    @Test
    void memberStatusUsesTrustedProofAndCapsValidityToSessionWithoutWrites() {
        linkedAccount(now.minusSeconds(1), now.plusSeconds(1200));
        var status = service.linkStatus(session);
        assertThat(status.schemaVersion()).isEqualTo(1);
        assertThat(status.siteUserId()).isEqualTo(userId);
        assertThat(status.linked()).isTrue();
        assertThat(status.verified()).isTrue();
        assertThat(status.verifiedUntil()).isEqualTo(session.expiresAt());
        verify(store).activeAccount(userId, false);
        verify(store).identity(userId);
        verifyNoMoreInteractions(store);
    }

    @Test
    void shorterProofBoundsVerification() {
        linkedAccount(now.minusSeconds(1), now.plusSeconds(10));
        assertThat(service.linkStatus(session).verifiedUntil()).isEqualTo(now.plusSeconds(10));
    }

    @ParameterizedTest
    @ValueSource(ints = {2, 100})
    void newSessionReusesLongLivedProofWithoutRenewingIt(int sessionDays) {
        Instant confirmedAt = now.minus(Duration.ofDays(2));
        Instant proofExpiry = confirmedAt.plus(Duration.ofDays(90));
        linkedAccount(confirmedAt, proofExpiry);
        Session fresh = new Session(userId, now.plus(Duration.ofDays(sessionDays)));

        assertThatThrownBy(() -> service.linkStatus(new Session(userId, confirmedAt.plusSeconds(60))))
                .isInstanceOf(UnauthorizedException.class);
        var status = service.linkStatus(fresh);

        assertThat(status.siteUserId()).isEqualTo(userId);
        assertThat(status.linked()).isTrue();
        assertThat(status.verified()).isTrue();
        assertThat(status.verifiedUntil()).isEqualTo(sessionDays == 2 ? fresh.expiresAt() : proofExpiry);
        verify(store).activeAccount(userId, false);
        verify(store).identity(userId);
        verifyNoMoreInteractions(store);
    }

    @Test
    void expiredProofKeepsConnectionWithoutGrantingFreshVerification() {
        linkedAccount(now.minusSeconds(60), now);
        var status = service.linkStatus(session);
        assertThat(status.linked()).isTrue();
        assertThat(status.verified()).isFalse();
        assertThat(status.verifiedUntil()).isNull();
    }

    @Test
    void futureProofCannotClaimConnection() {
        linkedAccount(now.plusSeconds(1), now.plusSeconds(60));
        var status = service.linkStatus(session);
        assertThat(status.linked()).isFalse();
        assertThat(status.verified()).isFalse();
        assertThat(status.verifiedUntil()).isNull();
    }

    @Test
    void legacyIdWithoutProofIsNotTrusted() {
        when(store.activeAccount(userId, false)).thenReturn(Optional.of(new Account(userId, 7L, "user")));
        var status = service.linkStatus(session);
        assertThat(status.linked()).isFalse();
        assertThat(status.verified()).isFalse();
        assertThat(status.verifiedUntil()).isNull();
    }

    @Test
    void proofMustStillMatchTheCurrentAccountsTelegramId() {
        linkedAccount(now.minusSeconds(1), now.plusSeconds(60));
        for (Long currentId : new Long[]{null, 8L}) {
            when(store.activeAccount(userId, false)).thenReturn(Optional.of(new Account(userId, currentId, "user")));
            var status = service.linkStatus(session);
            assertThat(status.linked()).isFalse();
            assertThat(status.verified()).isFalse();
            assertThat(status.verifiedUntil()).isNull();
        }
    }

    @Test
    void proofFromAnotherAccountFailsClosed() {
        linkedAccount(now.minusSeconds(1), now.plusSeconds(60));
        when(store.identity(userId)).thenReturn(Optional.of(new Identity(UUID.randomUUID(), 7L, null,
                now.minusSeconds(1), now.plusSeconds(60))));
        assertThat(service.linkStatus(session).linked()).isFalse();
    }

    @Test
    void deletedAccountCannotReadIdentity() {
        assertThatThrownBy(() -> service.linkStatus(session)).isInstanceOf(UnauthorizedException.class);
        verify(store).activeAccount(userId, false);
        verifyNoMoreInteractions(store);
    }

    @Test
    void expiredSessionCannotReadAccount() {
        assertThatThrownBy(() -> service.linkStatus(new Session(userId, now)))
                .isInstanceOf(UnauthorizedException.class);
        verifyNoInteractions(store);
    }

    @Test
    void sessionExpiringDuringReadIsRejected() {
        Clock advancing = mock(Clock.class);
        when(advancing.instant()).thenReturn(now, session.expiresAt());
        linkedAccount(now.minusSeconds(1), now.plusSeconds(1200));
        var delayed = new TelegramIdentityService(store, "test_bot", advancing);
        assertThatThrownBy(() -> delayed.linkStatus(session)).isInstanceOf(UnauthorizedException.class);
    }
}
