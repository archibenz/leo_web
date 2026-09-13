package com.reinasleo.api.repository;

import com.reinasleo.api.model.SiteEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SiteEventRepository extends JpaRepository<SiteEvent, UUID> {

    List<SiteEvent> findByUserIdOrderByOccurredAtDesc(UUID userId);

    // Soft-delete keeps the users row (anonymised, not removed), so the FK's
    // ON DELETE SET NULL never fires on its own — deleteAccount() calls this
    // explicitly, the same way it wipes cart_items/favorites. The row itself
    // stays (it is a historical analytics fact), only the identity link goes.
    //
    // flushAutomatically is required, not optional: deleteAccount() mutates
    // the managed User entity (setDeletedAt etc.) BEFORE calling this, and a
    // bulk UPDATE only auto-flushes pending changes for entities it directly
    // targets (SiteEvent here, not User) — without it, entityManager.clear()
    // below silently drops the still-unflushed User changes. Caught by
    // AuthControllerDeleteTest: deletedAt came back null after this call.
    // clearAutomatically: a bulk UPDATE bypasses the persistence context, so
    // without this an entity loaded earlier in the same transaction (e.g. a
    // test that saves, clears, then re-reads) would still show the stale
    // in-memory value even though the row changed.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("UPDATE SiteEvent e SET e.userId = null WHERE e.userId = :userId")
    int clearUserId(@Param("userId") UUID userId);
}
