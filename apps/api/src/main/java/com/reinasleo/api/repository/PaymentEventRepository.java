package com.reinasleo.api.repository;

import com.reinasleo.api.model.PaymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, UUID> {

    /**
     * Check: event уже обработан? Используется как fallback к atomic insert
     * pattern (на случай если ON CONFLICT timing edge case проявится).
     * Основная проверка идёт через UNIQUE constraint в DB.
     */
    Optional<PaymentEvent> findByProviderAndExternalEventId(String provider, String externalEventId);
}
