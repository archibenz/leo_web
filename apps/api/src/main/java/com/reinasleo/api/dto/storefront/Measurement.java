package com.reinasleo.api.dto.storefront;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Одна мерка ИЗДЕЛИЯ по размерам модели (решение владельца 24.09): что
 * меряется сантиметром на самой вещи, а не обхваты тела.
 *
 * Мерки модели хранятся МАССИВОМ таких строк, а не объектом «мерка → …»:
 * черновик сливает вложенные объекты рекурсивно, а массив заменяет целиком
 * (StorefrontDraftMerge). Объектом снятая мерка или снятый размер оставались
 * бы в черновике с прошлого раза.
 */
public record Measurement(
        @NotBlank @Pattern(regexp = "length|chest|waist|hips|sleeve|shoulders") String kind,
        @NotNull @Size(min = 1) Map<@NotBlank @Size(max = 16) String,
                @NotNull @DecimalMin("1") @DecimalMax("300") BigDecimal> values
) {}
