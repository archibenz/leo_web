package com.reinasleo.api.repository;

import com.reinasleo.api.model.TelegramAuthToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TelegramAuthTokenRepository extends JpaRepository<TelegramAuthToken, String> {

    Optional<TelegramAuthToken> findByTokenAndUsedFalse(String token);
}
