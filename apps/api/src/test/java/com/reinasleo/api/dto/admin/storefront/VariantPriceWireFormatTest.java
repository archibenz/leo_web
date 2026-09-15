package com.reinasleo.api.dto.admin.storefront;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Форма даты НА ПРОВОДЕ, а не в Java.
 *
 * sourceCheckedAt читает редактор — `new Date(значение)` в VariantForm.tsx.
 * Строку ISO он разберёт, а число секунд эпохи молча разберёт КАК
 * МИЛЛИСЕКУНДЫ и покажет владельцу январь 1970-го: не отказ, не пустое поле,
 * а уверенно неверная дата. Разницу задаёт одна строка настройки
 * (spring.jackson.serialization.write-dates-as-timestamps: false), которую
 * ничто в коде не удерживает.
 *
 * Поэтому проверяется не «Instant сериализуется», а ровно то, что увидит
 * браузер.
 */
@SpringBootTest
@ActiveProfiles("test")
class VariantPriceWireFormatTest {

    @Autowired private ObjectMapper json;

    private static StorefrontVariantRequest variant(Instant checkedAt) {
        return new StorefrontVariantRequest(
                new BigDecimal("7500.00"), null, "camel", "#b89a6e", "Кэмел", "Camel",
                "/images/white/camel.jpg", List.of(), 3, true, 0,
                "ozon", 0, false, false, false, true,
                new BigDecimal("5000.00"), new BigDecimal("5000.00"), checkedAt);
    }

    @Test
    void sourceCheckedAt_уезжаетСтрокойISO_аНеЧисломЭпохи() throws Exception {
        JsonNode wire = json.readTree(json.writeValueAsString(variant(Instant.parse("2026-09-15T12:00:00Z"))));

        assertThat(wire.get("sourceCheckedAt").isTextual())
                .as("число эпохи редактор покажет как 1970 год, не заметив подмены")
                .isTrue();
        assertThat(wire.get("sourceCheckedAt").asText()).startsWith("2026-09-15T12:00:00");
    }

    @Test
    void датыНет_полеПриезжаетПустым_аНеОтсутствует() throws Exception {
        JsonNode wire = json.readTree(json.writeValueAsString(variant(null)));

        // Ключ обязан быть: редактор различает «источник ручной» и «дата не
        // пришла» по значению, а отсутствие ключа в слиянии черновика значит
        // совсем другое — «поле не трогали».
        assertThat(wire.has("sourceCheckedAt")).isTrue();
        assertThat(wire.get("sourceCheckedAt").isNull()).isTrue();
    }
}
