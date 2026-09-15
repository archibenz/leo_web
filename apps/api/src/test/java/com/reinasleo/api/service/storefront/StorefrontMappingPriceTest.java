package com.reinasleo.api.service.storefront;

import com.reinasleo.api.dto.admin.storefront.StorefrontVariantRequest;
import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductModel;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * "Маппинга" половина приёмки (task-price-switch-brief.md): доказывает, что
 * VariantPriceCalculator не просто верно считает в изоляции (см.
 * VariantPriceCalculatorTest), а что его результат доезжает до
 * StorefrontVariantRequest в ПРАВИЛЬНЫЕ поля — не перепутанные местами price/
 * sale, флаги не потеряны, priceSource/discountPct не потеряны на обратной
 * записи. Именно это разъехалось бы, если бы калькулятор считал верно, а
 * publishedVariant() собирал DTO руками с опечаткой в порядке полей.
 */
class StorefrontMappingPriceTest {

    private final StorefrontMapping mapping = new StorefrontMapping(new VariantPriceCalculator());

    private static Product variant(String id, String priceSource, int discountPct, String price) {
        Product v = new Product();
        v.setId(id);
        v.setPriceSource(priceSource);
        v.setDiscountPct(discountPct);
        v.setPrice(price == null ? null : new BigDecimal(price));
        v.setColorKey("camel");
        v.setColorHex("#b89a6e");
        v.setColorNameRu("Кэмел");
        v.setColorNameEn("Camel");
        v.setImage("/i/camel.jpg");
        v.setImages("[]");
        v.setStockQuantity(3);
        v.setActive(true);
        v.setSortOrder(0);
        return v;
    }

    private static MarketplacePrice row(String productId, String source, Long buyerKop, Long costKop) {
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId(productId);
        row.setSource(source);
        row.setBuyerPriceKop(buyerKop);
        row.setCostPriceKop(costKop);
        row.setReceivedAt(Instant.now());
        return row;
    }

    @Test
    void publishedVariant_putsBaseAndSaleIntoTheRightFields_notSwapped() {
        Product v = variant("wb-1", "manual", 20, "100.01");

        StorefrontVariantRequest r = mapping.publishedVariant(v, MarketplacePriceLookup.empty());

        // basePrice -> price, действующая цена -> salePrice: перепутанные
        // местами дали бы price=80.00 (меньше себестоимости варианта) — ровно
        // тот класс ошибки, который "выглядит рабочим", пока никто не сверит числа.
        assertThat(r.price()).isEqualByComparingTo("100.01");
        assertThat(r.salePrice()).isEqualByComparingTo("80.00");
        assertThat(r.priceSource()).isEqualTo("manual");
        assertThat(r.discountPct()).isEqualTo(20);
        assertThat(r.manualPriceInactive()).isFalse();
    }

    @Test
    void publishedVariant_ozonSource_readsBaseFromLookup_andRaisesManualPriceInactive() {
        Product v = variant("wb-1", "ozon", 0, "999.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(row("wb-1", "ozon", 500000L, null)));

        StorefrontVariantRequest r = mapping.publishedVariant(v, prices);

        assertThat(r.price()).isEqualByComparingTo("5000.00");
        assertThat(r.salePrice()).isNull();
        assertThat(r.sourceMissing()).isFalse();
        assertThat(r.manualPriceInactive()).isTrue();
    }

    // Однопараметрический publishedVariant(Product) — удобство для
    // price_source=manual (экран этапа 3 такому варианту marketplace_prices
    // не нужен); эквивалентен пустому lookup.
    @Test
    void publishedVariant_oneArgOverload_behavesLikeAnEmptyLookup() {
        Product v = variant("wb-1", "manual", 10, "500.00");

        StorefrontVariantRequest withoutLookup = mapping.publishedVariant(v);
        StorefrontVariantRequest withEmptyLookup = mapping.publishedVariant(v, MarketplacePriceLookup.empty());

        assertThat(withoutLookup).isEqualTo(withEmptyLookup);
    }

    // applyVariant пишет priceSource/discountPct на сущность (round-trip для
    // экрана этапа 3), но флаги — read-only: DTO, пришедший как бы "с сервера"
    // (с поднятыми флагами), не имеет способа записать их куда-либо на Product,
    // потому что у Product таких полей нет вовсе — applyVariant их не читает.
    @Test
    void applyVariant_writesPriceSourceAndDiscountPct_ontoTheEntity() {
        Product v = variant("wb-1", "manual", 0, "500.00");
        StorefrontVariantRequest r = new StorefrontVariantRequest(
                new BigDecimal("500.00"), null, "camel", "#b89a6e", "Кэмел", "Camel",
                "/i/camel.jpg", List.of(), 3, true, 0,
                "ozon", 35, true, true, true, true);

        mapping.applyVariant(r, v);

        assertThat(v.getPriceSource()).isEqualTo("ozon");
        assertThat(v.getDiscountPct()).isEqualTo(35);
    }

    @Test
    void published_model_computesEachVariantAgainstTheSameBatchLookup() {
        ProductModel m = new ProductModel();
        ReflectionTestUtils.setField(m, "id", UUID.randomUUID());
        m.setNameRu("Пальто"); m.setNameEn("Coat"); m.setCategory("outerwear");
        m.setDescRu("о"); m.setDescEn("d"); m.setCompositionRu("ш"); m.setCompositionEn("w");
        m.setCareRu("у"); m.setCareEn("c"); m.setSizes(new String[]{"S"}); m.setImage("/i/m.jpg");

        Product manual = variant("wb-1", "manual", 10, "1000.00");
        Product ozon = variant("wb-2", "ozon", 0, "1.00"); // приманка — не должна попасть в ответ
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(row("wb-2", "ozon", 200000L, null)));

        Map<String, StorefrontVariantRequest> byId = mapping.published(m, List.of(manual, ozon), prices).variants();

        assertThat(byId.get("wb-1").salePrice()).isEqualByComparingTo("900.00");
        assertThat(byId.get("wb-2").price()).isEqualByComparingTo("2000.00");
        assertThat(byId.get("wb-2").sourceMissing()).isFalse();
    }
}
