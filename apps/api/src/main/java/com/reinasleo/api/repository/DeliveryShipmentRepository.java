package com.reinasleo.api.repository;

import com.reinasleo.api.model.DeliveryShipment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryShipmentRepository extends JpaRepository<DeliveryShipment, UUID> {

    /**
     * Поиск shipment по aggregator + external_order_id. Используется в
     * webhook handler'е Apiship'а для finding our shipment по их orderId.
     */
    Optional<DeliveryShipment> findByAggregatorAndExternalOrderId(String aggregator, String externalOrderId);

    /**
     * Все shipments конкретного order. Обычно 1 на Order, но возможны
     * множественные shipments если order переотправлялся.
     */
    List<DeliveryShipment> findByOrderIdOrderByCreatedAtDesc(UUID orderId);
}
