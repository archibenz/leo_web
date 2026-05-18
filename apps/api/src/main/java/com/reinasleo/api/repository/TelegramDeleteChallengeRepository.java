package com.reinasleo.api.repository;

import com.reinasleo.api.model.TelegramDeleteChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;

public interface TelegramDeleteChallengeRepository extends JpaRepository<TelegramDeleteChallenge, Long> {

    Optional<TelegramDeleteChallenge> findByTelegramId(Long telegramId);

    @Modifying
    @Query("DELETE FROM TelegramDeleteChallenge c WHERE c.expiresAt < ?1")
    int deleteByExpiresAtBefore(Instant cutoff);
}
