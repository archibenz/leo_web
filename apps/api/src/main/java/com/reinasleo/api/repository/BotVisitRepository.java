package com.reinasleo.api.repository;

import com.reinasleo.api.model.BotVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface BotVisitRepository extends JpaRepository<BotVisit, UUID> {

    long countByVisitedAtAfter(Instant since);

    long countDistinctTelegramIdByVisitedAtAfter(Instant since);

    @Query(value = """
            SELECT DATE(visited_at AT TIME ZONE 'UTC') AS day,
                   COUNT(*)                              AS cnt,
                   COUNT(DISTINCT telegram_id)           AS users
            FROM bot_visits
            WHERE visited_at >= :since
            GROUP BY DATE(visited_at AT TIME ZONE 'UTC')
            ORDER BY day ASC
            """, nativeQuery = true)
    List<Object[]> findVisitsByDayAfter(@Param("since") Instant since);
}
