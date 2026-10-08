package com.reinasleo.api.service;

import com.reinasleo.api.dto.BotTelegramLinkConfirmRequest;
import com.reinasleo.api.exception.ConflictException;
import com.reinasleo.api.exception.UnauthorizedException;
import com.reinasleo.api.repository.TelegramIdentityStore;
import com.reinasleo.api.security.SiteSessionClaims.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TelegramIdentityServiceTest {
    private final Instant now = Instant.parse("2026-10-08T12:00:00Z");
    private final UUID userId = UUID.randomUUID();
    private TelegramIdentityStore store;
    private TelegramIdentityService service;

    @BeforeEach
    void prepare() {
        store = mock(TelegramIdentityStore.class);
        service = new TelegramIdentityService(store, "test_bot", Clock.fixed(now, ZoneOffset.UTC));
        when(store.challengeUserId(any())).thenReturn(Optional.of(userId));
    }

    @Test
    void assertionExpiresNoLaterThanJwtOrProof() {
        when(store.activeAccount(userId, false)).thenReturn(Optional.of(new TelegramIdentityStore.Account(userId, 7L, "admin")));
        when(store.identity(userId)).thenReturn(Optional.of(new TelegramIdentityStore.Identity(userId, 7L, null,
                now.minusSeconds(1), now.plusSeconds(10))));
        var response = service.analyticsSession(new Session(userId, now.plusSeconds(5)));
        assertThat(response.expiresAt()).isEqualTo(now.plusSeconds(5));
        response = service.analyticsSession(new Session(userId, now.plusSeconds(100)));
        assertThat(response.expiresAt()).isEqualTo(now.plusSeconds(10));
        verify(store, never()).issue(any(), any(), any(), any(), any());
        verify(store, never()).verify(any(), anyLong(), any(), any(), any());
    }

    @Test
    void expiredSessionCannotIssueOrReadIdentity() {
        Session expired = new Session(userId, now);
        assertThatThrownBy(() -> service.issue(expired)).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> service.analyticsSession(expired)).isInstanceOf(UnauthorizedException.class);
        verifyNoInteractions(store);
    }

    @Test
    void freshRoleReadRejectsRevokedAdmin() {
        when(store.activeAccount(userId, false)).thenReturn(Optional.of(new TelegramIdentityStore.Account(userId, 7L, "user")));
        assertThatThrownBy(() -> service.analyticsSession(new Session(userId, now.plusSeconds(10))))
                .isInstanceOf(ResponseStatusException.class);
        verify(store, never()).identity(any());
    }

    @Test
    void proofCannotBeReassignedEvenIfLegacyUserLostItsTelegramId() {
        when(store.lockChallenge(any())).thenReturn(Optional.of(new TelegramIdentityStore.Challenge(
                userId, now.plusSeconds(10), now.plusSeconds(30), null)));
        when(store.activeAccount(userId, true)).thenReturn(Optional.of(new TelegramIdentityStore.Account(userId, null, "admin")));
        when(store.identity(userId)).thenReturn(Optional.of(new TelegramIdentityStore.Identity(userId, 7L, null,
                now.minusSeconds(10), now.plusSeconds(100))));
        assertThatThrownBy(() -> service.confirm(new BotTelegramLinkConfirmRequest("a".repeat(43), 8L, null)))
                .isInstanceOf(ConflictException.class);
        verify(store, never()).verify(any(), anyLong(), any(), any(), any());
        verify(store, never()).consume(any(), any());
    }

    @Test
    void expiryCrossedDuringAnAccountLockCannotIssueAChallenge() {
        Clock advancing = mock(Clock.class);
        when(advancing.instant()).thenReturn(now, now.plusSeconds(30));
        var delayed = new TelegramIdentityService(store, "test_bot", advancing);
        when(store.activeAccount(userId, true)).thenReturn(Optional.of(new TelegramIdentityStore.Account(userId, null, "admin")));
        assertThatThrownBy(() -> delayed.issue(new Session(userId, now.plusSeconds(10))))
                .isInstanceOf(UnauthorizedException.class);
        verify(store, never()).issue(any(), any(), any(), any(), any());
    }

    @Test
    void expiryCrossedDuringChallengeLocksCannotConsumeTheToken() {
        Clock advancing = mock(Clock.class);
        when(advancing.instant()).thenReturn(now);
        var delayed = new TelegramIdentityService(store, "test_bot", advancing);
        when(store.activeAccount(userId, true)).thenReturn(Optional.of(new TelegramIdentityStore.Account(userId, null, "admin")));
        when(store.lockChallenge(any())).thenAnswer(invocation -> {
            when(advancing.instant()).thenReturn(now.plusSeconds(30));
            return Optional.of(new TelegramIdentityStore.Challenge(userId, now.plusSeconds(10), now.plusSeconds(20), null));
        });
        assertThatThrownBy(() -> delayed.confirm(new BotTelegramLinkConfirmRequest("a".repeat(43), 7L, null)))
                .isInstanceOf(ResponseStatusException.class);
        verify(store, never()).verify(any(), anyLong(), any(), any(), any());
        verify(store, never()).consume(any(), any());
    }

    @Test
    void uniqueRaceNeverConsumesTheChallenge() {
        when(store.lockChallenge(any())).thenReturn(Optional.of(new TelegramIdentityStore.Challenge(
                userId, now.plusSeconds(10), now.plusSeconds(30), null)));
        var account = new TelegramIdentityStore.Account(userId, null, "admin");
        when(store.activeAccount(userId, true)).thenReturn(Optional.of(account));
        when(store.identity(userId)).thenReturn(Optional.empty());
        doThrow(new DataIntegrityViolationException("synthetic race"))
                .when(store).verify(eq(account), eq(7L), isNull(), eq(now), any());
        assertThatThrownBy(() -> service.confirm(new BotTelegramLinkConfirmRequest("a".repeat(43), 7L, null)))
                .isInstanceOf(ConflictException.class).hasMessage("telegram_link_conflict");
        verify(store, never()).consume(any(), any());
    }
}
