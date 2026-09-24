package com.reinasleo.api.dto.admin.storefront;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.reinasleo.api.dto.storefront.Measurement;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.Map;

/**
 * Карточка модели целиком, вместе с цветовыми вариантами: владелец правит её
 * одним экраном и публикует одной кнопкой, поэтому вариант приходит и
 * публикуется тем же запросом, что и тексты. Ключ карты — `products.id`.
 */
public record StorefrontModelRequest(
        @NotBlank @Size(max = 255) String nameRu,
        @NotBlank @Size(max = 255) String nameEn,
        @NotBlank @Size(max = 32) String category,
        @NotBlank String descRu,
        @NotBlank String descEn,
        String storyRu,
        String storyEn,
        @NotBlank String compositionRu,
        @NotBlank String compositionEn,
        @NotBlank String careRu,
        @NotBlank String careEn,
        @NotEmpty List<@NotBlank @Size(max = 16) String> sizes,
        @NotBlank @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String image,
        @NotNull List<@Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String> gallery,
        @Size(max = 16) String season,
        Integer featuredOrder,
        Integer lookbookOrder,
        int sortOrder,
        boolean active,
        @NotNull Map<String, @Valid @NotNull StorefrontVariantRequest> variants,
        // Мерки изделия (п. 15). null и пустой список — мерок нет, таблицы на
        // карточке нет.
        List<@Valid @NotNull Measurement> measurements
) {

    private static final BigDecimal HALF = new BigDecimal("0.5");

    /**
     * Мерки сходятся с моделью: каждая мерка один раз, размеры — только из
     * набора модели, значения — с шагом 0,5 см. Проверяется на слитом
     * запросе, то есть и на черновике, и при публикации: снятый из набора
     * размер с оставшейся меркой публикацию не пропустит.
     */
    @JsonIgnore
    @AssertTrue(message = "мерки: каждая один раз, размеры из набора модели, шаг 0,5 см")
    public boolean isMeasurementsFitModel() {
        if (measurements == null) return true;
        Set<String> kinds = new HashSet<>();
        Set<String> modelSizes = sizes == null ? Set.of() : new HashSet<>(sizes);
        for (Measurement m : measurements) {
            if (m == null || m.values() == null) continue; // это поймают свои @NotNull
            if (!kinds.add(m.kind())) return false;
            for (Map.Entry<String, BigDecimal> v : m.values().entrySet()) {
                if (!modelSizes.contains(v.getKey())) return false;
                if (v.getValue() != null && v.getValue().remainder(HALF).signum() != 0) return false;
            }
        }
        return true;
    }
}
