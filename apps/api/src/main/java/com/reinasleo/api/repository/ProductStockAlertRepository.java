package com.reinasleo.api.repository;

import com.reinasleo.api.model.ProductStockAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductStockAlertRepository extends JpaRepository<ProductStockAlert, UUID> {
    List<ProductStockAlert> findByProductId(String productId);
    List<ProductStockAlert> findByUserId(UUID userId);
    boolean existsByUserIdAndProductId(UUID userId, String productId);
    void deleteByUserIdAndProductId(UUID userId, String productId);
    void deleteByProductId(String productId);
}
