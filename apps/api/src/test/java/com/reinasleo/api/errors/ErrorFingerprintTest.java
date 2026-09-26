package com.reinasleo.api.errors;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ErrorFingerprintTest {

    // Одна поломка с разными id — одна группа, иначе счётчик повторов пуст.
    @Test
    void theSameBreakageWithDifferentIdsIsOneGroup() {
        String a = ErrorFingerprint.of("site-api", "exception", "NotFound", "order 123 not found for 5f0c1d2e-1a2b-4c3d-8e9f-001122334455", "OrderService.get:40");
        String b = ErrorFingerprint.of("site-api", "exception", "NotFound", "order 987 not found for 00000000-0000-4000-8000-000000000000", "OrderService.get:40");
        assertThat(a).isEqualTo(b).hasSize(64);
    }

    @Test
    void aDifferentClassOrPlaceIsAnotherGroup() {
        String base = ErrorFingerprint.of("site-api", "exception", "NotFound", "x", "A.b:1");
        assertThat(ErrorFingerprint.of("site-api", "exception", "Other", "x", "A.b:1")).isNotEqualTo(base);
        assertThat(ErrorFingerprint.of("site-api", "exception", "NotFound", "x", "A.c:1")).isNotEqualTo(base);
        assertThat(ErrorFingerprint.of("site-web-client", "exception", "NotFound", "x", "A.b:1")).isNotEqualTo(base);
    }

    // Правка кода выше по файлу сдвигает номер строки — это та же ошибка.
    @Test
    void aShiftedLineNumberIsStillTheSameGroup() {
        assertThat(ErrorFingerprint.of("site-api", "exception", "E", "boom", "OrderService.get:40"))
                .isEqualTo(ErrorFingerprint.of("site-api", "exception", "E", "boom", "OrderService.get:57"));
    }

    // Контрольный вектор от аналитики (26.09): тот же хеш из её реализации на
    // Python. Разойдутся — одна и та же ошибка у нас и у неё станет двумя.
    @Test
    void matchesTheAnalyticsReferenceVector() {
        assertThat(ErrorFingerprint.of("x", "exception", "E", "товар 12 нет", "a.py:3 f"))
                .isEqualTo("e842158d6ee26c58ff382a3023f96083a811f04cb3c1b21fffc264a59457a4b7");
    }
}
