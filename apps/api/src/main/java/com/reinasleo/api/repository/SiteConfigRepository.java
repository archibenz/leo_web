package com.reinasleo.api.repository;

import com.reinasleo.api.model.SiteConfig;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SiteConfigRepository extends JpaRepository<SiteConfig, String> {
}
