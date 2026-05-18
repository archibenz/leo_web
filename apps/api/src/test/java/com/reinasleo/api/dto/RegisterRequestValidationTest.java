package com.reinasleo.api.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class RegisterRequestValidationTest {

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

    private static RegisterRequest build(String password) {
        return new RegisterRequest(
                "user@example.com",
                "123456",
                "Anna",
                "Ivanova",
                password,
                null,
                false, false, false, false,
                Boolean.TRUE
        );
    }

    private static boolean hasPasswordError(Set<ConstraintViolation<RegisterRequest>> violations, String code) {
        return violations.stream().anyMatch(v ->
                "password".equals(v.getPropertyPath().toString()) && code.equals(v.getMessage()));
    }

    @Test
    void password_validLatinWithDigit_passes() {
        Set<ConstraintViolation<RegisterRequest>> v = validator.validate(build("abc12345"));
        assertThat(hasPasswordError(v, "password_weak")).isFalse();
    }

    @Test
    void password_eightSpaces_failsWithWeakCode() {
        Set<ConstraintViolation<RegisterRequest>> v = validator.validate(build("        "));
        assertThat(hasPasswordError(v, "password_weak")).isTrue();
    }

    @Test
    void password_lettersOnlyNoDigit_failsWithWeakCode() {
        Set<ConstraintViolation<RegisterRequest>> v = validator.validate(build("abcdefgh"));
        assertThat(hasPasswordError(v, "password_weak")).isTrue();
    }

    @Test
    void password_digitsOnlyNoLetter_failsWithWeakCode() {
        Set<ConstraintViolation<RegisterRequest>> v = validator.validate(build("12345678"));
        assertThat(hasPasswordError(v, "password_weak")).isTrue();
    }

    @Test
    void password_cyrillicWithDigitNoLatin_failsWithWeakCode() {
        // Regex requires [A-Za-z] specifically — cyrillic letters do not
        // satisfy it, even though the user perceives them as letters. Keep
        // this in sync with the frontend password helper text.
        Set<ConstraintViolation<RegisterRequest>> v = validator.validate(build("короткий1"));
        assertThat(hasPasswordError(v, "password_weak")).isTrue();
    }

    @Test
    void password_shorterThanEight_failsWithWeakCode() {
        Set<ConstraintViolation<RegisterRequest>> v = validator.validate(build("ab1"));
        assertThat(hasPasswordError(v, "password_weak")).isTrue();
    }

    @Test
    void password_blank_failsWithNotBlank() {
        // Pattern uses .{8,128} — empty string doesn't match. But @NotBlank
        // fires first and the message is "Password is required".
        Set<ConstraintViolation<RegisterRequest>> v = validator.validate(build(""));
        boolean hasBlankOrWeak = v.stream().anyMatch(c ->
                "password".equals(c.getPropertyPath().toString()));
        assertThat(hasBlankOrWeak).isTrue();
    }
}
