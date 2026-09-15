package com.reinasleo.api.service;

import com.reinasleo.api.exception.BelowCostException;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import com.reinasleo.api.service.storefront.MarketplacePriceLookup;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Запрет записывать цену ниже себестоимости.
 *
 * Слово владельца 15.09.2026: продавать ниже себестоимости нельзя «ни руками,
 * ни автоматом». Автомат закрыт этапом 2 — VariantPriceCalculator урезает
 * скидку порогом себестоимости, и это утверждает его тест
 * thresholdApplied_resultEqualsCost. Здесь закрыта вторая половина: ручная
 * запись цены, у которой до сих пор не было ни одной проверки ни на одном из
 * двух путей (StorefrontMapping.applyVariant и AdminProductService.applyFields).
 *
 * ТРИ РЕШЕНИЯ, ПРИНЯТЫЕ ЯВНО, ЧТОБЫ СЛЕДУЮЩИЙ НЕ ГАДАЛ.
 *
 * 1. Проверяем ВСЕГДА, а не только при price_source=manual. Соблазн проверять
 *    один manual выглядит безобидным: при включённом источнике покупатель
 *    ручной цены не видит. Не видит СЕГОДНЯ. Ручная цена — запасная: когда
 *    источник пропал (sourceMissing), витрина откатывается именно на неё.
 *    Разрешить записать её ниже себестоимости значит заложить мину, которая
 *    сработает в день, когда аналитика не пришлёт пачку, и никто уже не вспомнит
 *    почему.
 *
 * 2. «Ниже» — СТРОГО меньше. Цена, равная себестоимости, проходит: продать по
 *    себестоимости — не продать ниже неё. Край назван явно, потому что молча
 *    его пришлось бы угадывать.
 *
 * 3. Где себестоимость неизвестна — запрета НЕТ. Иначе первый же товар без
 *    учётного числа стал бы нередактируемым, и владелец получил бы отказ там,
 *    где мы просто не знаем. На проде 15.09 себестоимость известна у всех 87
 *    активных, то есть эта ветка сегодня не срабатывает ни разу — но она есть.
 *
 * Себестоимость берётся ТЕМ ЖЕ способом, что у расчёта цены
 * (MarketplacePriceLookup: строка с source=NULL), а не своим запросом: два
 * способа узнать одно число однажды разойдутся, и разойдутся молча.
 */
@Component
public class BelowCostGuard {

    /**
     * Одна проверяемая цена.
     *
     * @param productId идентификатор варианта — по нему ищется себестоимость;
     * @param field     путь к полю в том же виде, в каком его отдаёт проверка
     *                  полей, чтобы витрина подсветила именно его;
     * @param price     цена, которую хотят записать, в рублях;
     * @param label     как назвать вещь владельцу — без этого в отказе по пачке
     *                  вариантов он не поймёт, какой именно поправить.
     */
    public record Candidate(String productId, String field, BigDecimal price, String label) {}

    private final MarketplacePriceRepository prices;

    public BelowCostGuard(MarketplacePriceRepository prices) {
        this.prices = prices;
    }

    /**
     * Бросает BelowCostException, если хоть одна цена ниже себестоимости.
     * В исключении перечислены ВСЕ нарушения, а не первое: владелец сохраняет
     * модель с несколькими цветами разом, и отказ по одному заставлял бы его
     * чинить их по очереди, узнавая о следующем только после новой попытки.
     */
    public void verify(List<Candidate> candidates) {
        if (candidates.isEmpty()) {
            return;
        }

        List<String> productIds = candidates.stream().map(Candidate::productId).distinct().toList();
        MarketplacePriceLookup lookup = MarketplacePriceLookup.from(prices.findByProductIdIn(productIds));

        List<BelowCostException.Violation> violations = new ArrayList<>();
        for (Candidate c : candidates) {
            if (c.price() == null) {
                // Цены нет вовсе — это предзаказ, а не продажа ниже
                // себестоимости. Отдельный случай, и расчёт цены трактует его
                // так же (productWithoutAnyPrice_isAPreorder).
                continue;
            }
            Long costKop = lookup.costPriceKop(c.productId());
            if (costKop == null) {
                continue; // решение 3
            }
            BigDecimal cost = BigDecimal.valueOf(costKop, 2);
            if (c.price().compareTo(cost) < 0) { // решение 2: строго меньше
                violations.add(new BelowCostException.Violation(c.field(), message(c, cost)));
            }
        }

        if (!violations.isEmpty()) {
            throw new BelowCostException(violations);
        }
    }

    /**
     * Текст с ОБОИМИ числами. «Нельзя ниже себестоимости» без них заставляет
     * гадать, на сколько подвинуть; с ними владелец поправит с первого раза.
     */
    private static String message(Candidate c, BigDecimal cost) {
        return "%s: цена %s ₽ ниже себестоимости %s ₽. Продавать ниже себестоимости нельзя."
                .formatted(c.label(), c.price().stripTrailingZeros().toPlainString(),
                        cost.stripTrailingZeros().toPlainString());
    }
}
