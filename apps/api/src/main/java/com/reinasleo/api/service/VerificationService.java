package com.reinasleo.api.service;

import com.reinasleo.api.exception.EmailDeliveryException;
import com.reinasleo.api.exception.InvalidVerificationCodeException;
import com.reinasleo.api.model.VerificationCode;
import com.reinasleo.api.repository.VerificationCodeRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
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

    // 64 zero chars — same width as a SHA-256 hex hash, so the constant-time
    // compare in verifyCode takes the same time whether or not a pending code exists.
    private static final String DUMMY_HASH = "0".repeat(64);

    private final VerificationCodeRepository codeRepository;
    private final EmailService emailService;

    private final Counter issuedCounter;
    private final Counter verifiedOkCounter;
    private final Counter verifiedBadCounter;
    private final Counter lockedCounter;

    public VerificationService(VerificationCodeRepository codeRepository,
                               EmailService emailService,
                               MeterRegistry meters) {
        this.codeRepository = codeRepository;
        this.emailService = emailService;
        this.issuedCounter = Counter.builder("reinasleo.verification.code.issued").register(meters);
        this.verifiedOkCounter = Counter.builder("reinasleo.verification.code.verified")
                .tag("outcome", "ok")
                .register(meters);
        this.verifiedBadCounter = Counter.builder("reinasleo.verification.code.verified")
                .tag("outcome", "bad")
                .register(meters);
        this.lockedCounter = Counter.builder("reinasleo.verification.code.locked").register(meters);
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
        issuedCounter.increment();
    }

    @Transactional
    public void verifyCode(String email, String code) {
        String normalizedEmail = email.trim().toLowerCase();
        String inputHash = sha256Hex(code.trim());

        VerificationCode vc = codeRepository
                .findTopByEmailAndUsedFalseOrderByCreatedAtDesc(normalizedEmail)
                .orElse(null);

        String storedHash = vc != null ? vc.getCodeHash() : DUMMY_HASH;
        boolean hashMatches = MessageDigest.isEqual(
                inputHash.getBytes(StandardCharsets.US_ASCII),
                storedHash.getBytes(StandardCharsets.US_ASCII));

        boolean expired = vc != null && vc.getExpiresAt().isBefore(Instant.now());

        if (vc == null || expired || !hashMatches) {
            if (vc != null && !expired) {
                vc.incrementFailedAttempts();
                boolean locked = vc.getFailedAttempts() >= MAX_ATTEMPTS;
                if (locked) {
                    vc.markUsed();
                    log.warn("Verification code locked after {} failed attempts for {}",
                            MAX_ATTEMPTS, maskEmail(normalizedEmail));
                }
                try {
                    codeRepository.save(vc);
                } catch (ObjectOptimisticLockingFailureException race) {
                    // Конкурент уже инкрементил attempts — fail safe, не дублируем
                    // инкремент и метрику, юзер всё равно получит invalid_code.
                    throw new InvalidVerificationCodeException();
                }
                if (locked) {
                    lockedCounter.increment();
                }
            }
            verifiedBadCounter.increment();
            throw new InvalidVerificationCodeException();
        }

        vc.markUsed();
        codeRepository.save(vc);
        verifiedOkCounter.increment();
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
