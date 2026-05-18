package com.reinasleo.api.service;

import com.reinasleo.api.exception.InvalidVerificationCodeException;
import com.reinasleo.api.model.VerificationCode;
import com.reinasleo.api.repository.VerificationCodeRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationServiceTest {

    @Mock private VerificationCodeRepository codeRepository;
    @Mock private EmailService emailService;

    private VerificationService verificationService;
    private MeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        verificationService = new VerificationService(codeRepository, emailService, meterRegistry);
    }

    @Test
    void sendCode_invalidatesOldPendingCodesBeforeIssuingNew() {
        when(codeRepository.save(any(VerificationCode.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendVerificationCode(any(), any())).thenReturn(true);

        verificationService.sendCode("User@Example.COM");

        verify(codeRepository).markAllUnusedAsUsedForEmail("user@example.com");

        ArgumentCaptor<VerificationCode> captor = ArgumentCaptor.forClass(VerificationCode.class);
        verify(codeRepository).save(captor.capture());
        VerificationCode saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("user@example.com");
        assertThat(saved.getCodeHash()).hasSize(64).matches("[0-9a-f]{64}");
        assertThat(saved.getExpiresAt()).isAfter(Instant.now());
        assertThat(saved.getFailedAttempts()).isZero();

        ArgumentCaptor<String> plainCode = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendVerificationCode(eq("user@example.com"), plainCode.capture());
        assertThat(plainCode.getValue()).hasSize(6).matches("\\d{6}");
        assertThat(saved.getCodeHash()).isEqualTo(sha256Hex(plainCode.getValue()));
    }

    @Test
    void verifyCode_withValidCode_marksUsed() {
        String plain = "123456";
        String hash = sha256Hex(plain);
        VerificationCode vc = new VerificationCode(
                "test@example.com", hash,
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        verificationService.verifyCode("test@example.com", plain);

        assertThat(vc.isUsed()).isTrue();
        assertThat(vc.getFailedAttempts()).isZero();
        verify(codeRepository).save(vc);
    }

    @Test
    void verifyCode_withNoPendingCode_throws() {
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class);

        verify(codeRepository, never()).save(any());
    }

    @Test
    void verifyCode_withExpiredCode_throwsWithoutIncrementingAttempts() {
        String plain = "123456";
        VerificationCode vc = new VerificationCode(
                "test@example.com", sha256Hex(plain),
                Instant.now().minus(1, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.of(vc));

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", plain))
                .isInstanceOf(InvalidVerificationCodeException.class);

        assertThat(vc.getFailedAttempts()).isZero();
        verify(codeRepository, never()).save(any());
    }

    @Test
    void verifyCode_withWrongCode_incrementsFailedAttempts() {
        VerificationCode vc = new VerificationCode(
                "test@example.com", sha256Hex("123456"),
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class);

        assertThat(vc.getFailedAttempts()).isEqualTo(1);
        assertThat(vc.isUsed()).isFalse();
        verify(codeRepository).save(vc);
    }

    @Test
    void verifyCode_atThreshold_marksRowUsed() {
        VerificationCode vc = new VerificationCode(
                "test@example.com", sha256Hex("123456"),
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                    .isInstanceOf(InvalidVerificationCodeException.class);
        }
        assertThat(vc.getFailedAttempts()).isEqualTo(4);
        assertThat(vc.isUsed()).isFalse();

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class);

        assertThat(vc.getFailedAttempts()).isEqualTo(5);
        assertThat(vc.isUsed()).isTrue();
    }

    @Test
    void verifyCode_afterThresholdRowIsExcludedByQuery_nextVerifyFailsCleanly() {
        // After the row is marked used at threshold, the `used = false` filter in the query
        // excludes it, so subsequent verifyCode() calls hit the "no pending code" path.
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "123456"))
                .isInstanceOf(InvalidVerificationCodeException.class);

        verify(codeRepository, never()).save(any());
    }

    @Test
    void sendCode_incrementsIssuedCounter() {
        when(codeRepository.save(any(VerificationCode.class))).thenAnswer(inv -> inv.getArgument(0));
        when(emailService.sendVerificationCode(any(), any())).thenReturn(true);

        verificationService.sendCode("user@example.com");

        assertThat(meterRegistry.counter("reinasleo.verification.code.issued").count())
                .isEqualTo(1.0);
    }

    @Test
    void verifyCode_okPath_incrementsVerifiedOkCounter() {
        String plain = "123456";
        VerificationCode vc = new VerificationCode(
                "test@example.com", sha256Hex(plain),
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        verificationService.verifyCode("test@example.com", plain);

        assertThat(meterRegistry.counter("reinasleo.verification.code.verified", "outcome", "ok").count())
                .isEqualTo(1.0);
        assertThat(meterRegistry.counter("reinasleo.verification.code.verified", "outcome", "bad").count())
                .isZero();
    }

    @Test
    void verifyCode_wrongCode_incrementsVerifiedBadCounter() {
        VerificationCode vc = new VerificationCode(
                "test@example.com", sha256Hex("123456"),
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class);

        assertThat(meterRegistry.counter("reinasleo.verification.code.verified", "outcome", "bad").count())
                .isEqualTo(1.0);
        assertThat(meterRegistry.counter("reinasleo.verification.code.locked").count()).isZero();
    }

    @Test
    void verifyCode_atThreshold_incrementsLockedCounter() {
        VerificationCode vc = new VerificationCode(
                "test@example.com", sha256Hex("123456"),
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                    .isInstanceOf(InvalidVerificationCodeException.class);
        }

        assertThat(meterRegistry.counter("reinasleo.verification.code.locked").count())
                .isEqualTo(1.0);
        assertThat(meterRegistry.counter("reinasleo.verification.code.verified", "outcome", "bad").count())
                .isEqualTo(5.0);
    }

    @Test
    void verifyCode_onOptimisticLockFailure_failsSafeWithoutBubbling() {
        VerificationCode vc = new VerificationCode(
                "test@example.com", sha256Hex("123456"),
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndUsedFalseOrderByCreatedAtDesc("test@example.com"))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any()))
                .thenThrow(new ObjectOptimisticLockingFailureException(VerificationCode.class, "id"));

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class);

        // Race: counter for locked must not fire (we exited early before reaching that branch).
        assertThat(meterRegistry.counter("reinasleo.verification.code.locked").count()).isZero();
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
