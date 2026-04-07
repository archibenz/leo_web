package com.reinasleo.api.repository;

import com.reinasleo.api.model.BotVisit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.UUID;

public interface BotVisitRepository extends JpaRepository<BotVisit, UUID> {

    long countByVisitedAtAfter(Instant since);

    long countDistinctTelegramIdByVisitedAtAfter(Instant since);
}
