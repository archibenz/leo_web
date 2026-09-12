package com.reinasleo.api.dto.admin.storefront;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Цветовой вариант модели. Цена необязательна — товар без цены это предзаказ
 * (V29, CheckoutService такой товар отклоняет). Артикула `nm` здесь нет
 * намеренно: он опознаёт карточку WB, а не оформление, и уникален в базе.
 */
public record StorefrontVariantRequest(
        @DecimalMin("0.01") BigDecimal price,
        @DecimalMin("0.01") BigDecimal salePrice,
        @Size(max = 32) String colorKey,
        @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "colour hex must look like #b89a6e") String colorHex,
        @Size(max = 64) String colorNameRu,
        @Size(max = 64) String colorNameEn,
        @Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String image,
        List<@Size(max = 512) @Pattern(regexp = MediaUrl.PATTERN, message = MediaUrl.MESSAGE) String> gallery,
        @Min(0) int stockQuantity,
        boolean active,
        int sortOrder
) {

    // @JsonIgnore обязателен: без него Jackson видит здесь свойство
    // saleBelowPrice, кладёт его в снимок опубликованного, и слияние падает
    // на нём как на неизвестном ключе.
    @JsonIgnore
    @AssertTrue(message = "sale price must be set together with price and stay below it")
    public boolean isSaleBelowPrice() {
        return salePrice == null || (price != null && salePrice.compareTo(price) < 0);
    }
}
