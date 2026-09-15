package com.reinasleo.api.service.storefront;

import com.reinasleo.api.model.Product;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Действующая цена варианта (этап 2, task-price-switch-brief.md). Порядок
 * ровно такой, каждый шаг — своя проверяемая величина:
 *
 *   основа      = price_source=manual ? products.price : цена покупателя источника
 *   со скидкой  = основа × (100 − discount_pct) / 100, округление ВНИЗ
 *   порог       = себестоимость, если известна
 *   итог        = max(со скидкой, порог)
 *
 * Три состояния различаются флагами в VariantPrice, а не сливаются в одно
 * "скидка не применилась": sourceMissing (переключатель на маркетплейс, а
 * цены для него нет — берём ручную цену как есть, молчать нельзя), costUnknown
 * (порог не применён ВООБЩЕ, а не "применён нулём") и thresholdApplied (итог —
 * это себестоимость, а не цена со скидкой). Один общий признак на все три
 * заставил бы владельца гадать, какая из причин перед ним, а действия у них
 * разные: на sourceMissing чинят приём цены, на costUnknown ждут первую
 * отправку себестоимости, на thresholdApplied — либо мельчат скидку, либо
 * признают, что порог и есть их цена сегодня.
 *
 * Округление вниз — к покупателю: "основа × (100 − pct) / 100" почти всегда
 * даёт дробную копейку, и округление вверх сделало бы обещанную скидку меньше
 * факта (владелец, поставивший 20%, получил бы 19,98 вместо честных 20%).
 *
 * salePrice = null, если после округления итог НЕ МЕНЬШЕ основы — это не
 * только случай discount_pct=0, но и общее правило: существующий контракт
 * "salePrice меньше price" (StorefrontVariantRequest.isSaleBelowPrice) не
 * ослабляется ни при каком сочетании входов, включая гипотетический порог
 * выше основы (себестоимость, заведённая ошибочно дороже отпускной цены, —
 * чужая ошибка данных, а не повод показать покупателю "скидку" дороже обычной
 * цены).
 */
@Component
public class VariantPriceCalculator {

    public static final String PRICE_SOURCE_MANUAL = "manual";

    public VariantPrice compute(Product variant, MarketplacePriceLookup prices) {
        String source = variant.getPriceSource();
        boolean manual = PRICE_SOURCE_MANUAL.equals(source);

        Long buyerPriceKop = manual ? null : prices.buyerPriceKop(variant.getId(), source);
        // НОЛЬ ОТ ПЛОЩАДКИ — ЭТО «ЦЕНЫ НЕТ», А НЕ «ЦЕНА НОЛЬ». Ozon кладёт
        // "0.0000" в незаполненные поля цен. Приём такую строку отвергает
        // (MarketplacePriceItemRequest), но проверка на границе защищает от
        // одного источника, а это утверждение — от любого, включая тот,
        // который заведут позже.
        //
        // Порог себестоимости здесь НЕ СПАСАЕТ, и это проверено построчно:
        // при основе 0 порог поднимает цену со скидкой до себестоимости, но
        // salePrice тут же обнуляется (effective >= basePrice, 2500 >= 0), и
        // наружу уходит basePrice = 0.00 без скидки. Покупатель видит 0 ₽
        // даже при известной себестоимости. Сторож стережёт скидку, а не
        // основу, и помочь тут не может по устройству.
        boolean sourceMissing = !manual && (buyerPriceKop == null || buyerPriceKop <= 0);

        // Источник пропал — откат на ручную цену, а не на null: решение
        // владельца, зафиксированное в брифе ("при пропавшем источнике держим
        // последнее известное и показываем"), а не молчаливая порча цены.
        BigDecimal basePrice = (manual || sourceMissing) ? variant.getPrice() : kopToRubles(buyerPriceKop);

        if (basePrice == null) {
            // Товар без цены — предзаказ (см. AdminProductRequest), а не сбой:
            // считать скидку и порог не от чего, но себестоимость всё равно
            // можно честно отметить известной или нет.
            boolean costUnknown = prices.costPriceKop(variant.getId()) == null;
            return new VariantPrice(null, null, sourceMissing, costUnknown, false, !manual);
        }

        BigDecimal discounted = basePrice
                .multiply(BigDecimal.valueOf(100 - variant.getDiscountPct()))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.FLOOR);

        Long costPriceKop = prices.costPriceKop(variant.getId());
        boolean costUnknown = costPriceKop == null;
        BigDecimal threshold = costUnknown ? null : kopToRubles(costPriceKop);

        boolean thresholdApplied = !costUnknown && threshold.compareTo(discounted) > 0;
        BigDecimal effective = thresholdApplied ? threshold : discounted;

        BigDecimal salePrice = effective.compareTo(basePrice) >= 0 ? null : effective;

        return new VariantPrice(basePrice, salePrice, sourceMissing, costUnknown, thresholdApplied, !manual);
    }

    private static BigDecimal kopToRubles(long kop) {
        return BigDecimal.valueOf(kop, 2);
    }
}
