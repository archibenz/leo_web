package com.reinasleo.api.repository;

import com.reinasleo.api.model.Order;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    @EntityGraph(attributePaths = {"items", "items.product"})
    List<Order> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByCreatedAtAfter(Instant since);

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status <> 'cancelled'")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status <> 'cancelled' AND o.createdAt > :since")
    BigDecimal sumRevenueAfter(@Param("since") Instant since);

    @Query("SELECT o FROM Order o JOIN FETCH o.user ORDER BY o.createdAt DESC LIMIT 10")
    List<Order> findTop10ByOrderByCreatedAtDesc();
}
