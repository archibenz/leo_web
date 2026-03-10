package com.reinasleo.api.repository;

import com.reinasleo.api.model.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
    List<Favorite> findByUserId(UUID userId);
    Optional<Favorite> findByUserIdAndProductId(UUID userId, String productId);
    boolean existsByUserIdAndProductId(UUID userId, String productId);
}
