package com.reinasleo.api.service;

import com.reinasleo.api.dto.AnalyticsSessionResponse;
import com.reinasleo.api.dto.BotTelegramLinkConfirmRequest;
import com.reinasleo.api.dto.TelegramLinkChallengeResponse;
import com.reinasleo.api.exception.ConflictException;
import com.reinasleo.api.exception.UnauthorizedException;
import com.reinasleo.api.repository.TelegramIdentityStore;
import com.reinasleo.api.security.SiteSessionClaims.Session;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class TelegramIdentityService {
    public static final Duration CHALLENGE_LIFETIME = Duration.ofMinutes(5);
    public static final Duration VERIFICATION_LIFETIME = Duration.ofHours(24);
    public static final Duration ASSERTION_LIFETIME = Duration.ofSeconds(60);
    private final TelegramIdentityStore store;
    private final String botUsername;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    @Autowired
    public TelegramIdentityService(TelegramIdentityStore store,
                                   @Value("$" + "{app.bot.username}") String botUsername) {
        this(store, botUsername, Clock.systemUTC());
    }

    public TelegramIdentityService(TelegramIdentityStore store, String botUsername, Clock clock) {
        if (botUsername == null || !botUsername.matches("[A-Za-z0-9_]{1,32}")) {
            throw new IllegalStateException("A valid bot username is required");
        }
        this.store = store;
        this.botUsername = botUsername;
        this.clock = clock;
    }

    @Transactional
    public TelegramLinkChallengeResponse issue(Session session) {
        Instant now = clock.instant();
        if (!session.expiresAt().isAfter(now)) throw new UnauthorizedException("site_session_required");
        store.activeAccount(session.userId(), true).orElseThrow(() -> new UnauthorizedException("site_session_required"));
        now = clock.instant();
        if (!session.expiresAt().isAfter(now)) throw new UnauthorizedException("site_session_required");
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = earlier(now.plus(CHALLENGE_LIFETIME), session.expiresAt());
        store.issue(hash(token), session.userId(), now, expiresAt, session.expiresAt());
        return new TelegramLinkChallengeResponse(token, "https://t.me/" + botUsername + "?start=link_" + token, expiresAt);
    }

    @Transactional
    public void confirm(BotTelegramLinkConfirmRequest request) {
        String hash = hash(request.challengeToken());
        UUID userId = store.challengeUserId(hash)
                .orElseThrow(() -> new UnauthorizedException("telegram_challenge_invalid"));
        // Issuance and soft deletion also lock the account before its challenges.
        var account = store.activeAccount(userId, true)
                .orElseThrow(() -> new UnauthorizedException("site_session_required"));
        var challenge = store.lockChallenge(hash)
                .orElseThrow(() -> new UnauthorizedException("telegram_challenge_invalid"));
        if (!challenge.userId().equals(account.id())) throw new UnauthorizedException("telegram_challenge_invalid");
        Instant now = clock.instant();
        if (challenge.consumedAt() != null || !challenge.expiresAt().isAfter(now)
                || !challenge.issuerExpiresAt().isAfter(now)) {
            throw new ResponseStatusException(HttpStatus.GONE, "telegram_challenge_expired_or_consumed");
        }
        long telegramId = request.telegramId();
        var proof = store.identity(account.id());
        if ((account.telegramId() != null && account.telegramId() != telegramId)
                || (proof.isPresent() && proof.get().telegramId() != telegramId)
                || store.ownedByAnother(account.id(), telegramId)) {
            throw new ConflictException("telegram_link_conflict");
        }
        Instant validUntil = earlier(now.plus(VERIFICATION_LIFETIME), challenge.issuerExpiresAt());
        try {
            store.verify(account, telegramId, request.telegramUsername(), now, validUntil);
            store.consume(hash, now);
        } catch (DataIntegrityViolationException exception) {
            // A legacy registration can win the unique Telegram-ID race.
            throw new ConflictException("telegram_link_conflict");
        }
    }

    @Transactional(readOnly = true)
    public AnalyticsSessionResponse analyticsSession(Session session) {
        Instant now = clock.instant();
        if (!session.expiresAt().isAfter(now)) throw new UnauthorizedException("site_session_required");
        var account = store.activeAccount(session.userId(), false).orElseThrow(() -> denied("site_admin_required"));
        if (!"admin".equals(account.role())) throw denied("site_admin_required");
        var proof = store.identity(account.id()).orElseThrow(() -> denied("telegram_link_required"));
        if (account.telegramId() == null || account.telegramId() != proof.telegramId()) {
            throw denied("telegram_link_required");
        }
        if (proof.verifiedAt().isAfter(now) || !proof.validUntil().isAfter(now)) {
            throw denied("telegram_link_refresh_required");
        }
        Instant expiresAt = earlier(earlier(now.plus(ASSERTION_LIFETIME), session.expiresAt()), proof.validUntil());
        return new AnalyticsSessionResponse(1, account.id(), proof.telegramId(), true, true, proof.username(), expiresAt);
    }

    private static ResponseStatusException denied(String code) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, code);
    }

    private static Instant earlier(Instant left, Instant right) {
        return left.isBefore(right) ? left : right;
    }

    private static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
