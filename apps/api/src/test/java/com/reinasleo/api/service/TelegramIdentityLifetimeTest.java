package com.reinasleo.api.service;

import com.reinasleo.api.dto.BotTelegramLinkConfirmRequest;
import com.reinasleo.api.exception.UnauthorizedException;
import com.reinasleo.api.repository.TelegramIdentityStore;
import com.reinasleo.api.security.SiteSessionClaims.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class TelegramIdentityLifetimeTest {
    private final Instant confirmedAt = Instant.parse("2026-10-13T00:00:00Z");
    private final UUID userId = UUID.randomUUID();
    private final TelegramIdentityStore.Account account = new TelegramIdentityStore.Account(userId, 7L, "admin");
    private TelegramIdentityStore store;

    @BeforeEach
    void prepare() {
        store = mock(TelegramIdentityStore.class);
        when(store.challengeUserId(any())).thenReturn(Optional.of(userId));
        when(store.activeAccount(userId, true)).thenReturn(Optional.of(account));
        when(store.activeAccount(userId, false)).thenReturn(Optional.of(account));
    }

    private TelegramIdentityService at(Instant time) {
        return new TelegramIdentityService(store, "test_bot", Clock.fixed(time, ZoneOffset.UTC));
    }

    private TelegramIdentityStore.Identity confirm(Instant issuerExpiresAt) {
        when(store.lockChallenge(any())).thenReturn(Optional.of(new TelegramIdentityStore.Challenge(
                userId, confirmedAt.plusSeconds(60), issuerExpiresAt, null)));
        at(confirmedAt).confirm(new BotTelegramLinkConfirmRequest("a".repeat(43), 7L, null));
        var verifiedAt = ArgumentCaptor.forClass(Instant.class);
        var validUntil = ArgumentCaptor.forClass(Instant.class);
        verify(store).verify(eq(account), eq(7L), isNull(), verifiedAt.capture(), validUntil.capture());
        var proof = new TelegramIdentityStore.Identity(userId, 7L, null, verifiedAt.getValue(), validUntil.getValue());
        when(store.identity(userId)).thenReturn(Optional.of(proof));
        return proof;
    }

    @ParameterizedTest
    @ValueSource(longs = {60, 8640000})
    void proofLastsNinetyDaysFromConfirmationRegardlessOfIssuerExpiry(long issuerSeconds) {
        var proof = confirm(confirmedAt.plusSeconds(issuerSeconds));
        assertThat(proof.verifiedAt()).isEqualTo(confirmedAt);
        assertThat(proof.validUntil()).isEqualTo(confirmedAt.plus(Duration.ofDays(90)));
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 60, 89})
    void newSessionReusesProofAfterOriginalSessionAndFirstDayExpire(int daysLater) {
        Instant originalExpiry = confirmedAt.plusSeconds(60);
        var proof = confirm(originalExpiry);
        Instant returnedAt = confirmedAt.plus(Duration.ofDays(daysLater)).plusSeconds(1);
        var service = at(returnedAt);
        clearInvocations(store);

        assertThatThrownBy(() -> service.analyticsSession(new Session(userId, originalExpiry)))
                .isInstanceOf(UnauthorizedException.class).hasMessage("site_session_required");
        var response = service.analyticsSession(new Session(userId, returnedAt.plusSeconds(3600)));
        assertThat(response.siteUserId()).isEqualTo(userId);
        assertThat(response.telegramId()).isEqualTo(7L);
        assertThat(response.expiresAt()).isEqualTo(returnedAt.plusSeconds(60));
        assertThat(service.analyticsSession(new Session(userId, returnedAt.plusSeconds(10))).expiresAt())
                .isEqualTo(returnedAt.plusSeconds(10));
        assertThat(proof.validUntil()).isEqualTo(confirmedAt.plus(Duration.ofDays(90)));
        verify(store, never()).verify(any(), anyLong(), any(), any(), any());
        verify(store, never()).issue(any(), any(), any(), any(), any());
        verify(store, never()).consume(any(), any());
    }

    @Test
    void freshSessionCannotExtendProofPastItsNinetyDayBoundary() {
        var proof = confirm(confirmedAt.plusSeconds(60));
        Instant expiry = confirmedAt.plus(Duration.ofDays(90));
        Session fresh = new Session(userId, expiry.plusSeconds(3600));
        assertThat(at(expiry.minusSeconds(1)).analyticsSession(fresh).expiresAt()).isEqualTo(expiry);
        assertThatThrownBy(() -> at(expiry).analyticsSession(fresh))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode().value()).isEqualTo(403);
                    assertThat(exception.getReason()).isEqualTo("telegram_link_refresh_required");
                });
        assertThat(proof.validUntil()).isEqualTo(expiry);
    }

    @ParameterizedTest
    @ValueSource(strings = {"future", "expired", "revoked"})
    void freshSessionStillRejectsInvalidOrRevokedProof(String state) {
        var proof = new TelegramIdentityStore.Identity(userId, 7L, null,
                state.equals("future") ? confirmedAt.plusSeconds(1) : confirmedAt.minusSeconds(1),
                state.equals("expired") ? confirmedAt : confirmedAt.plus(Duration.ofDays(90)));
        when(store.identity(userId)).thenReturn(state.equals("revoked") ? Optional.empty() : Optional.of(proof));
        assertThatThrownBy(() -> at(confirmedAt).analyticsSession(new Session(userId, confirmedAt.plusSeconds(3600))))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode().value()).isEqualTo(403);
                    assertThat(exception.getReason()).isEqualTo(state.equals("revoked")
                            ? "telegram_link_required" : "telegram_link_refresh_required");
                });
        verify(store, never()).verify(any(), anyLong(), any(), any(), any());
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void expiredChallengeOrIssuerStillCannotCreateLongLivedProof(boolean issuerExpired) {
        when(store.lockChallenge(any())).thenReturn(Optional.of(new TelegramIdentityStore.Challenge(userId,
                issuerExpired ? confirmedAt.plusSeconds(60) : confirmedAt,
                issuerExpired ? confirmedAt : confirmedAt.plusSeconds(60), null)));
        assertThatThrownBy(() -> at(confirmedAt).confirm(new BotTelegramLinkConfirmRequest("a".repeat(43), 7L, null)))
                .isInstanceOfSatisfying(ResponseStatusException.class,
                        exception -> assertThat(exception.getStatusCode().value()).isEqualTo(410));
        verify(store, never()).verify(any(), anyLong(), any(), any(), any());
        verify(store, never()).consume(any(), any());
    }
}
