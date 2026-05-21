package com.reinasleo.api.repository;

import com.reinasleo.api.model.TelegramAuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface TelegramAuthTokenRepository extends JpaRepository<TelegramAuthToken, String> {

    Optional<TelegramAuthToken> findByTokenAndUsedFalse(String token);

    @Modifying
    @Query("DELETE FROM TelegramAuthToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);

    @Modifying
    @Query("""
            UPDATE TelegramAuthToken t
            SET t.used = true
            WHERE t.token = :token
              AND t.used = false
              AND t.expiresAt > CURRENT_TIMESTAMP
            """)
    int markUsedIfAvailable(@Param("token") String token);

    /**
     * Atomic mark-and-fetch: claims the token and returns its user_id in one
     * round-trip, eliminating the TOCTOU window between UPDATE and SELECT.
     * Returns empty if the token is already used, expired, or unbound.
     * Native query because JPQL does not support UPDATE ... RETURNING.
     */
    @Modifying
    @Query(value = """
            UPDATE telegram_auth_tokens
            SET used = true
            WHERE token = :token
              AND used = false
              AND user_id IS NOT NULL
              AND expires_at > NOW()
            RETURNING user_id
            """, nativeQuery = true)
    Optional<UUID> claimAndReturnUserId(@Param("token") String token);

    /**
     * Atomic delete-and-return for the poll path. Token must already be
     * marked used (by botLogin/botRegister), bound to a user, and not expired.
     * Replaces the two-step `findById + deleteIfClaimed` pattern in pollAuth
     * which had a residual TOCTOU window between the read and the delete.
     */
    @Modifying
    @Query(value = """
            DELETE FROM telegram_auth_tokens
            WHERE token = :token
              AND used = true
              AND user_id IS NOT NULL
              AND expires_at > NOW()
            RETURNING user_id
            """, nativeQuery = true)
    Optional<UUID> deleteAndReturnUserId(@Param("token") String token);

    @Modifying
    @Query("""
            DELETE FROM TelegramAuthToken t
            WHERE t.token = :token
              AND t.used = true
              AND t.user IS NOT NULL
              AND t.expiresAt > CURRENT_TIMESTAMP
            """)
    int deleteIfClaimed(@Param("token") String token);
}
