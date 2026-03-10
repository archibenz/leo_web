package com.reinasleo.api.repository;

import com.reinasleo.api.model.StockAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StockAlertRepository extends JpaRepository<StockAlert, UUID> {
    List<StockAlert> findByAcknowledgedFalseOrderByCreatedAtDesc();
    boolean existsByProductIdAndAlertTypeAndAcknowledgedFalse(String productId, String alertType);
}
