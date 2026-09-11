package com.reinasleo.api.repository;

import com.reinasleo.api.model.ProductModel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProductModelRepository extends JpaRepository<ProductModel, UUID> {
    List<ProductModel> findByActiveTrueOrderBySortOrderAsc();
    Optional<ProductModel> findBySlug(String slug);
}
