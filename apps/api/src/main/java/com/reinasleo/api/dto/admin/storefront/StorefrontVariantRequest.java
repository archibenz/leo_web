package com.reinasleo.api.dto.admin.storefront;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

/**
 * Цветовой вариант модели. Цена необязательна — товар без цены это предзаказ
 * (V29, CheckoutService такой товар отклоняет). Артикула `nm` здесь нет
 * намеренно: он опознаёт карточку WB, а не оформление, и уникален в базе.
 *
 * price/salePrice (этап 2, V36) — уже НЕ прямое зеркало колонок products.price
 * / products.sale_price: это результат VariantPriceCalculator (основа и
 * действующая цена с учётом price_source, discount_pct и порога по
 * себестоимости), см. StorefrontMapping.publishedVariant. applyVariant всё
 * ещё пишет price в products.price при сохранении черновика — это и есть
 * "ручная цена", которую price_source либо использует напрямую, либо нет.
 *
 * priceSource/discountPct — новые входы переключателя. sourceMissing /
 * costUnknown / thresholdApplied / manualPriceInactive — только для чтения:
 * их считает калькулятор, applyVariant их не трогает при записи. Совместное
 * присутствие в одном record, а не отдельный ответ-only DTO — тот же приём,
 * что уже описан в шапке класса StorefrontMapping: разъехавшиеся форма записи
 * и форма чтения дают "сохранил одно, увидел другое".
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
        int sortOrder,
        @NotBlank @Pattern(regexp = "^(manual|ozon)$", message = "unknown price source") String priceSource,
        @Min(0) @Max(90) int discountPct,
        boolean sourceMissing,
        boolean costUnknown,
        boolean thresholdApplied,
        boolean manualPriceInactive
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
