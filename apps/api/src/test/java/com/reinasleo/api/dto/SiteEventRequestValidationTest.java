package com.reinasleo.api.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SiteEventRequestValidationTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setup() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void teardown() {
        if (factory != null) factory.close();
    }

    private static SiteEventRequest event(String eventType) {
        return new SiteEventRequest(eventType, "sess-key-1", null, null, null, null, null, null);
    }

    private static <T> boolean hasFieldError(Set<ConstraintViolation<T>> violations, String field) {
        return violations.stream().anyMatch(v -> field.equals(v.getPropertyPath().toString()));
    }

    @Test
    void knownEventType_passes() {
        for (String type : List.of("page_view", "product_view", "marketplace_click",
                "add_to_cart", "add_to_favourite", "checkout_start", "signup")) {
            Set<ConstraintViolation<SiteEventRequest>> violations = validator.validate(event(type));
            assertThat(violations).as("event type %s should be valid", type).isEmpty();
        }
    }

    @Test
    void unknownEventType_failsValidation() {
        Set<ConstraintViolation<SiteEventRequest>> violations = validator.validate(event("delete_account"));

        assertThat(hasFieldError(violations, "eventType")).isTrue();
    }

    @Test
    void blankEventType_failsValidation() {
        Set<ConstraintViolation<SiteEventRequest>> violations = validator.validate(event(""));

        assertThat(hasFieldError(violations, "eventType")).isTrue();
    }

    @Test
    void malformedSessionKey_failsValidation() {
        SiteEventRequest req = new SiteEventRequest("page_view", "has spaces!", null, null, null, null, null, null);

        Set<ConstraintViolation<SiteEventRequest>> violations = validator.validate(req);

        assertThat(hasFieldError(violations, "sessionKey")).isTrue();
    }

    @Test
    void nullOptionalFields_pass() {
        SiteEventRequest req = new SiteEventRequest("page_view", null, null, null, null, null, null, null);

        assertThat(validator.validate(req)).isEmpty();
    }

    @Test
    void unknownDevice_failsValidation() {
        SiteEventRequest req = new SiteEventRequest("page_view", null, null, null, null, null, "tablet", null);

        Set<ConstraintViolation<SiteEventRequest>> violations = validator.validate(req);

        assertThat(hasFieldError(violations, "device")).isTrue();
    }

    @Test
    void unknownMarketplace_failsValidation() {
        SiteEventRequest req = new SiteEventRequest("marketplace_click", null, "wb-1", null, null, null, null, "amazon");

        Set<ConstraintViolation<SiteEventRequest>> violations = validator.validate(req);

        assertThat(hasFieldError(violations, "marketplace")).isTrue();
    }

    @Test
    void validModelId_passes() {
        SiteEventRequest req = new SiteEventRequest("product_view", "sess", "wb-1", UUID.randomUUID(), "/ru/product/x", "ru", "phone", null);

        assertThat(validator.validate(req)).isEmpty();
    }

    @Test
    void batch_upTo20Events_passes() {
        List<SiteEventRequest> events = java.util.stream.Stream.generate(() -> event("page_view"))
                .limit(20)
                .toList();
        SiteEventBatchRequest batch = new SiteEventBatchRequest(events);

        assertThat(validator.validate(batch)).isEmpty();
    }

    @Test
    void batch_21Events_failsValidation() {
        List<SiteEventRequest> events = java.util.stream.Stream.generate(() -> event("page_view"))
                .limit(21)
                .toList();
        SiteEventBatchRequest batch = new SiteEventBatchRequest(events);

        Set<ConstraintViolation<SiteEventBatchRequest>> violations = validator.validate(batch);

        assertThat(hasFieldError(violations, "events")).isTrue();
    }

    @Test
    void batch_empty_failsValidation() {
        SiteEventBatchRequest batch = new SiteEventBatchRequest(List.of());

        Set<ConstraintViolation<SiteEventBatchRequest>> violations = validator.validate(batch);

        assertThat(hasFieldError(violations, "events")).isTrue();
    }
}
