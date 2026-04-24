package com.reinasleo.api.repository;

import com.reinasleo.api.model.ProductInterestEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface ProductInterestEventRepository extends JpaRepository<ProductInterestEvent, UUID> {

    @Query("""
            SELECT p.id, p.title, COUNT(e) AS cnt
            FROM ProductInterestEvent e
            JOIN e.product p
            WHERE e.eventType = :eventType
              AND e.createdAt >= :since
            GROUP BY p.id, p.title
            ORDER BY cnt DESC
            """)
    List<Object[]> findTopProducts(
            @Param("eventType") String eventType,
            @Param("since") Instant since,
            Pageable pageable
    );
}
