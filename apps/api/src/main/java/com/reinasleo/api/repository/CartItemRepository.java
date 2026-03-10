package com.reinasleo.api.repository;

import com.reinasleo.api.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
    Optional<CartItem> findByCartIdAndProductIdAndSize(UUID cartId, String productId, String size);
}
