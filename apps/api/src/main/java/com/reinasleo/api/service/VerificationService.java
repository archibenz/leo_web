package com.reinasleo.api.service;

import com.reinasleo.api.exception.InvalidVerificationCodeException;
import com.reinasleo.api.model.VerificationCode;
import com.reinasleo.api.repository.VerificationCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class VerificationService {

    private static final int CODE_LENGTH = 6;
    private static final int EXPIRATION_MINUTES = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final VerificationCodeRepository codeRepository;
    private final EmailService emailService;

    public VerificationService(VerificationCodeRepository codeRepository, EmailService emailService) {
        this.codeRepository = codeRepository;
        this.emailService = emailService;
    }

    @Transactional
    public void sendCode(String email) {
        String code = generateCode();
        Instant expiresAt = Instant.now().plus(EXPIRATION_MINUTES, ChronoUnit.MINUTES);
        codeRepository.save(new VerificationCode(email.trim().toLowerCase(), code, expiresAt));
        emailService.sendVerificationCode(email.trim().toLowerCase(), code);
    }

    @Transactional
    public void verifyCode(String email, String code) {
        String normalizedEmail = email.trim().toLowerCase();
        VerificationCode vc = codeRepository
                .findTopByEmailAndCodeAndUsedFalseOrderByCreatedAtDesc(normalizedEmail, code.trim())
                .orElseThrow(InvalidVerificationCodeException::new);

        if (vc.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidVerificationCodeException();
        }

        vc.markUsed();
        codeRepository.save(vc);
    }

    private String generateCode() {
        int num = RANDOM.nextInt(900_000) + 100_000; // 100000–999999
        return String.valueOf(num);
    }
}
