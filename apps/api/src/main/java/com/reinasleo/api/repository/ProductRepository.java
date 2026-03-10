package com.reinasleo.api.repository;

import com.reinasleo.api.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, String> {
    List<Product> findByActiveTrueOrderByCreatedAtDesc();
    List<Product> findByCollectionIdAndActiveTrueOrderByCreatedAtDesc(UUID collectionId);
    List<Product> findByStockQuantityLessThanEqualAndActiveTrueAndIsTestFalse(int threshold);
    long countByActiveTrue();
    long countByActiveTrueAndIsTestFalse();
    long countByActiveTrueAndStockQuantityEquals(int quantity);
    long countByActiveTrueAndIsTestFalseAndStockQuantityEquals(int quantity);
    long countByActiveTrueAndIsTestFalseAndStockQuantityGreaterThanAndStockQuantityLessThanEqual(int min, int max);
    List<Product> findByCollectionId(UUID collectionId);
    void deleteByCollectionId(UUID collectionId);
}
