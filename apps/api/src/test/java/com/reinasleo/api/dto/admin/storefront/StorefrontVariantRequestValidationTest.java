package com.reinasleo.api.dto.admin.storefront;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

// Приёмка 9 (task-price-switch-brief.md): discount_pct вне 0..90 — отказ на
// уровне валидации, до того как значение доедет до БД (та же граница ещё раз
// стоит в V36 CHECK ck_products_discount_pct — задняя линия обороны на случай
// прямой записи в обход DTO, см. рассуждение в самой миграции).
class StorefrontVariantRequestValidationTest {

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

    private static StorefrontVariantRequest build(BigDecimal price, BigDecimal salePrice, String priceSource, int discountPct) {
        return new StorefrontVariantRequest(price, salePrice, "camel", "#b89a6e", "Кэмел", "Camel",
                "/images/white/camel.jpg", List.of("/images/white/camel-2.jpg"), 4, true, 0,
                priceSource, discountPct, false, false, false, false);
    }

    private static Set<String> errorsOn(StorefrontVariantRequest r, String property) {
        return validator.validate(r).stream()
                .filter(v -> property.equals(v.getPropertyPath().toString()))
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());
    }

    @Test
    void discountPctWithinRange_passesValidation() {
        assertThat(errorsOn(build(new BigDecimal("100.00"), null, "manual", 0), "discountPct")).isEmpty();
        assertThat(errorsOn(build(new BigDecimal("100.00"), null, "manual", 90), "discountPct")).isEmpty();
    }

    @Test
    void discountPctAboveNinety_isRejected() {
        assertThat(errorsOn(build(new BigDecimal("100.00"), null, "manual", 91), "discountPct")).isNotEmpty();
    }

    @Test
    void discountPctBelowZero_isRejected() {
        assertThat(errorsOn(build(new BigDecimal("100.00"), null, "manual", -1), "discountPct")).isNotEmpty();
    }

    @Test
    void priceSourceManualOrOzon_passesValidation() {
        assertThat(errorsOn(build(new BigDecimal("100.00"), null, "manual", 0), "priceSource")).isEmpty();
        assertThat(errorsOn(build(new BigDecimal("100.00"), null, "ozon", 0), "priceSource")).isEmpty();
    }

    // wildberries НЕ заведён как источник цены (этап 4 заблокирован, см. V36
    // заголовок) — попытка выставить его отбивается здесь же, до записи.
    @Test
    void priceSourceWildberries_isRejected_becauseItIsNotWiredUpYet() {
        assertThat(errorsOn(build(new BigDecimal("100.00"), null, "wildberries", 0), "priceSource")).isNotEmpty();
    }

    @Test
    void priceSourceBlank_isRejected() {
        assertThat(errorsOn(build(new BigDecimal("100.00"), null, "", 0), "priceSource")).isNotEmpty();
    }

    // Существующее правило не ослаблено переключателем: salePrice всё ещё
    // обязан быть строго меньше price, будь он результатом ручного ввода или
    // (как теперь) вычисления VariantPriceCalculator.
    @Test
    void saleEqualToPrice_isStillRejected() {
        StorefrontVariantRequest r = build(new BigDecimal("100.00"), new BigDecimal("100.00"), "manual", 0);
        assertThat(validator.validate(r)).isNotEmpty();
    }
}
