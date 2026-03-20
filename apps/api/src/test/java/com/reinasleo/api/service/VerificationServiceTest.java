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
    void sendCode_savesCodeAndSendsEmail() {
        when(codeRepository.save(any(VerificationCode.class))).thenAnswer(inv -> inv.getArgument(0));

        verificationService.sendCode("User@Example.COM");

        ArgumentCaptor<VerificationCode> captor = ArgumentCaptor.forClass(VerificationCode.class);
        verify(codeRepository).save(captor.capture());
        VerificationCode saved = captor.getValue();
        assertThat(saved.getEmail()).isEqualTo("user@example.com");
        assertThat(saved.getCode()).hasSize(6);
        assertThat(saved.getExpiresAt()).isAfter(Instant.now());

        verify(emailService).sendVerificationCode(eq("user@example.com"), anyString());
    }

    @Test
    void verifyCode_withValidCode_succeeds() {
        VerificationCode vc = new VerificationCode(
                "test@example.com", "123456",
                Instant.now().plus(5, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndCodeAndUsedFalseOrderByCreatedAtDesc("test@example.com", "123456"))
                .thenReturn(Optional.of(vc));
        when(codeRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        verificationService.verifyCode("test@example.com", "123456");

        assertThat(vc.isUsed()).isTrue();
        verify(codeRepository).save(vc);
    }

    @Test
    void verifyCode_withExpiredCode_throws() {
        VerificationCode vc = new VerificationCode(
                "test@example.com", "123456",
                Instant.now().minus(1, ChronoUnit.MINUTES)
        );
        when(codeRepository.findTopByEmailAndCodeAndUsedFalseOrderByCreatedAtDesc("test@example.com", "123456"))
                .thenReturn(Optional.of(vc));

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "123456"))
                .isInstanceOf(InvalidVerificationCodeException.class);
    }

    @Test
    void verifyCode_withWrongCode_throws() {
        when(codeRepository.findTopByEmailAndCodeAndUsedFalseOrderByCreatedAtDesc("test@example.com", "000000"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> verificationService.verifyCode("test@example.com", "000000"))
                .isInstanceOf(InvalidVerificationCodeException.class);
    }
}
