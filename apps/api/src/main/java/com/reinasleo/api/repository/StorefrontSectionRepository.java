package com.reinasleo.api.repository;

import com.reinasleo.api.model.StorefrontSection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StorefrontSectionRepository extends JpaRepository<StorefrontSection, UUID> {
    List<StorefrontSection> findByStatusOrderBySortOrderAsc(String status);
}
