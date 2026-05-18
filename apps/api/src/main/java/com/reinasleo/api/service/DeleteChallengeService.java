package com.reinasleo.api.service;

import com.reinasleo.api.exception.BadRequestException;
import com.reinasleo.api.model.TelegramDeleteChallenge;
import com.reinasleo.api.repository.TelegramDeleteChallengeRepository;
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
import java.util.Optional;

/**
 * R8: одноразовый код подтверждения удаления аккаунта для TG-only пользователей.
 *
 * <p>Старый flow ({@code DELETE /api/auth/me} с credential = telegramId)
 * слабый: telegramId статичен, светится в URL некоторых клиентов, угоняется
 * одним XSS. Новый flow:</p>
 * <ol>
 *   <li>{@code POST /api/auth/me/delete-challenge} — генерим 6 цифр,
 *       сохраняем SHA-256 хеш с TTL 5 минут, отправляем код в TG-бот.</li>
 *   <li>{@code DELETE /api/auth/me} — credential = код, сверяем
 *       {@link MessageDigest#isEqual} по хешу.</li>
 * </ol>
 */
@Service
public class DeleteChallengeService {

    private static final Logger log = LoggerFactory.getLogger(DeleteChallengeService.class);

    private static final int CODE_LENGTH = 6;
    private static final int TTL_MINUTES = 5;
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String DUMMY_HASH = "0".repeat(64);

    private final TelegramDeleteChallengeRepository repository;
    private final TelegramNotifier telegramNotifier;

    private final Counter issuedCounter;
    private final Counter consumedCounter;
    private final Counter failedCounter;
    private final Counter lockedCounter;

    public DeleteChallengeService(TelegramDeleteChallengeRepository repository,
                                  TelegramNotifier telegramNotifier,
                                  MeterRegistry meters) {
        this.repository = repository;
        this.telegramNotifier = telegramNotifier;
        this.issuedCounter = Counter.builder("reinasleo.delete_challenge.issued").register(meters);
        this.consumedCounter = Counter.builder("reinasleo.delete_challenge.consumed").register(meters);
        this.failedCounter = Counter.builder("reinasleo.delete_challenge.failed")
                .tag("reason", "wrong_code")
                .register(meters);
        this.lockedCounter = Counter.builder("reinasleo.delete_challenge.locked").register(meters);
    }

    @Transactional
    public void issueChallenge(Long telegramId) {
        if (telegramId == null) {
            throw new BadRequestException("telegram_id_required");
        }

        String code = generateCode();
        String codeHash = sha256Hex(code);
        Instant expiresAt = Instant.now().plus(TTL_MINUTES, ChronoUnit.MINUTES);

        TelegramDeleteChallenge challenge = repository.findByTelegramId(telegramId)
                .orElseGet(() -> new TelegramDeleteChallenge(telegramId, codeHash, expiresAt));

        // Существующий вызов перезаписывает код, обнуляет attempts. Это даёт
        // пользователю запросить новый код, если предыдущий не дошёл.
        challenge.rotate(codeHash, expiresAt);
        repository.save(challenge);

        telegramNotifier.sendDeleteChallenge(telegramId, code);
        issuedCounter.increment();
        log.info("delete_challenge.issued telegram_id={}", telegramId);
    }

    /**
     * Проверяет код, инкрементит счётчик неудач. После {@link #MAX_ATTEMPTS}
     * запись помечается просроченной (expires_at в прошлом) — пользователь
     * вынужден запросить новый код.
     */
    @Transactional
    public boolean consumeCode(Long telegramId, String providedCode) {
        if (telegramId == null || providedCode == null || providedCode.isBlank()) {
            return false;
        }

        Optional<TelegramDeleteChallenge> maybe = repository.findByTelegramId(telegramId);
        String storedHash = maybe.map(TelegramDeleteChallenge::getCodeHash).orElse(DUMMY_HASH);
        String providedHash = sha256Hex(providedCode.trim());

        boolean hashMatches = MessageDigest.isEqual(
                providedHash.getBytes(StandardCharsets.US_ASCII),
                storedHash.getBytes(StandardCharsets.US_ASCII));

        if (maybe.isEmpty()) {
            return false;
        }

        TelegramDeleteChallenge challenge = maybe.get();
        boolean expired = challenge.getExpiresAt().isBefore(Instant.now());

        if (expired || !hashMatches) {
            if (!expired) {
                challenge.incrementFailedAttempts();
                boolean locked = challenge.getFailedAttempts() >= MAX_ATTEMPTS;
                if (locked) {
                    challenge.expire();
                    log.warn("delete_challenge.locked telegram_id={} attempts={}",
                            telegramId, MAX_ATTEMPTS);
                }
                try {
                    repository.save(challenge);
                } catch (ObjectOptimisticLockingFailureException race) {
                    // Конкурентный запрос уже инкрементил счётчик: для anti-bruteforce
                    // безопаснее уронить нашу попытку, чем дать атакующему лишний
                    // шанс из-за lost update. Юзер увидит тот же 401, что и при
                    // неверном коде.
                    return false;
                }
                if (locked) {
                    lockedCounter.increment();
                } else {
                    failedCounter.increment();
                }
            }
            return false;
        }

        repository.delete(challenge);
        consumedCounter.increment();
        log.info("delete_challenge.consumed telegram_id={}", telegramId);
        return true;
    }

    private static String generateCode() {
        int num = RANDOM.nextInt(1_000_000);
        return String.format("%0" + CODE_LENGTH + "d", num);
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
