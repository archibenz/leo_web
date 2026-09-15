package com.reinasleo.api.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;

// Одна строка пачки цен с маркетплейса. Договор согласован с аналитикой и
// строится под него параллельно — поля и правила не меняем по вкусу, см.
// /Users/archi/Documents/work/leo_web/.superpowers/sdd/stage2/task-price-intake-brief.md.
//
// buyerPriceKop/costPriceKop оба необязательные по отдельности, но хотя бы
// одно обязано быть: у 55 из 87 вариантов нет озоновской пары, а
// себестоимость нужна по всем — порог по себестоимости обязан работать и на
// цене, выставленной руками. source и checkedAt оба обязательны РОВНО когда
// есть buyerPriceKop — симметрично и по одной причине: себестоимость и факт
// её опроса относятся к площадке, а не к нашему учёту. source без цены
// покупателя приписывал бы маркетплейс тому, что пришло из бухгалтерии;
// checkedAt без цены покупателя утверждал бы, что площадку спрашивали, хотя
// её не спрашивали вовсе. Обе пары — уже мусор, а не законный пропуск.
public record MarketplacePriceItemRequest(
        @NotBlank(message = "productId is required")
        String productId,

        @Pattern(regexp = "^(ozon|wildberries)$", message = "unknown source")
        String source,

        Long buyerPriceKop,

        Long costPriceKop,

        // Момент, когда МЫ спросили площадку — у отправителя нет отметки
        // времени от самой площадки. Не момент отправки пачки: застывший
        // источник не должен выглядеть свежим только потому, что запрос
        // пришёл только что.
        Instant checkedAt
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

    @JsonIgnore
    @AssertTrue(message = "checkedAt is required when buyerPriceKop is present, and must be absent otherwise")
    public boolean isCheckedAtPresenceMatchesBuyerPrice() {
        return (checkedAt != null) == (buyerPriceKop != null);
    }
}
