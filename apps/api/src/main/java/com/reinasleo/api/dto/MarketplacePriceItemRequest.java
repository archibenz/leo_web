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
// цене, выставленной руками.
//
// source и checkedAt ездят ПАРОЙ: оба есть или обоих нет. Пара означает «мы
// спрашивали площадку», и относится она к площадке, а не к нашему учёту.
// source в одиночку приписывал бы маркетплейс тому, что пришло из
// бухгалтерии; checkedAt в одиночку утверждал бы опрос, которого не было.
//
// ПАРА БЕЗ ЦЕНЫ ПОКУПАТЕЛЯ — ЗАКОННАЯ СТРОКА, и она означает «спросили,
// ответ негодный». Раньше это было запрещено, и запрет оставлял договор без
// слова для третьего состояния: сказать «вот цена» он умел, сказать «цены
// никогда не было» умел молчанием, а сказать «была, и больше не знаем» —
// нечем. 15.09.2026 это перестало быть теоретическим: отправитель научился
// не публиковать цену, разошедшуюся с деньгами покупателей, и его молчание
// в прежнем договоре означало «оставь как было» — то есть консервировало
// неверные 20 000 ₽ вместо 10 270 ₽ вместе с ЧУЖОЙ строкой по соседству
// (ключ уникальности `(product_id, coalesce(source,''))` разводит строку с
// источником и строку без него). Теперь такая строка обнуляет цену в своей
// же строке, а себестоимость оставляет: она из нашего учёта и к площадке
// отношения не имеет.
//
// buyerPriceKop без пары по-прежнему запрещён: цена площадки без указания
// площадки и без отметки опроса — это цифра без происхождения.
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
    @AssertTrue(message = "source and checkedAt must be present together, or both absent")
    public boolean isPlatformPairTravelsTogether() {
        return (source != null) == (checkedAt != null);
    }

    @JsonIgnore
    @AssertTrue(message = "buyerPriceKop requires source and checkedAt")
    public boolean isBuyerPriceCarriesPlatformPair() {
        return buyerPriceKop == null || source != null;
    }
}
