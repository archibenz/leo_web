package com.reinasleo.api.repository;

import com.reinasleo.api.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u WHERE lower(u.email) = lower(:email) AND u.deletedAt IS NULL")
    Optional<User> findByEmailIgnoreCase(String email);

    @Query("SELECT u FROM User u WHERE u.telegramId = :telegramId AND u.deletedAt IS NULL")
    Optional<User> findByTelegramId(@Param("telegramId") Long telegramId);

    @Query("SELECT u FROM User u WHERE u.id = :id AND u.deletedAt IS NULL")
    Optional<User> findActiveById(@Param("id") UUID id);

    @Query("SELECT COUNT(u) FROM User u WHERE u.deletedAt IS NULL")
    long countActive();

    @Query("SELECT COUNT(u) FROM User u WHERE u.createdAt > :since AND u.deletedAt IS NULL")
    long countByCreatedAtAfter(@Param("since") Instant since);

    @Query(value = """
            SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
            FROM users
            WHERE created_at >= :since AND deleted_at IS NULL
            GROUP BY DATE(created_at AT TIME ZONE 'UTC')
            ORDER BY day ASC
            """, nativeQuery = true)
    List<Object[]> findRegistrationsByDayAfter(@Param("since") Instant since);
}
