package com.reinasleo.api.repository;

import com.reinasleo.api.model.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {
    Optional<VerificationCode> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    @Modifying
    @Query("UPDATE VerificationCode vc SET vc.used = true WHERE vc.email = ?1 AND vc.used = false")
    int markAllUnusedAsUsedForEmail(String email);

    int deleteByExpiresAtBefore(Instant cutoff);
}
