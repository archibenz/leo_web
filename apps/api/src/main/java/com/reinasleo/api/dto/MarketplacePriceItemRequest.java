package com.reinasleo.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;

// Одна строка пачки цен с маркетплейса. Договор согласован с аналитикой и
// строится под него параллельно — поля и правила не меняем по вкусу, см.
// /Users/archi/Documents/work/leo_web/.superpowers/sdd/stage2/task-price-intake-brief.md.
//
// buyerPriceKop/costPriceKop оба необязательные по отдельности, но хотя бы
// одно обязано быть: у 55 из 87 вариантов нет озоновской пары, а
// себестоимость нужна по всем — порог по себестоимости обязан работать и на
// цене, выставленной руками. source обязателен РОВНО когда есть
// buyerPriceKop: себестоимость приходит из нашего учёта, а не с площадки, и
// приписывать ей маркетплейс значило бы врать подписью; а голый source без
// цены покупателя — сирота, которому нечего описывать.
public record MarketplacePriceItemRequest(
        @NotBlank(message = "productId is required")
        String productId,

        @Pattern(regexp = "^(ozon|wildberries)$", message = "unknown source")
        String source,

        Long buyerPriceKop,

        Long costPriceKop,

        // Момент наблюдения на площадке, не момент отправки пачки — застывший
        // источник не должен выглядеть свежим только потому, что запрос
        // пришёл только что. Обязателен: без него значение не с чем сверять.
        @NotNull(message = "capturedAt is required")
        Instant capturedAt
) {

    @JsonIgnore
    @AssertTrue(message = "at least one of buyerPriceKop or costPriceKop is required")
    public boolean isAtLeastOnePricePresent() {
        return buyerPriceKop != null || costPriceKop != null;
    }

    @JsonIgnore
    @AssertTrue(message = "source is required when buyerPriceKop is present, and must be absent otherwise")
    public boolean isSourcePresenceMatchesBuyerPrice() {
        return (source != null) == (buyerPriceKop != null);
    }
}
