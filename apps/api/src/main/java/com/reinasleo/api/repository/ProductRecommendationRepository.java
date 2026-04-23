package com.reinasleo.api.repository;

import com.reinasleo.api.model.ProductRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRecommendationRepository extends JpaRepository<ProductRecommendation, UUID> {
    List<ProductRecommendation> findByProductIdOrderBySortOrderAsc(String productId);
}
