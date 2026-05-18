package com.reinasleo.api.service;

import com.reinasleo.api.model.TelegramDeleteChallenge;
import com.reinasleo.api.repository.TelegramDeleteChallengeRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.matches;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DeleteChallengeServiceTest {

    private static final long TG = 123456789L;

    @Mock private TelegramDeleteChallengeRepository repository;
    @Mock private TelegramNotifier telegramNotifier;

    private DeleteChallengeService service;
    private MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        service = new DeleteChallengeService(repository, telegramNotifier, meterRegistry);
    }

    @Test
    void issueChallenge_savesRowAndIncrementsIssuedCounter() {
        when(repository.findByTelegramId(TG)).thenReturn(Optional.empty());
        when(repository.save(any(TelegramDeleteChallenge.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        service.issueChallenge(TG);

        verify(repository).save(any(TelegramDeleteChallenge.class));
        verify(telegramNotifier).sendDeleteChallenge(eq(TG), matches("\\d{6}"));
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.issued").count())
                .isEqualTo(1.0);
    }

    @Test
    void consumeCode_validCode_deletesRowAndIncrementsConsumedCounter() {
        String plain = "654321";
        TelegramDeleteChallenge ch = newChallenge(plain, Instant.now().plus(5, ChronoUnit.MINUTES));
        when(repository.findByTelegramId(TG)).thenReturn(Optional.of(ch));

        boolean ok = service.consumeCode(TG, plain);

        assertThat(ok).isTrue();
        verify(repository).delete(ch);
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.consumed").count())
                .isEqualTo(1.0);
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.failed", "reason", "wrong_code").count())
                .isZero();
    }

    @Test
    void consumeCode_wrongCode_incrementsFailedCounter() {
        TelegramDeleteChallenge ch = newChallenge("123456", Instant.now().plus(5, ChronoUnit.MINUTES));
        when(repository.findByTelegramId(TG)).thenReturn(Optional.of(ch));
        when(repository.save(any(TelegramDeleteChallenge.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        boolean ok = service.consumeCode(TG, "000000");

        assertThat(ok).isFalse();
        assertThat(ch.getFailedAttempts()).isEqualTo(1);
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.failed", "reason", "wrong_code").count())
                .isEqualTo(1.0);
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.locked").count()).isZero();
    }

    @Test
    void consumeCode_atMaxAttempts_incrementsLockedCounter() {
        TelegramDeleteChallenge ch = newChallenge("123456", Instant.now().plus(5, ChronoUnit.MINUTES));
        // Drive attempts up to 4 in-memory; the 5th wrong code triggers locked.
        setFailedAttempts(ch, 4);
        when(repository.findByTelegramId(TG)).thenReturn(Optional.of(ch));
        when(repository.save(any(TelegramDeleteChallenge.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        boolean ok = service.consumeCode(TG, "000000");

        assertThat(ok).isFalse();
        assertThat(ch.getFailedAttempts()).isEqualTo(5);
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.locked").count())
                .isEqualTo(1.0);
        // Locked path must not also tick "failed" — we count one or the other per call.
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.failed", "reason", "wrong_code").count())
                .isZero();
    }

    @Test
    void consumeCode_onOptimisticLockFailure_returnsFalseWithoutBubbling() {
        TelegramDeleteChallenge ch = newChallenge("123456", Instant.now().plus(5, ChronoUnit.MINUTES));
        when(repository.findByTelegramId(TG)).thenReturn(Optional.of(ch));
        when(repository.save(any(TelegramDeleteChallenge.class)))
                .thenThrow(new ObjectOptimisticLockingFailureException(
                        TelegramDeleteChallenge.class, TG));

        boolean ok = service.consumeCode(TG, "000000");

        assertThat(ok).isFalse();
        // Race exit: neither failed nor locked counter ticks — we dropped this attempt.
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.failed", "reason", "wrong_code").count())
                .isZero();
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.locked").count()).isZero();
    }

    @Test
    void consumeCode_noStoredChallenge_returnsFalseAndDoesNotIncrementFailed() {
        when(repository.findByTelegramId(TG)).thenReturn(Optional.empty());

        boolean ok = service.consumeCode(TG, "000000");

        assertThat(ok).isFalse();
        verify(repository, never()).save(any());
        assertThat(meterRegistry.counter("reinasleo.delete_challenge.failed", "reason", "wrong_code").count())
                .isZero();
    }

    @Test
    void consumeCode_expiredChallenge_returnsFalseWithoutIncrementingAttempts() {
        TelegramDeleteChallenge ch = newChallenge("123456", Instant.now().minus(1, ChronoUnit.MINUTES));
        when(repository.findByTelegramId(TG)).thenReturn(Optional.of(ch));

        boolean ok = service.consumeCode(TG, "123456");

        assertThat(ok).isFalse();
        assertThat(ch.getFailedAttempts()).isZero();
        verify(repository, never()).save(any());
    }

    // --- helpers -------------------------------------------------------------

    private static TelegramDeleteChallenge newChallenge(String plainCode, Instant expiresAt) {
        return new TelegramDeleteChallenge(TG, sha256Hex(plainCode), expiresAt);
    }

    private static void setFailedAttempts(TelegramDeleteChallenge ch, int value) {
        try {
            var f = TelegramDeleteChallenge.class.getDeclaredField("failedAttempts");
            f.setAccessible(true);
            f.setInt(ch, value);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String sha256Hex(String plain) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(plain.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

}
