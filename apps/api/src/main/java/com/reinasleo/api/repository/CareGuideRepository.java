package com.reinasleo.api.repository;

import com.reinasleo.api.model.CareGuide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CareGuideRepository extends JpaRepository<CareGuide, UUID> {
    List<CareGuide> findByActiveTrueOrderBySortOrderAsc();
}
