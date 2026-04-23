package com.reinasleo.api.service;

import com.reinasleo.api.exception.InvalidVerificationCodeException;
import com.reinasleo.api.model.VerificationCode;
import com.reinasleo.api.repository.VerificationCodeRepository;
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
        String normalizedEmail = email.trim().toLowerCase();
        String code = generateCode();
        Instant expiresAt = Instant.now().plus(EXPIRATION_MINUTES, ChronoUnit.MINUTES);
        codeRepository.save(new VerificationCode(normalizedEmail, sha256Hex(code), expiresAt));
        emailService.sendVerificationCode(normalizedEmail, code);
    }

    @Transactional
    public void verifyCode(String email, String code) {
        String normalizedEmail = email.trim().toLowerCase();
        String inputHash = sha256Hex(code.trim());
        VerificationCode vc = codeRepository
                .findTopByEmailAndCodeHashAndUsedFalseOrderByCreatedAtDesc(normalizedEmail, inputHash)
                .orElseThrow(InvalidVerificationCodeException::new);

        // Timing-safe equality on the hash bytes (repository query already filtered by hash).
        if (!MessageDigest.isEqual(
                inputHash.getBytes(StandardCharsets.US_ASCII),
                vc.getCodeHash().getBytes(StandardCharsets.US_ASCII))) {
            throw new InvalidVerificationCodeException();
        }

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
}
