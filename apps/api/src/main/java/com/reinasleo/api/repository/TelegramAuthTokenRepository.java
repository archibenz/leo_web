package com.reinasleo.api.repository;

import com.reinasleo.api.model.TelegramAuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TelegramAuthTokenRepository extends JpaRepository<TelegramAuthToken, String> {

    Optional<TelegramAuthToken> findByTokenAndUsedFalse(String token);

    @Modifying
    @Query("""
            UPDATE TelegramAuthToken t
            SET t.used = true
            WHERE t.token = :token
              AND t.used = false
              AND t.expiresAt > CURRENT_TIMESTAMP
            """)
    int markUsedIfAvailable(@Param("token") String token);

    @Modifying
    @Query("""
            DELETE FROM TelegramAuthToken t
            WHERE t.token = :token
              AND t.used = true
              AND t.userId IS NOT NULL
              AND t.expiresAt > CURRENT_TIMESTAMP
            """)
    int deleteIfClaimed(@Param("token") String token);
}
