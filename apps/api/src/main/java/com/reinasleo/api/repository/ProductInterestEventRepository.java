package com.reinasleo.api.repository;

import com.reinasleo.api.model.ProductInterestEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ProductInterestEventRepository extends JpaRepository<ProductInterestEvent, UUID> {

    @Query("""
            SELECT p.id, p.title, COUNT(e) AS cnt
            FROM ProductInterestEvent e
            JOIN e.product p
            GROUP BY p.id, p.title
            ORDER BY cnt DESC
            """)
    List<Object[]> findTopProducts();
}
