package com.reinasleo.api.repository;

import com.reinasleo.api.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u WHERE lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByTelegramId(Long telegramId);

    long countByCreatedAtAfter(Instant since);
}
