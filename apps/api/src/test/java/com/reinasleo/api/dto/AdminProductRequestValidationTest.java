package com.reinasleo.api.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

// Цена товара стала необязательной вместе с V29: предзаказ живёт в каталоге
// строкой без цены, и админка обязана уметь такую строку сохранить. Ноль ценой
// при этом не становится — витрина показала бы «0 ₽» вместо «Предзаказ».
class AdminProductRequestValidationTest {

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

    private static AdminProductRequest build(BigDecimal price) {
        return new AdminProductRequest(
                "wb-1287075011", "Спортивный костюм с кантом", "описание", price,
                "knitwear", new String[]{"S", "M"}, null, 0, 5,
                null, null, null, null, null, null, true, null);
    }

    private static Set<String> priceErrors(AdminProductRequest request) {
        return validator.validate(request).stream()
                .filter(v -> "price".equals(v.getPropertyPath().toString()))
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());
    }

    @Test
    void requestWithoutPrice_passesValidation() {
        assertThat(priceErrors(build(null))).isEmpty();
        assertThat(validator.validate(build(null))).isEmpty();
    }

    @Test
    void requestWithZeroPrice_isStillRejected() {
        assertThat(priceErrors(build(BigDecimal.ZERO))).isNotEmpty();
    }

    @Test
    void requestWithNegativePrice_isStillRejected() {
        assertThat(priceErrors(build(new BigDecimal("-1")))).isNotEmpty();
    }
}
