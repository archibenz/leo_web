package com.reinasleo.api.repository;

import com.reinasleo.api.model.ProductSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ProductSetRepository extends JpaRepository<ProductSet, UUID> {
    List<ProductSet> findByActiveTrueOrderBySortOrderAsc();
}
