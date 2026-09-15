package com.reinasleo.api.service.storefront;

import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.model.Product;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Приёмка этапа 2 (task-price-switch-brief.md), пункт за пунктом — 9 сценариев
 * из "Приёмка" брифа плюс два дополнительных (предзаказ без цены, и источник
 * себестоимости именно из строки source=NULL, а не с площадки). Каждый тест
 * называет число руками — если формула однажды сломается, тест покажет ЧТО
 * именно разъехалось, а не просто "не ноль/не совпало".
 */
class VariantPriceCalculatorTest {

    private final VariantPriceCalculator calculator = new VariantPriceCalculator();

    private static Product product(String priceSource, int discountPct, String price) {
        Product p = new Product();
        p.setId("wb-1");
        p.setPriceSource(priceSource);
        p.setDiscountPct(discountPct);
        p.setPrice(price == null ? null : new BigDecimal(price));
        return p;
    }

    private static MarketplacePrice row(String productId, String source, Long buyerKop, Long costKop) {
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId(productId);
        row.setSource(source);
        row.setBuyerPriceKop(buyerKop);
        row.setCostPriceKop(costKop);
        row.setCheckedAt(source == null ? null : Instant.parse("2026-09-14T18:00:00Z"));
        row.setReceivedAt(Instant.now());
        return row;
    }

    // 1. manual без скидки — цена как была, salePrice пуст.
    @Test
    void manualSourceWithoutDiscount_keepsPriceAndHasNoSale() {
        Product v = product("manual", 0, "1000.00");

        VariantPrice r = calculator.compute(v, MarketplacePriceLookup.empty());

        assertThat(r.basePrice()).isEqualByComparingTo("1000.00");
        assertThat(r.salePrice()).isNull();
        assertThat(r.sourceMissing()).isFalse();
        assertThat(r.manualPriceInactive()).isFalse();
    }

    // 2. manual со скидкой 20 — salePrice равен 80%, округление ВНИЗ. 100.01 не
    // делится ровно: 100.01 × 0.8 = 80.008, и только floor даёт 80.00 — любое
    // округление вверх (HALF_UP/CEILING) дало бы 80.01. Это ровно тот тест,
    // который краснеет в мутации "округление вниз → вверх" (см. отчёт).
    @Test
    void manualSourceWithTwentyPercentDiscount_roundsDown() {
        Product v = product("manual", 20, "100.01");

        VariantPrice r = calculator.compute(v, MarketplacePriceLookup.empty());

        assertThat(r.basePrice()).isEqualByComparingTo("100.01");
        assertThat(r.salePrice()).isEqualByComparingTo("80.00");
    }

    // 3. ozon со скидкой — основа берётся из таблицы, не из products.price.
    @Test
    void ozonSource_takesBaseFromMarketplaceTable_notFromProductsPrice() {
        Product v = product("ozon", 10, "999.00"); // "999.00" — приманка, не должна попасть в ответ
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(
                row("wb-1", "ozon", 500000L, null)));

        VariantPrice r = calculator.compute(v, prices);

        assertThat(r.basePrice()).isEqualByComparingTo("5000.00");
        assertThat(r.salePrice()).isEqualByComparingTo("4500.00");
        assertThat(r.sourceMissing()).isFalse();
        assertThat(r.manualPriceInactive()).isTrue();
    }

    // 3b. ozon, цена в таблице НОЛЬ — то же, что строки нет.
    //
    // Ozon кладёт "0.0000" в незаполненные поля цен. Без этого утверждения
    // ноль становится ценой: sourceMissing проверял бы null, а не величину.
    // Порог себестоимости не спасает — он поднимает цену со скидкой, а
    // salePrice при этом обнуляется (effective >= basePrice), и наружу уходит
    // основа, то есть ноль. Кейс красный, если правку в калькуляторе убрать.
    @Test
    void ozonSource_zeroPriceInTheTable_isTreatedAsMissing_notAsAFreeItem() {
        Product v = product("ozon", 15, "3000.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(
                row("wb-1", "ozon", 0L, 250000L)));

        VariantPrice r = calculator.compute(v, prices);

        assertThat(r.basePrice()).isEqualByComparingTo("3000.00");
        assertThat(r.basePrice()).isNotEqualByComparingTo("0.00");
        assertThat(r.sourceMissing()).isTrue();
    }

    // 4. ozon, строки в таблице нет — берётся ручная цена, флаг "источник не
    // получен" поднят, исключения нет.
    @Test
    void ozonSource_rowMissing_fallsBackToManualPriceAndRaisesFlag_withoutThrowing() {
        Product v = product("ozon", 15, "3000.00");

        assertThatCode(() -> calculator.compute(v, MarketplacePriceLookup.empty())).doesNotThrowAnyException();

        VariantPrice r = calculator.compute(v, MarketplacePriceLookup.empty());
        assertThat(r.basePrice()).isEqualByComparingTo("3000.00");
        assertThat(r.salePrice()).isEqualByComparingTo("2550.00");
        assertThat(r.sourceMissing()).isTrue();
        // При включённом переключателе ручная цена не должна считаться надёжной,
        // даже когда именно она сейчас и показывается (см. VariantPrice javadoc).
        assertThat(r.manualPriceInactive()).isTrue();
    }

    // 5. себестоимость неизвестна — порог НЕ применён, флаг поднят. Лежит рядом
    // строка ЭТОГО же товара с source='ozon', у которой формально заполнен
    // cost_price_kop — калькулятор обязан её ИГНОРИРОВАТЬ: по контракту приёмки
    // (MarketplacePriceItemRequest) себестоимость приходит только с source=NULL,
    // и подмешивание чужого cost_price_kop было бы вторым, необъявленным
    // значением себестоимости.
    @Test
    void costUnknown_thresholdNotApplied_ignoresCostOnASourcedRow() {
        Product v = product("manual", 50, "2000.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(
                row("wb-1", "ozon", 300000L, 100000L))); // costPriceKop здесь — не тот источник, что нужен

        VariantPrice r = calculator.compute(v, prices);

        assertThat(r.salePrice()).isEqualByComparingTo("1000.00"); // 2000 × 50% без клампа
        assertThat(r.costUnknown()).isTrue();
        assertThat(r.thresholdApplied()).isFalse();
    }

    // 6. порог сработал — итог равен себестоимости, флаг поднят, и это
    // отличимо от случая 5 (другие флаги, другое итоговое число).
    @Test
    void thresholdApplied_resultEqualsCost_distinguishableFromCostUnknown() {
        Product v = product("manual", 50, "2000.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(
                row("wb-1", null, null, 150000L))); // себестоимость 1500.00, source=NULL — как в контракте

        VariantPrice r = calculator.compute(v, prices);

        assertThat(r.salePrice()).isEqualByComparingTo("1500.00"); // не 1000.00, как было бы без порога
        assertThat(r.costUnknown()).isFalse();
        assertThat(r.thresholdApplied()).isTrue();
    }

    // 7. скидка 0 — salePrice пуст, а не равен price. Себестоимость ИЗВЕСТНА и
    // ниже основы (порог мог бы сработать, но не должен: 500 < 777), поэтому
    // тест доказывает null именно от "нечего показать", а не от отсутствия
    // данных о себестоимости вовсе (это уже случай 1/5).
    @Test
    void zeroDiscount_hasNoSalePrice_evenWithKnownLowerCost() {
        Product v = product("manual", 0, "777.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(
                row("wb-1", null, null, 50000L)));

        VariantPrice r = calculator.compute(v, prices);

        assertThat(r.basePrice()).isEqualByComparingTo("777.00");
        assertThat(r.salePrice()).isNull();
        assertThat(r.thresholdApplied()).isFalse();
    }

    // 8. После округления итог сравнялся с основой — salePrice пуст. Через
    // саму скидку это недостижимо при округлении ВНИЗ (base×(100−pct)/100 при
    // целом pct>0 и base>0 строго меньше base, и floor только уменьшает это
    // число дальше) — то есть единственный реалистичный путь к равенству это
    // порог: себестоимость, случайно равная основе ровно до копейки.
    // thresholdApplied здесь ИСТИНА (порог реально изменил число со скидкой на
    // себестоимость) — и одновременно salePrice пуст: это не противоречие, а
    // разные аудитории одного факта (см. VariantPrice javadoc).
    @Test
    void thresholdEqualsBaseAfterRounding_hasNoSalePrice() {
        Product v = product("manual", 30, "2000.00");
        MarketplacePriceLookup prices = MarketplacePriceLookup.from(List.of(
                row("wb-1", null, null, 200000L))); // себестоимость 2000.00 == основа

        VariantPrice r = calculator.compute(v, prices);

        assertThat(r.basePrice()).isEqualByComparingTo("2000.00");
        assertThat(r.thresholdApplied()).isTrue();
        assertThat(r.salePrice()).isNull();
    }

    // 9 (discount_pct вне 0..90) — Bean Validation, не калькулятор; см.
    // StorefrontVariantRequestValidationTest.

    // Товар без цены — законный предзаказ (AdminProductRequest), а не сбой:
    // считать скидку и порог не от чего, basePrice/salePrice оба null, без NPE.
    @Test
    void productWithoutAnyPrice_isAPreorder_computesNeitherPriceNorSale() {
        Product v = product("manual", 20, null);

        VariantPrice r = calculator.compute(v, MarketplacePriceLookup.empty());

        assertThat(r.basePrice()).isNull();
        assertThat(r.salePrice()).isNull();
        assertThat(r.sourceMissing()).isFalse();
    }
}
