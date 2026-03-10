package com.reinasleo.api.repository;

import com.reinasleo.api.model.ProductInterestEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ProductInterestEventRepository extends JpaRepository<ProductInterestEvent, UUID> {

    @Query("""
        SELECT e.product.id, e.product.title, COUNT(e) as cnt
        FROM ProductInterestEvent e
        GROUP BY e.product.id, e.product.title
        ORDER BY cnt DESC
        LIMIT :limit
        """)
    List<Object[]> findTopProducts(int limit);
}
