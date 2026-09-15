package com.reinasleo.api.service;

import com.reinasleo.api.exception.BelowCostException;
import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Запрет продавать ниже себестоимости — ручная половина. Слово владельца
 * 15.09.2026: «ни руками, ни автоматом». Автоматическую половину утверждает
 * VariantPriceCalculatorTest.thresholdApplied_resultEqualsCost — там порог
 * урезает скидку и результат равен себестоимости, а не ниже.
 *
 * Каждое число названо руками: если правило однажды сдвинется, тест покажет
 * КУДА, а не просто «не сошлось».
 */
class BelowCostGuardTest {

    private final MarketplacePriceRepository prices = Mockito.mock(MarketplacePriceRepository.class);
    private final BelowCostGuard guard = new BelowCostGuard(prices);

    /** Строка себестоимости — та самая, с source=NULL, как требует контракт V35. */
    private static MarketplacePrice cost(String productId, long costKop) {
        MarketplacePrice row = new MarketplacePrice();
        row.setProductId(productId);
        row.setSource(null);
        row.setCostPriceKop(costKop);
        row.setCheckedAt(Instant.now());
        return row;
    }

    private void costsInBase(MarketplacePrice... rows) {
        Mockito.when(prices.findByProductIdIn(Mockito.<Collection<String>>any())).thenReturn(List.of(rows));
    }

    private static BelowCostGuard.Candidate candidate(String productId, String price) {
        return new BelowCostGuard.Candidate(productId, "price", new BigDecimal(price), "Платье «Лея», песок");
    }

    @Test
    void ценаНижеСебестоимости_отказ_иВтекстеОбаЧисла() {
        costsInBase(cost("wb-1", 250000L)); // себестоимость 2500.00

        assertThatThrownBy(() -> guard.verify(List.of(candidate("wb-1", "2250.00"))))
                .isInstanceOf(BelowCostException.class)
                .satisfies(e -> {
                    var violations = ((BelowCostException) e).getViolations();
                    assertThat(violations).hasSize(1);
                    // Оба числа обязаны быть в тексте: без них владелец не
                    // знает, на сколько подвинуть, и правит наугад.
                    assertThat(violations.get(0).message())
                            .contains("2250")
                            .contains("2500");
                    assertThat(violations.get(0).field()).isEqualTo("price");
                });
    }

    @Test
    void ценаРовноПоСебестоимости_проходит() {
        costsInBase(cost("wb-1", 250000L));

        // Край назван явно: продать ПО себестоимости — не продать НИЖЕ неё.
        assertThatCode(() -> guard.verify(List.of(candidate("wb-1", "2500.00"))))
                .doesNotThrowAnyException();
    }

    @Test
    void ценаНаКопейкуНижеСебестоимости_отказ() {
        costsInBase(cost("wb-1", 250000L));

        // Соседний с предыдущим случай. Без него «строго меньше» и «меньше или
        // равно» неотличимы: оба пропустили бы ровную цену.
        assertThatThrownBy(() -> guard.verify(List.of(candidate("wb-1", "2499.99"))))
                .isInstanceOf(BelowCostException.class);
    }

    @Test
    void ценаВышеСебестоимости_проходит() {
        costsInBase(cost("wb-1", 250000L));

        assertThatCode(() -> guard.verify(List.of(candidate("wb-1", "7500.00"))))
                .doesNotThrowAnyException();
    }

    @Test
    void себестоимостьНеизвестна_запретаНет() {
        costsInBase(); // строки нет вовсе

        // Решение 3: где числа не знаем — не запрещаем. Иначе товар без учётной
        // себестоимости стал бы нередактируемым.
        assertThatCode(() -> guard.verify(List.of(candidate("wb-1", "1.00"))))
                .doesNotThrowAnyException();
    }

    @Test
    void строкаЕстьНоБезСебестоимости_запретаНет() {
        MarketplacePrice row = cost("wb-1", 250000L);
        row.setCostPriceKop(null);
        costsInBase(row);

        // Отличается от предыдущего: строка ПРИШЛА, но числа в ней нет.
        // Различать важно — «аналитика молчит» и «аналитика прислала пустое»
        // это разные беды, и лечатся они по-разному.
        assertThatCode(() -> guard.verify(List.of(candidate("wb-1", "1.00"))))
                .doesNotThrowAnyException();
    }

    @Test
    void ценыНетВовсе_этоПредзаказ_аНеПродажаНижеСебестоимости() {
        costsInBase(cost("wb-1", 250000L));

        var предзаказ = new BelowCostGuard.Candidate("wb-1", "price", null, "Пальто «Ноэль»");
        assertThatCode(() -> guard.verify(List.of(предзаказ))).doesNotThrowAnyException();
    }

    @Test
    void несколькоНарушений_перечисленыВСЕ_аНеПервое() {
        costsInBase(cost("wb-1", 250000L), cost("wb-2", 180000L), cost("wb-3", 90000L));

        var candidates = List.of(
                new BelowCostGuard.Candidate("wb-1", "variants[wb-1].price", new BigDecimal("2000.00"), "песок"),
                new BelowCostGuard.Candidate("wb-2", "variants[wb-2].price", new BigDecimal("9999.00"), "графит"),
                new BelowCostGuard.Candidate("wb-3", "variants[wb-3].price", new BigDecimal("500.00"), "молоко"));

        assertThatThrownBy(() -> guard.verify(candidates))
                .isInstanceOf(BelowCostException.class)
                .satisfies(e -> {
                    var violations = ((BelowCostException) e).getViolations();
                    // Владелец сохраняет модель со всеми цветами разом. Отказ по
                    // первому заставил бы его чинить их по очереди, узнавая о
                    // следующем только после новой попытки.
                    assertThat(violations).hasSize(2);
                    assertThat(violations).extracting(BelowCostException.Violation::field)
                            .containsExactlyInAnyOrder("variants[wb-1].price", "variants[wb-3].price");
                    // Тот, что выше себестоимости, в список НЕ попал.
                    assertThat(violations).extracting(BelowCostException.Violation::field)
                            .doesNotContain("variants[wb-2].price");
                });
    }

    @Test
    void пустойСписок_вБазуНеХодит() {
        guard.verify(List.of());

        // Не оптимизация: сохранение без цен (только тексты) не должно
        // дёргать таблицу цен вообще.
        Mockito.verify(prices, Mockito.never()).findByProductIdIn(Mockito.any());
    }
}
