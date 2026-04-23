package com.reinasleo.api.repository;

import com.reinasleo.api.model.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {
    Optional<VerificationCode> findTopByEmailAndCodeHashAndUsedFalseOrderByCreatedAtDesc(String email, String codeHash);

    int deleteByExpiresAtBefore(Instant cutoff);
}
