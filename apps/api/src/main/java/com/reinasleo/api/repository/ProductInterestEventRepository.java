package com.reinasleo.api.repository;

import com.reinasleo.api.model.ProductInterestEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProductInterestEventRepository extends JpaRepository<ProductInterestEvent, UUID> {
}
