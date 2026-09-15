package com.reinasleo.api.repository;

import com.reinasleo.api.model.MarketplacePrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MarketplacePriceRepository extends JpaRepository<MarketplacePrice, UUID> {

    // Разнесены на два метода, а не один findByProductIdAndSource(id, null):
    // Spring Data переводит параметр null в "source = ?1", что в SQL никогда
    // не истинно (NULL ни с чем не равен, даже с NULL) — строка с source IS
    // NULL просто не нашлась бы, и себестоимость без пары с площадкой каждый
    // раз вставлялась бы заново вместо upsert. IsNull-вариант строит
    // правильный "source IS NULL" сам.
    Optional<MarketplacePrice> findByProductIdAndSource(String productId, String source);

    Optional<MarketplacePrice> findByProductIdAndSourceIsNull(String productId);
}
