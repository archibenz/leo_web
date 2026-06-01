package com.reinasleo.api.repository;

import com.reinasleo.api.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    /**
     * Поиск Payment по provider + external_payment_id. Используется в
     * webhook handler'е для finding existing payment перед update.
     */
    Optional<Payment> findByProviderAndExternalPaymentId(String provider, String externalPaymentId);

    /**
     * Все payment attempts для конкретного order. Используется в админке
     * для просмотра истории попыток оплаты.
     */
    List<Payment> findByOrderIdOrderByCreatedAtDesc(UUID orderId);
}
