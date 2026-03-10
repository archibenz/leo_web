package com.reinasleo.api.repository;

import com.reinasleo.api.model.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VerificationCodeRepository extends JpaRepository<VerificationCode, UUID> {
    Optional<VerificationCode> findTopByEmailAndCodeAndUsedFalseOrderByCreatedAtDesc(String email, String code);
}
