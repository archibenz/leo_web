package com.reinasleo.api.service.storefront;

import java.math.BigDecimal;

/**
 * Итог VariantPriceCalculator (этап 2, task-price-switch-brief.md).
 *
 * basePrice  — основа: products.price при price_source=manual (и при
 *              sourceMissing — см. ниже), иначе цена покупателя источника.
 * salePrice  — действующая цена со скидкой/порогом, либо null, если продавать
 *              "со скидкой" нечего (discount_pct=0, либо после округления
 *              итог не меньше основы). Публичной витрине идёт ровно эта пара
 *              (basePrice → price, salePrice → sale) и БОЛЬШЕ НИЧЕГО отсюда —
 *              флаги ниже только для админки.
 *
 * sourceMissing        — переключатель на маркетплейс, а строки/цены для
 *                         него в marketplace_prices нет; basePrice в этом
 *                         случае — откат на ручную цену, а не null.
 * costUnknown          — себестоимость не найдена (нет строки с source=NULL
 *                         или в ней нет cost_price_kop); порог не применялся.
 * thresholdApplied     — порог СРАБОТАЛ: итог — это себестоимость, а не цена
 *                         со скидкой. Не путать с costUnknown — это разные
 *                         причины одного и того же "скидка не та, что
 *                         ожидалась", и действия у них разные (см. бриф).
 * manualPriceInactive  — products.price сейчас не управляет тем, что видит
 *                         покупатель (price_source ≠ manual). Верно и во
 *                         время sourceMissing: ручная цена в этот момент
 *                         фактически показывается, но лишь как временный
 *                         откат, а не потому что переключатель стоит на
 *                         manual — редактировать её admin всё равно не
 *                         должен считать надёжным способом повлиять на цену.
 */
public record VariantPrice(
        BigDecimal basePrice,
        BigDecimal salePrice,
        boolean sourceMissing,
        boolean costUnknown,
        boolean thresholdApplied,
        boolean manualPriceInactive
) {}
