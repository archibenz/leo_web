package com.reinasleo.api.service;

import com.reinasleo.api.exception.EmailDeliveryException;
import com.reinasleo.api.exception.InvalidVerificationCodeException;
import com.reinasleo.api.model.VerificationCode;
import com.reinasleo.api.repository.VerificationCodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class VerificationService {

    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

    private static final int CODE_LENGTH = 6;
    private static final int EXPIRATION_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final VerificationCodeRepository codeRepository;
    private final EmailService emailService;

    public VerificationService(VerificationCodeRepository codeRepository, EmailService emailService) {
        this.codeRepository = codeRepository;
        this.emailService = emailService;
    }

    @Transactional
    public void sendCode(String email) {
        String normalizedEmail = email.trim().toLowerCase();
        codeRepository.markAllUnusedAsUsedForEmail(normalizedEmail);
        String code = generateCode();
        Instant expiresAt = Instant.now().plus(EXPIRATION_MINUTES, ChronoUnit.MINUTES);
        codeRepository.save(new VerificationCode(normalizedEmail, sha256Hex(code), expiresAt));

        // Delivery failure must bubble up so the caller (AuthController) can
        // return 503 instead of silently telling the user "check your email".
        try {
            boolean delivered = emailService.sendVerificationCode(normalizedEmail, code);
            if (!delivered) {
                log.error("Email service reported non-delivery for {}", maskEmail(normalizedEmail));
                throw new EmailDeliveryException("Verification email was not delivered");
            }
        } catch (EmailDeliveryException e) {
            log.error("Verification code delivery failed for {}: {}",
                    maskEmail(normalizedEmail), e.getMessage());
            throw e;
        }
    }

    @Transactional
    public void verifyCode(String email, String code) {
        String normalizedEmail = email.trim().toLowerCase();
        String inputHash = sha256Hex(code.trim());

        VerificationCode vc = codeRepository
                .findTopByEmailAndUsedFalseOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(InvalidVerificationCodeException::new);

        if (vc.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidVerificationCodeException();
        }

        boolean match = MessageDigest.isEqual(
                inputHash.getBytes(StandardCharsets.US_ASCII),
                vc.getCodeHash().getBytes(StandardCharsets.US_ASCII));

        if (!match) {
            vc.incrementFailedAttempts();
            if (vc.getFailedAttempts() >= MAX_ATTEMPTS) {
                vc.markUsed();
                log.warn("Verification code locked after {} failed attempts for {}",
                        MAX_ATTEMPTS, maskEmail(normalizedEmail));
            }
            codeRepository.save(vc);
            throw new InvalidVerificationCodeException();
        }

        vc.markUsed();
        codeRepository.save(vc);
    }

    private String generateCode() {
        int num = RANDOM.nextInt(900_000) + 100_000; // 100000–999999
        return String.valueOf(num);
    }

    private static String sha256Hex(String plain) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(plain.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private static String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 0) return "***";
        char first = email.charAt(0);
        return first + "***" + email.substring(at);
    }
}
