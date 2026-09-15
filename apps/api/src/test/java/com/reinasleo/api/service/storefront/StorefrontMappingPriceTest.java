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
 * «Маппинга» половина приёмки (task-price-switch-brief.md): доказывает, что
 * VariantPriceCalculator не просто верно считает в изоляции (см.
 * VariantPriceCalculatorTest), а что его результат доезжает до
 * StorefrontVariantRequest в ПРАВИЛЬНЫЕ поля — не перепутанные местами,
 * priceSource/discountPct не потеряны на обратной записи.
 *
 * С 15.09 «правильные поля» значит другое, и это главное, что здесь проверяется.
 * Посчитанное больше НЕ едет в price/salePrice: те зеркалят колонки
 * products.price / products.sale_price, потому что applyVariant пишет именно
 * туда, а черновик сливается поверх опубликованного. Пока price отдавал
 * посчитанную цену площадки, публикация любой другой правки возвращала её в
 * колонку собственной цены владельца (ManualPriceRoundTripTest — сторож этого
 * свойства на полном круге). Посчитанное теперь в sourcePrice/shownPrice,
 * только на чтение.
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
        return row(productId, source, buyerKop, costKop, Instant.now());
    }

    private static MarketplacePrice row(String productId, String source, Long buyerKop, Long costKop, Instant checkedAt) {
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId(productId);
        row.setSource(source);
        row.setBuyerPriceKop(buyerKop);
        row.setCostPriceKop(costKop);
        row.setCheckedAt(checkedAt);
        row.setReceivedAt(Instant.now());
        return row;
    }

    @Test
    void publishedVariant_priceIsTheOwnColumn_andWhatTheBuyerPaysGoesToShownPrice() {
        Product v = variant("wb-1", "manual", 20, "100.01");

        StorefrontVariantRequest r = mapping.publishedVariant(v, MarketplacePriceLookup.empty());

        // Своя цена — как в колонке, без вычетов: её владелец правит, её же и
        // получит обратно при следующем сохранении.
        assertThat(r.price()).isEqualByComparingTo("100.01");
        // Посчитанное — отдельным полем. Перепутанные местами дали бы
        // price=80.00, и публикация записала бы скидку в колонку цены: ровно
        // тот класс ошибки, который «выглядит рабочим», пока никто не сверит числа.
        assertThat(r.shownPrice()).isEqualByComparingTo("80.00");
        assertThat(r.priceSource()).isEqualTo("manual");
        assertThat(r.discountPct()).isEqualTo(20);
        assertThat(r.manualPriceInactive()).isFalse();
        // Источника нет — и показывать под его подписью нечего.
        assertThat(r.sourcePrice()).isNull();
        assertThat(r.sourceCheckedAt()).isNull();
    }

    @Test
    void publishedVariant_ozonSource_ownPriceSurvivesInPrice_andMarketplaceGoesToSourcePrice() {
        Product v = variant("wb-1", "ozon", 0, "999.00");
        Instant checked = Instant.parse("2026-09-15T15:00:00Z");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(row("wb-1", "ozon", 500000L, null, checked)));

        StorefrontVariantRequest r = mapping.publishedVariant(v, prices);

        // ВОТ ЭТО УТВЕРЖДЕНИЕ И ЕСТЬ ПОЧИНКА. Раньше здесь оказывалось 5000 —
        // цена площадки в поле, которое applyVariant пишет в products.price.
        assertThat(r.price()).isEqualByComparingTo("999.00");
        assertThat(r.sourcePrice()).isEqualByComparingTo("5000.00");
        assertThat(r.shownPrice()).isEqualByComparingTo("5000.00");
        assertThat(r.sourceCheckedAt()).isEqualTo(checked);
        assertThat(r.sourceMissing()).isFalse();
        assertThat(r.manualPriceInactive()).isTrue();
    }

    @Test
    void publishedVariant_sourceMissing_leavesSourcePriceEmpty_ratherThanEchoingTheOwnPrice() {
        Product v = variant("wb-1", "ozon", 0, "999.00");

        StorefrontVariantRequest r = mapping.publishedVariant(v, MarketplacePriceLookup.empty());

        // Калькулятор в этом случае откатывается на свою цену — и правильно
        // делает, витрине надо что-то показать. Но под подписью «цена с Ozon»
        // владелец увидел бы своё же число и решил, что площадка её прислала.
        assertThat(r.sourcePrice()).isNull();
        assertThat(r.sourceCheckedAt()).isNull();
        assertThat(r.sourceMissing()).isTrue();
        assertThat(r.shownPrice()).isEqualByComparingTo("999.00");
        assertThat(r.price()).isEqualByComparingTo("999.00");
    }

    @Test
    void publishedVariant_thresholdApplied_shownPriceIsTheCost_notTheDiscount() {
        Product v = variant("wb-1", "manual", 90, "1000.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(row("wb-1", null, null, 50000L)));

        StorefrontVariantRequest r = mapping.publishedVariant(v, prices);

        // 90% от тысячи это сто рублей, порог поднимает до себестоимости.
        // Число, которое владелец не выведет на экране ни из своей цены, ни из
        // процента: ради него shownPrice и заведено.
        assertThat(r.thresholdApplied()).isTrue();
        assertThat(r.shownPrice()).isEqualByComparingTo("500.00");
        assertThat(r.price()).isEqualByComparingTo("1000.00");
    }

    @Test
    void себестоимостьВышеЦены_покупательПлатитЦену_аПубликацияТакогоНеПропустит() {
        Product v = variant("wb-1", "manual", 90, "1000.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(row("wb-1", null, null, 150000L)));

        StorefrontVariantRequest r = mapping.publishedVariant(v, prices);

        // Угол, в котором порог ВЫШЕ цены. Калькулятор не показывает «скидку»
        // дороже обычной цены (это его явное решение), и покупатель платит
        // тысячу при себестоимости полторы — то есть ниже себестоимости.
        //
        // Случай не гипотетический: так выглядит любой вариант, заведённый до
        // запрета с ценой ниже себестоимости. Закрыт он не здесь, а
        // BelowCostGuard: опубликовать такую карточку больше нельзя, и владелец
        // узнает об этом на первой же правке (см. PublishBelowCostTest).
        assertThat(r.thresholdApplied()).isTrue();
        assertThat(r.shownPrice()).isEqualByComparingTo("1000.00");
    }

    @Test
    void publishedVariant_salePriceMirrorsTheColumn_notTheComputedDiscount() {
        Product v = variant("wb-1", "manual", 20, "1000.00");
        v.setSalePrice(new BigDecimal("700.00"));

        StorefrontVariantRequest r = mapping.publishedVariant(v, MarketplacePriceLookup.empty());

        // Колонку sale_price с этапа 2 никто не читает, но зеркалим её честно:
        // поле, отдающее одно и пишущее другое, — это и есть разобранная беда,
        // просто на соседней колонке.
        assertThat(r.salePrice()).isEqualByComparingTo("700.00");
        assertThat(r.shownPrice()).isEqualByComparingTo("800.00");
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
    // экрана этапа 3), но посчитанные поля — read-only: DTO, пришедший как бы
    // «с сервера», не имеет способа записать их куда-либо на Product, потому
    // что у Product таких полей нет вовсе — applyVariant их не читает.
    @Test
    void applyVariant_writesPriceSourceAndDiscountPct_ontoTheEntity() {
        Product v = variant("wb-1", "manual", 0, "500.00");
        StorefrontVariantRequest r = new StorefrontVariantRequest(
                new BigDecimal("500.00"), null, "camel", "#b89a6e", "Кэмел", "Camel",
                "/i/camel.jpg", List.of(), 3, true, 0,
                "ozon", 35, true, true, true, true,
                new BigDecimal("42.00"), new BigDecimal("42.00"), Instant.parse("2026-09-15T15:00:00Z"));

        mapping.applyVariant(r, v);

        assertThat(v.getPriceSource()).isEqualTo("ozon");
        assertThat(v.getDiscountPct()).isEqualTo(35);
        // Цена площадки из ответа не имеет пути в колонку собственной цены.
        assertThat(v.getPrice()).isEqualByComparingTo("500.00");
    }

    @Test
    void published_model_computesEachVariantAgainstTheSameBatchLookup() {
        ProductModel m = new ProductModel();
        ReflectionTestUtils.setField(m, "id", UUID.randomUUID());
        m.setNameRu("Пальто"); m.setNameEn("Coat"); m.setCategory("outerwear");
        m.setDescRu("о"); m.setDescEn("d"); m.setCompositionRu("ш"); m.setCompositionEn("w");
        m.setCareRu("у"); m.setCareEn("c"); m.setSizes(new String[]{"S"}); m.setImage("/i/m.jpg");

        Product manual = variant("wb-1", "manual", 10, "1000.00");
        Product ozon = variant("wb-2", "ozon", 0, "1.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(row("wb-2", "ozon", 200000L, null)));

        Map<String, StorefrontVariantRequest> byId = mapping.published(m, List.of(manual, ozon), prices).variants();

        assertThat(byId.get("wb-1").shownPrice()).isEqualByComparingTo("900.00");
        assertThat(byId.get("wb-1").sourcePrice()).isNull();
        // Цена площадки досталась ровно тому варианту, для которого пришла, и
        // легла в поле площадки — а рубль своей цены остался своим.
        assertThat(byId.get("wb-2").sourcePrice()).isEqualByComparingTo("2000.00");
        assertThat(byId.get("wb-2").price()).isEqualByComparingTo("1.00");
        assertThat(byId.get("wb-2").sourceMissing()).isFalse();
    }
}
