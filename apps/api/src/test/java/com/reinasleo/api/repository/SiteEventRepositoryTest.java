package com.reinasleo.api.repository;

import com.reinasleo.api.model.SiteEvent;
import com.reinasleo.api.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class SiteEventRepositoryTest {

    @Autowired private SiteEventRepository siteEvents;
    @Autowired private UserRepository users;

    private static User user(String email) {
        return new User(email, "Alice", "Smith", "hash", LocalDate.of(1990, 1, 1), false, true);
    }

    private static SiteEvent event(String eventType, UUID userId) {
        SiteEvent e = new SiteEvent();
        e.setEventType(eventType);
        e.setUserId(userId);
        return e;
    }

    @Test
    void save_assignsIdAndOccurredAt() {
        SiteEvent saved = siteEvents.save(event("page_view", null));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getOccurredAt()).isNotNull();
    }

    @Test
    void findByUserIdOrderByOccurredAtDesc_returnsOnlyThatUsersEvents() {
        User alice = users.save(user("alice-se@example.com"));
        User bob = users.save(user("bob-se@example.com"));
        siteEvents.save(event("add_to_cart", alice.getId()));
        siteEvents.save(event("checkout_start", alice.getId()));
        siteEvents.save(event("add_to_cart", bob.getId()));

        List<SiteEvent> found = siteEvents.findByUserIdOrderByOccurredAtDesc(alice.getId());

        assertThat(found).hasSize(2);
        assertThat(found).allMatch(e -> e.getUserId().equals(alice.getId()));
    }

    @Test
    void clearUserId_nullsOutUserIdButKeepsTheRow() {
        User alice = users.save(user("alice-clear@example.com"));
        SiteEvent saved = siteEvents.save(event("add_to_favourite", alice.getId()));
        UUID eventId = saved.getId();

        int updated = siteEvents.clearUserId(alice.getId());

        assertThat(updated).isEqualTo(1);
        SiteEvent reloaded = siteEvents.findById(eventId).orElseThrow();
        assertThat(reloaded.getUserId()).isNull();
        assertThat(reloaded.getEventType()).isEqualTo("add_to_favourite");
    }

    @Test
    void clearUserId_doesNotTouchOtherUsersEvents() {
        User alice = users.save(user("alice-other@example.com"));
        User bob = users.save(user("bob-other@example.com"));
        siteEvents.save(event("add_to_cart", alice.getId()));
        SiteEvent bobsEvent = siteEvents.save(event("add_to_cart", bob.getId()));

        siteEvents.clearUserId(alice.getId());

        SiteEvent reloaded = siteEvents.findById(bobsEvent.getId()).orElseThrow();
        assertThat(reloaded.getUserId()).isEqualTo(bob.getId());
    }
}
