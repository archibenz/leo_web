package com.reinasleo.api.service;

import com.reinasleo.api.dto.AccountExportResponse;
import com.reinasleo.api.dto.DeleteAccountRequest;
import com.reinasleo.api.model.SiteEvent;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.SiteEventRepository;
import com.reinasleo.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Mandatory per the site-events brief: "Любое новое событие с user_id обязано
// попасть и в выгрузку, и в удаление аккаунта." product_interest_events (V2)
// already made this promise to users (AccountExportResponse); site_events
// must not quietly narrow it. Real Spring context + real repositories on
// purpose — a mocked AuthService test would only prove a method was called,
// not that the SQL actually detaches the row.
@SpringBootTest
@Transactional
@ActiveProfiles("test")
class AuthServiceSiteEventsGdprTest {

    @Autowired private AuthService authService;
    @Autowired private UserRepository userRepository;
    @Autowired private SiteEventRepository siteEventRepository;
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Test
    void siteEventWithUserId_appearsInExport_andLosesTheLinkAfterDeletion() {
        User user = new User("gdpr-events@example.com", "Alice", "Smith",
                passwordEncoder.encode("Sup3rSecret!"), LocalDate.of(1990, 1, 1), false, true);
        user = userRepository.save(user);
        UUID userId = user.getId();

        SiteEvent event = new SiteEvent();
        event.setEventType("add_to_cart");
        event.setProductId("wb-gdpr-1");
        event.setUserId(userId);
        event = siteEventRepository.save(event);
        UUID eventId = event.getId();

        // 1. Выгрузка видит событие.
        AccountExportResponse export = authService.exportAccountData(user);
        assertThat(export.siteEvents()).isNotNull();
        assertThat(export.siteEvents())
                .anyMatch(e -> "add_to_cart".equals(e.eventType()) && "wb-gdpr-1".equals(e.productId()));

        // 2. Удаление аккаунта — ссылки на пользователя не осталось.
        authService.deleteAccount(user, new DeleteAccountRequest("Sup3rSecret!", "DELETE"));

        SiteEvent reloaded = siteEventRepository.findById(eventId).orElseThrow();
        assertThat(reloaded.getUserId()).isNull();
    }
}
