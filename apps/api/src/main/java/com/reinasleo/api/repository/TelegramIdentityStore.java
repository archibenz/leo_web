package com.reinasleo.api.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class TelegramIdentityStore {
    private final JdbcTemplate jdbc;

    public record Account(UUID id, Long telegramId, String role) {}
    public record Challenge(UUID userId, Instant expiresAt, Instant issuerExpiresAt, Instant consumedAt) {}
    public record Identity(UUID userId, long telegramId, String username, Instant verifiedAt, Instant validUntil) {}

    public TelegramIdentityStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Account> activeAccount(UUID id, boolean lock) {
        return first(jdbc.query("SELECT id, telegram_id, role FROM users WHERE id = ? AND deleted_at IS NULL"
                        + (lock ? " FOR UPDATE" : ""),
                (rs, row) -> new Account(rs.getObject("id", UUID.class),
                        rs.getObject("telegram_id", Long.class), rs.getString("role")), id));
    }

    public Optional<Identity> identity(UUID id) {
        return first(jdbc.query("""
                SELECT user_id, telegram_id, telegram_username, verified_at, valid_until
                FROM verified_telegram_identities WHERE user_id = ?
                """, (rs, row) -> new Identity(rs.getObject("user_id", UUID.class),
                rs.getLong("telegram_id"), rs.getString("telegram_username"),
                rs.getTimestamp("verified_at").toInstant(), rs.getTimestamp("valid_until").toInstant()), id));
    }

    public Optional<UUID> challengeUserId(String hash) {
        return first(jdbc.query("SELECT user_id FROM telegram_link_challenges WHERE token_hash = ?",
                (rs, row) -> rs.getObject("user_id", UUID.class), hash));
    }

    public Optional<Challenge> lockChallenge(String hash) {
        return first(jdbc.query("""
                SELECT user_id, expires_at, issuer_expires_at, consumed_at
                FROM telegram_link_challenges WHERE token_hash = ? FOR UPDATE
                """, (rs, row) -> {
            Timestamp consumed = rs.getTimestamp("consumed_at");
            return new Challenge(rs.getObject("user_id", UUID.class), rs.getTimestamp("expires_at").toInstant(),
                    rs.getTimestamp("issuer_expires_at").toInstant(), consumed == null ? null : consumed.toInstant());
        }, hash));
    }

    public void issue(String hash, UUID userId, Instant now, Instant expiresAt, Instant issuerExpiresAt) {
        jdbc.update("UPDATE telegram_link_challenges SET consumed_at = ? WHERE user_id = ? AND consumed_at IS NULL",
                Timestamp.from(now), userId);
        jdbc.update("""
                INSERT INTO telegram_link_challenges
                (token_hash, user_id, created_at, expires_at, issuer_expires_at)
                VALUES (?, ?, ?, ?, ?)
                """, hash, userId, Timestamp.from(now), Timestamp.from(expiresAt), Timestamp.from(issuerExpiresAt));
    }

    public boolean ownedByAnother(UUID userId, long telegramId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM users WHERE telegram_id = ? AND id <> ?
                """, Integer.class, telegramId, userId);
        Integer verified = jdbc.queryForObject("""
                SELECT COUNT(*) FROM verified_telegram_identities WHERE telegram_id = ? AND user_id <> ?
                """, Integer.class, telegramId, userId);
        return (count != null && count > 0) || (verified != null && verified > 0);
    }

    public void verify(Account account, long telegramId, String username, Instant now, Instant validUntil) {
        int changed = jdbc.update("""
                UPDATE users SET telegram_id = ?, updated_at = ?
                WHERE id = ? AND deleted_at IS NULL AND (telegram_id IS NULL OR telegram_id = ?)
                """, telegramId, Timestamp.from(now), account.id(), telegramId);
        if (changed != 1) throw new com.reinasleo.api.exception.ConflictException("telegram_link_conflict");
        if (identity(account.id()).isPresent()) {
            changed = jdbc.update("""
                    UPDATE verified_telegram_identities SET telegram_username = ?, verified_at = ?, valid_until = ?
                    WHERE user_id = ? AND telegram_id = ?
                    """, username, Timestamp.from(now), Timestamp.from(validUntil), account.id(), telegramId);
            if (changed != 1) throw new com.reinasleo.api.exception.ConflictException("telegram_link_conflict");
        } else {
            jdbc.update("""
                    INSERT INTO verified_telegram_identities
                    (user_id, telegram_id, telegram_username, verified_at, valid_until)
                    VALUES (?, ?, ?, ?, ?)
                    """, account.id(), telegramId, username, Timestamp.from(now), Timestamp.from(validUntil));
        }
    }

    public void consume(String hash, Instant now) {
        int changed = jdbc.update("""
                UPDATE telegram_link_challenges SET consumed_at = ?
                WHERE token_hash = ? AND consumed_at IS NULL
                """, Timestamp.from(now), hash);
        if (changed != 1) throw new com.reinasleo.api.exception.ConflictException("telegram_challenge_consumed");
    }

    private static <T> Optional<T> first(List<T> rows) {
        return rows.stream().findFirst();
    }
}
