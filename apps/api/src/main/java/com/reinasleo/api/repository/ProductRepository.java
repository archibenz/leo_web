package com.reinasleo.api.repository;

import com.reinasleo.api.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, String> {
    @Query("SELECT p.collectionId, COUNT(p) FROM Product p WHERE p.active = true GROUP BY p.collectionId")
    List<Object[]> countActiveByCollection();

    List<Product> findByIdInAndActiveTrue(Collection<String> ids);
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
