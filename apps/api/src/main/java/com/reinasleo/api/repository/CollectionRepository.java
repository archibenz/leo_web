package com.reinasleo.api.repository;

import com.reinasleo.api.model.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CollectionRepository extends JpaRepository<Collection, UUID> {
    Optional<Collection> findBySlug(String slug);
    List<Collection> findByActiveTrueOrderBySortOrderAsc();
}
