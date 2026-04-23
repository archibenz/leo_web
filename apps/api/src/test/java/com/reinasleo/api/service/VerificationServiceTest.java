package com.reinasleo.api.service;

import com.reinasleo.api.exception.InvalidVerificationCodeException;
import com.reinasleo.api.model.VerificationCode;
import com.reinasleo.api.repository.VerificationCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerificationServiceTest {

    @Mock private VerificationCodeRepository codeRepository;
    @Mock private EmailService emailService;

    private VerificationService verificationService;

    @BeforeEach
    void setUp() {
        verificationService = new VerificationService(codeRepository, emailService);
    }

    @Test
    void sendCode_savesHashedCodeAndSendsPlainEmail() {
        when(codeRepository.save(any(VerificationCode.class))).thenAnswer(inv -> inv.getArgument(0));

        verificationService.sendCode("User@Example.COM");

        ArgumentCaptor<VerificationCode> captor = ArgumentCaptor.forClass(VerificationCode.class);
        verify(codeRepository).save(captor.capture());
        VerificationCode saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("user@example.com");
        assertThat(saved.getCodeHash()).hasSize(64);
        assertThat(saved.getCodeHash()).matches("[0-9a-f]{64}");
        assertThat(saved.getExpiresAt()).isAfter(Instant.now());

        ArgumentCaptor<String> plainCode = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendVerificationCode(eq("user@example.com"), plainCode.capture());
        assertThat(plainCode.getValue()).hasSize(6).matches("\\d{6}");
        assertThat(saved.getCodeHash()).isEqualTo(sha256Hex(plainCode.getValue()));
    }

    @Test
    void verifyCode_withValidCode_succeeds() {
        String plain = "123456";
        String hash = sha256Hex(plain);
        VerificationCode vc = new VerificationCode(
                "test@example.com", hash,
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndCodeHashAndUsedFalseOrderByCreatedAtDesc("test@example.com", hash))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        verificationService.verifyCode("test@example.com", plain);

        assertThat(vc.isUsed()).isTrue();
        verify(codeRepository).save(vc);
    }

    @Test
    void verifyCode_withExpiredCode_throws() {
        String plain = "123456";
        String hash = sha256Hex(plain);
        VerificationCode vc = new VerificationCode(
                "test@example.com", hash,
                Instant.now().minus(1, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndCodeHashAndUsedFalseOrderByCreatedAtDesc("test@example.com", hash))
                .thenReturn(Optional.of(vc));

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", plain))
                .isInstanceOf(InvalidVerificationCodeException.class);
    }

    @Test
    void verifyCode_withWrongCode_throws() {
        String wrongHash = sha256Hex("000000");
        when(codeRepository.findTopByEmailAndCodeHashAndUsedFalseOrderByCreatedAtDesc("test@example.com", wrongHash))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class);
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
