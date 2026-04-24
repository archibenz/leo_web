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

    @Query("SELECT u FROM User u WHERE lower(u.email) = lower(:email)")
    Optional<User> findByEmailIgnoreCase(String email);

    Optional<User> findByTelegramId(Long telegramId);

    long countByCreatedAtAfter(Instant since);

    @Query(value = """
            SELECT DATE(created_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
            FROM users
            WHERE created_at >= :since
            GROUP BY DATE(created_at AT TIME ZONE 'UTC')
            ORDER BY day ASC
            """, nativeQuery = true)
    List<Object[]> findRegistrationsByDayAfter(@Param("since") Instant since);
}
